/* ==========================================================================
   数据层 DB
   - 统一本地存储（localStorage），带版本号与迁移
   - 预留 SyncAdapter 接口，后续接入云端同步只需实现 push/pull
   ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'my_workbench_v1';
  var SCHEMA_VERSION = 1;

  /* ---------- 默认数据结构：新增模块只需在这里加一个 key ---------- */
  function defaultState() {
    return {
      _meta: {
        version: SCHEMA_VERSION,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deviceId: 'dev_' + Math.random().toString(36).slice(2, 10)
      },
      // 个人资料 / 偏好
      settings: {
        nickName: '我',
        theme: 'indigo',
        weekStart: 1,           // 1=周一
        syncEnabled: false,     // 预留：云同步开关
        syncEndpoint: '',       // 预留：云同步地址
        syncToken: ''           // 预留：云同步令牌
      },
      // 待办清单
      todos: [],
      // 日程 / 计划
      events: [],
      // 习惯打卡
      habits: [],
      // 记账
      ledger: [],
      // 笔记与灵感
      notes: [],
      // 工作看板（任务卡片，按状态分列）
      board: [],
      // 健康记录（体重/睡眠/运动）
      health: [],
      // 目标 / 年度计划
      goals: [],
      // 预留：自定义模块数据容器
      custom: {}
    };
  }

  /* ---------- 存储引擎 ---------- */
  var state = null;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { state = defaultState(); save(); return state; }
      var parsed = JSON.parse(raw);
      state = migrate(parsed);
    } catch (e) {
      console.warn('数据读取失败，使用默认数据', e);
      state = defaultState();
    }
    return state;
  }

  function migrate(data) {
    var base = defaultState();
    // 浅合并，保证新增字段不丢失
    var merged = Object.assign({}, base, data);
    merged._meta = Object.assign({}, base._meta, data._meta || {});
    merged.settings = Object.assign({}, base.settings, data.settings || {});
    merged._meta.version = SCHEMA_VERSION;
    return merged;
  }

  function save() {
    if (!state) return;
    state._meta.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('保存失败（可能超出容量）', e);
    }
    notify();
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(state); } catch (e) {} });
  }

  /* ---------- 对外 API ---------- */
  var DB = {
    init: function () { return load(); },
    get: function () { if (!state) load(); return state; },
    /** 读取某集合 */
    list: function (key) { var s = DB.get(); return s[key] || []; },
    /** 新增一条 */
    add: function (key, item) {
      var s = DB.get();
      if (!s[key]) s[key] = [];
      item.id = item.id || (key + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
      item.createdAt = item.createdAt || Date.now();
      item.updatedAt = Date.now();
      s[key].unshift(item);
      save();
      return item;
    },
    /** 更新一条 */
    update: function (key, id, patch) {
      var s = DB.get();
      var arr = s[key] || [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          Object.assign(arr[i], patch);
          arr[i].updatedAt = Date.now();
          break;
        }
      }
      save();
      return arr;
    },
    /** 删除一条 */
    remove: function (key, id) {
      var s = DB.get();
      s[key] = (s[key] || []).filter(function (x) { return x.id !== id; });
      save();
      return s[key];
    },
    /** 直接写入整个集合 */
    setList: function (key, arr) {
      var s = DB.get();
      s[key] = arr || [];
      save();
      return s[key];
    },
    /** 设置项 */
    setSetting: function (k, v) {
      var s = DB.get();
      s.settings[k] = v;
      save();
    },
    /** 订阅变更 */
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },
    /** 重置全部数据 */
    reset: function () {
      state = defaultState();
      save();
      return state;
    },
    /** 导出 JSON 备份 */
    exportJSON: function () {
      return JSON.stringify(DB.get(), null, 2);
    },
    /** 导入 JSON 备份 */
    importJSON: function (text) {
      var data = JSON.parse(text);
      state = migrate(data);
      save();
      return state;
    },
    /* ================= 云同步接口（预留） =================
       后续接入后端时，只需实现 SyncAdapter 并调用 DB.setSyncAdapter()
       SyncAdapter 需实现：
         push(payload) -> Promise
         pull()        -> Promise<state>
    ===================================================== */
    _syncAdapter: null,
    setSyncAdapter: function (adapter) { DB._syncAdapter = adapter; },
    syncNow: function () {
      if (!DB._syncAdapter) return Promise.reject(new Error('未配置同步适配器'));
      var payload = { data: DB.get(), updatedAt: DB.get()._meta.updatedAt };
      return DB._syncAdapter.push(payload).then(function () {
        return DB._syncAdapter.pull();
      }).then(function (remote) {
        if (remote && remote.data) { state = migrate(remote.data); save(); }
        return state;
      });
    }
  };

  global.DB = DB;
})(window);

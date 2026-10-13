/* 小小怪食堂 · 本地数据层 + 后端接口 */
(function (global) {
  'use strict';
  var KEY = 'xiaoxiaoguai_canteen_v1';

  function defaultState() {
    return {
      settings: { apiBase: '', nickName: '小小怪食堂' },
      categories: [
        { id: 'cat_hunan', name: '湘菜', icon: '🌶️', desc: '香辣鲜香' },
        { id: 'cat_yue', name: '粤菜', icon: '🍲', desc: '清淡鲜美' },
        { id: 'cat_sichuan', name: '川菜', icon: '🥘', desc: '麻辣过瘾' },
        { id: 'cat_sweet', name: '甜品', icon: '🍰', desc: '甜甜治愈' },
        { id: 'cat_west', name: '西餐', icon: '🍝', desc: '异国风味' }
      ],
      dishes: [
        { id: 'd1', catId: 'cat_sichuan', name: '麻婆豆腐', spice: '麻辣', ingredients: '豆腐、牛肉末、豆瓣酱', ingredientPrice: 8, price: 22, method: '豆腐焯水，炒香肉末与豆瓣酱，下豆腐烧入味，勾芡撒花椒面。', image: '' },
        { id: 'd2', catId: 'cat_hunan', name: '剁椒鱼头', spice: '中辣', ingredients: '鱼头、剁椒、蒜', ingredientPrice: 25, price: 58, method: '鱼头剖开铺剁椒，蒸8分钟，淋热油。', image: '' },
        { id: 'd3', catId: 'cat_yue', name: '白切鸡', spice: '不辣', ingredients: '三黄鸡、姜葱', ingredientPrice: 20, price: 48, method: '整鸡浸熟过冰水，斩件配姜葱蘸料。', image: '' },
        { id: 'd4', catId: 'cat_sweet', name: '提拉米苏', spice: '不辣', ingredients: '马斯卡彭、手指饼、咖啡', ingredientPrice: 15, price: 28, method: '一层饼干一层奶酪糊，冷藏4小时筛可可粉。', image: '' },
        { id: 'd5', catId: 'cat_west', name: '黑椒牛排', spice: '微辣', ingredients: '牛排、黑椒酱', ingredientPrice: 35, price: 78, method: '牛排煎至两面焦香，静置后切片淋黑椒汁。', image: '' }
      ]
    };
  }

  var state = null;
  var listeners = [];
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { state = defaultState(); save(); return; }
      var p = JSON.parse(raw);
      state = Object.assign(defaultState(), p);
      if (!state.settings) state.settings = defaultState().settings;
    } catch (e) { state = defaultState(); }
  }
  function save() {
    if (!state) return;
    localStorage.setItem(KEY, JSON.stringify(state));
    notify();
  }
  function notify() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }

  function apiBase() {
    var b = (state && state.settings.apiBase) || '';
    if (b && !b.endsWith('/')) b += '/';
    return b; // 空 = 同源
  }

  var DB = {
    init: function () { load(); return state; },
    get: function () { if (!state) load(); return state; },
    cats: function () { return DB.get().categories; },
    dishesOf: function (catId) { return DB.get().dishes.filter(function (d) { return d.catId === catId; }); },
    dish: function (id) { return DB.get().dishes.filter(function (d) { return d.id === id; })[0]; },
    cat: function (id) { return DB.get().categories.filter(function (c) { return c.id === id; })[0]; },

    addCat: function (o) {
      o.id = 'cat_' + Date.now() + Math.random().toString(36).slice(2, 5);
      state.categories.push(o); save(); return o;
    },
    addDish: function (o) {
      o.id = 'd_' + Date.now() + Math.random().toString(36).slice(2, 6);
      state.dishes.push(o); save(); return o;
    },
    updateDish: function (id, patch) {
      state.dishes = state.dishes.map(function (d) { return d.id === id ? Object.assign({}, d, patch) : d; });
      save();
    },
    updateCat: function (id, patch) {
      state.categories = state.categories.map(function (c) { return c.id === id ? Object.assign({}, c, patch) : c; });
      save();
    },
    removeDish: function (id) { state.dishes = state.dishes.filter(function (d) { return d.id !== id; }); save(); },
    removeCat: function (id) {
      state.categories = state.categories.filter(function (c) { return c.id !== id; });
      state.dishes = state.dishes.filter(function (d) { return d.catId !== id; });
      save();
    },
    setSetting: function (k, v) { state.settings[k] = v; save(); },

    /* ---- 后端订单接口 ---- */
    submitOrder: function (order) {
      return fetch(apiBase() + 'api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order)
      }).then(function (r) { if (!r.ok) throw new Error('提交失败'); return r.json(); });
    },
    fetchOrders: function (since) {
      var url = apiBase() + 'api/orders' + (since ? ('?since=' + since) : '');
      return fetch(url).then(function (r) { if (!r.ok) throw new Error('拉取失败'); return r.json(); })
        .then(function (d) { return d.orders || []; });
    },
    updateOrderStatus: function (id, status) {
      return fetch(apiBase() + 'api/orders/' + id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status })
      }).then(function (r) { if (!r.ok) throw new Error('更新失败'); return r.json(); });
    },

    /* 购物车：存本地草稿 */
    _cart: [],
    cart: function () { return DB._cart; },
    cartAdd: function (item) {
      var ex = DB._cart.filter(function (x) { return x.dishId === item.dishId && x.spice === item.spice; })[0];
      if (ex) ex.qty += item.qty; else DB._cart.push(item);
      notify();
    },
    cartUpdateQty: function (dishId, spice, qty) {
      DB._cart = DB._cart.map(function (x) {
        if (x.dishId === dishId && x.spice === spice) x.qty = qty; return x;
      }).filter(function (x) { return x.qty > 0; });
      notify();
    },
    cartRemove: function (dishId, spice) {
      DB._cart = DB._cart.filter(function (x) { return !(x.dishId === dishId && x.spice === spice); });
      notify();
    },
    cartClear: function () { DB._cart = []; notify(); },

    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    exportJSON: function () { return JSON.stringify(DB.get(), null, 2); },
    importJSON: function (txt) { state = Object.assign(defaultState(), JSON.parse(txt)); save(); },
    reset: function () { state = defaultState(); DB._cart = []; save(); }
  };

  global.CDB = DB;
})(window);

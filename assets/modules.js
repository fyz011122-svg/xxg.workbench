/* ==========================================================================
   模块注册表 MODULES
   --------------------------------------------------------------------
   新增一个分区只需在数组里加一个对象即可，无需改其它文件：
   {
     id: 'xxx',            // 唯一标识，同时对应 DB 里的集合名
     name: '分区名',
     icon: '★',            // 底部导航图标
     desc: '一句话说明',
     type: 'list' | 'board' | 'checkin' | 'ledger' | 'dashboard',
     fields: [...],        // 表单字段定义
     columns: [...]        // board 类型的列
   }
   ========================================================================== */
(function (global) {
  'use strict';

  /* 字段类型：text / textarea / number / date / time / select / tags */
  var MODULES = [
    /* ---------------- 概览 ---------------- */
    {
      id: 'dashboard',
      name: '概览',
      icon: '◈',
      desc: '今日一览',
      type: 'dashboard',
      system: true
    },

    /* ---------------- 待办 ---------------- */
    {
      id: 'todos',
      name: '待办',
      icon: '✓',
      desc: '任务清单',
      type: 'list',
      hasDone: true,
      fields: [
        { key: 'title', label: '待办事项', type: 'text', required: true, placeholder: '要做什么？' },
        { key: 'due', label: '截止日期', type: 'date' },
        { key: 'priority', label: '优先级', type: 'select', options: ['高', '中', '低'], default: '中' },
        { key: 'tag', label: '分类', type: 'text', placeholder: '如：工作 / 生活' },
        { key: 'note', label: '备注', type: 'textarea' }
      ]
    },

    /* ---------------- 日程 ---------------- */
    {
      id: 'events',
      name: '日程',
      icon: '▤',
      desc: '安排与计划',
      type: 'list',
      fields: [
        { key: 'title', label: '日程标题', type: 'text', required: true, placeholder: '安排什么？' },
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'time', label: '时间', type: 'time' },
        { key: 'location', label: '地点', type: 'text' },
        { key: 'note', label: '备注', type: 'textarea' }
      ]
    },

    /* ---------------- 习惯打卡 ---------------- */
    {
      id: 'habits',
      name: '习惯',
      icon: '◎',
      desc: '每日打卡',
      type: 'checkin',
      fields: [
        { key: 'title', label: '习惯名称', type: 'text', required: true, placeholder: '如：早起 / 跑步 / 阅读' },
        { key: 'target', label: '每周目标次数', type: 'number', default: 7 },
        { key: 'color', label: '颜色', type: 'select', options: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'], default: '#6366f1' }
      ]
    },

    /* ---------------- 记账 ---------------- */
    {
      id: 'ledger',
      name: '记账',
      icon: '¥',
      desc: '收支记录',
      type: 'ledger',
      fields: [
        { key: 'title', label: '项目', type: 'text', required: true, placeholder: '如：午餐 / 工资' },
        { key: 'amount', label: '金额', type: 'number', required: true, placeholder: '0.00' },
        { key: 'kind', label: '类型', type: 'select', options: ['支出', '收入'], default: '支出' },
        { key: 'category', label: '分类', type: 'text', placeholder: '如：餐饮 / 交通' },
        { key: 'date', label: '日期', type: 'date', required: true }
      ]
    },

    /* ---------------- 工作看板 ---------------- */
    {
      id: 'board',
      name: '看板',
      icon: '▦',
      desc: '任务流转',
      type: 'board',
      columns: ['待办', '进行中', '已完成'],
      fields: [
        { key: 'title', label: '任务', type: 'text', required: true, placeholder: '任务名称' },
        { key: 'status', label: '状态', type: 'select', options: ['待办', '进行中', '已完成'], default: '待办' },
        { key: 'owner', label: '负责人', type: 'text' },
        { key: 'due', label: '截止', type: 'date' },
        { key: 'note', label: '说明', type: 'textarea' }
      ]
    },

    /* ---------------- 笔记灵感 ---------------- */
    {
      id: 'notes',
      name: '笔记',
      icon: '✐',
      desc: '记录与灵感',
      type: 'list',
      fields: [
        { key: 'title', label: '标题', type: 'text', required: true },
        { key: 'content', label: '内容', type: 'textarea', placeholder: '随手记点什么…' },
        { key: 'tag', label: '标签', type: 'text' }
      ]
    },

    /* ---------------- 健康 ---------------- */
    {
      id: 'health',
      name: '健康',
      icon: '♥',
      desc: '身体数据',
      type: 'list',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'weight', label: '体重(kg)', type: 'number' },
        { key: 'sleep', label: '睡眠(小时)', type: 'number' },
        { key: 'sport', label: '运动(分钟)', type: 'number' },
        { key: 'mood', label: '心情', type: 'select', options: ['很好', '不错', '一般', '较差'] },
        { key: 'note', label: '备注', type: 'textarea' }
      ]
    },

    /* ---------------- 目标 ---------------- */
    {
      id: 'goals',
      name: '目标',
      icon: '◆',
      desc: '长期目标',
      type: 'list',
      fields: [
        { key: 'title', label: '目标', type: 'text', required: true, placeholder: '想达成什么？' },
        { key: 'progress', label: '进度(%)', type: 'number', default: 0 },
        { key: 'deadline', label: '截止', type: 'date' },
        { key: 'category', label: '类别', type: 'select', options: ['事业', '学习', '健康', '财务', '生活', '其他'], default: '其他' },
        { key: 'note', label: '拆解 / 说明', type: 'textarea' }
      ]
    },

    /* ---------------- 食堂订单（来自「小小怪食堂」点菜端） ---------------- */
    {
      id: 'orders',
      name: '食堂订单',
      icon: '🍱',
      desc: '接收点餐订单',
      type: 'orders',
      system: true
    }

    /* ============ 在这里继续添加你的新分区 ============
    , {
      id: 'xxx', name: '新分区', icon: '＋', desc: '', type: 'list',
      fields: [ { key:'title', label:'标题', type:'text', required:true } ]
    }
    ================================================= */
  ];

  global.MODULES = MODULES;
})(window);

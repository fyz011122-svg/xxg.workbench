/* ==========================================================================
   应用主逻辑 app.js
   ========================================================================== */
(function () {
  'use strict';

  var state = DB.init();
  var currentModule = 'dashboard';
  var editMode = false;
  var el = {
    title: document.getElementById('pageTitle'),
    sub: document.getElementById('pageSub'),
    brandLogo: document.getElementById('brandLogo'),
    root: document.getElementById('viewRoot'),
    tabbar: document.getElementById('tabbar'),
    fab: document.getElementById('fab'),
    sheetMask: document.getElementById('sheetMask'),
    sheet: document.getElementById('sheet'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetBody: document.getElementById('sheetBody'),
    sheetClose: document.getElementById('sheetClose'),
    btnMenu: document.getElementById('btnMenu'),
    btnEditMode: document.getElementById('btnEditMode'),
    toast: document.getElementById('toast')
  };

  /* ---------------- 工具函数 ---------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(s) {
    if (!s) return '';
    var p = s.split('-');
    if (p.length < 3) return s;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    var diff = Math.round((d - new Date(today())) / 86400000);
    var tag = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === -1 ? '昨天' : (diff > 1 && diff < 7 ? diff + '天后' : '');
    return p[1] + '月' + p[2] + '日 周' + w + (tag ? ' · ' + tag : '');
  }
  function getModule(id) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i];
    return MODULES[0];
  }
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.add('hidden'); }, 1800);
  }

  /* ---------------- 底部导航 ---------------- */
  function renderTabbar() {
    var items = MODULES.slice(0, 5);
    el.tabbar.innerHTML = items.map(function (m) {
      return '<button class="tab' + (m.id === currentModule ? ' active' : '') + '" data-go="' + m.id + '">' +
        '<span class="tab-ico">' + m.icon + '</span><span class="tab-txt">' + m.name + '</span></button>';
    }).join('') +
    '<button class="tab' + (currentModule === '__more' ? ' active' : '') + '" data-go="__more">' +
    '<span class="tab-ico">⋯</span><span class="tab-txt">更多</span></button>';
  }

  /* ---------------- 路由 ---------------- */
  function go(id) {
    currentModule = id;
    renderTabbar();
    // 离开订单页时停止轮询
    if (id !== 'orders' && typeof el.root._stopOrders === 'function') { el.root._stopOrders(); el.root._stopOrders = null; }
    if (id === 'dashboard') return renderDashboard();
    if (id === '__more') return renderMore();
    var m = getModule(id);
    if (m.type === 'orders') return renderOrders();
    el.title.textContent = m.name;
    el.sub.textContent = m.desc;
    el.fab.style.display = (m.type === 'dashboard') ? 'none' : 'flex';
    var renderers = {
      list: renderList,
      board: renderBoard,
      checkin: renderCheckin,
      ledger: renderLedger
    };
    (renderers[m.type] || renderList)(m);
  }

  /* ---------------- 概览 ------------- */
  function renderDashboard() {
    var s = DB.get();
    el.title.textContent = '今日概览';
    el.sub.textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    el.fab.style.display = 'none';

    var pendingTodos = s.todos.filter(function (t) { return !t.done; });
    var todayEvents = s.events.filter(function (e) { return e.date === today(); });
    var monthSpend = 0, monthIncome = 0;
    var ym = today().slice(0, 7);
    s.ledger.forEach(function (r) {
      if ((r.date || '').slice(0, 7) === ym) {
        if (r.kind === '收入') monthIncome += Number(r.amount) || 0;
        else monthSpend += Number(r.amount) || 0;
      }
    });
    var activeGoals = s.goals.filter(function (g) { return Number(g.progress) < 100; });

    var html = '';
    // 快捷统计
    html += '<div class="stat-grid">' +
      statCard('待办', pendingTodos.length, '项未完成', 'todos') +
      statCard('今日日程', todayEvents.length, '项安排', 'events') +
      statCard('本月支出', '¥' + monthSpend.toFixed(0), '收入 ¥' + monthIncome.toFixed(0), 'ledger') +
      statCard('进行中目标', activeGoals.length, '个目标', 'goals') +
      '</div>';

    // 今日打卡
    html += '<section class="card"><div class="card-head"><h2>今日打卡</h2><button class="link-btn" data-go="habits">全部 ›</button></div>';
    if (!s.habits.length) {
      html += '<p class="empty">还没有习惯，去「习惯」分区添加吧</p>';
    } else {
      html += '<div class="habit-strip">' + s.habits.map(function (h) {
        var done = isCheckedToday(h);
        return '<button class="habit-chip' + (done ? ' done' : '') + '" data-check="' + h.id + '" style="--hc:' + (h.color || '#6366f1') + '">' +
          '<span class="hc-dot"></span>' + esc(h.title) + '</button>';
      }).join('') + '</div>';
    }
    html += '</section>';

    // 今日待办
    html += '<section class="card"><div class="card-head"><h2>待办清单</h2><button class="link-btn" data-go="todos">全部 ›</button></div>';
    if (!pendingTodos.length) html += '<p class="empty">暂无待办，太棒了 🎉</p>';
    else html += pendingTodos.slice(0, 6).map(function (t) {
      return '<div class="row-item"><button class="chk" data-toggle-todo="' + t.id + '"></button>' +
        '<div class="row-main"><div class="row-title">' + esc(t.title) + '</div>' +
        (t.due ? '<div class="row-sub">' + fmtDate(t.due) + (t.tag ? ' · ' + esc(t.tag) : '') + '</div>' : (t.tag ? '<div class="row-sub">' + esc(t.tag) + '</div>' : '')) +
        '</div>' + prioBadge(t.priority) + '</div>';
    }).join('');
    html += '</section>';

    // 今日日程
    if (todayEvents.length) {
      html += '<section class="card"><div class="card-head"><h2>今日日程</h2></div>' +
        todayEvents.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); }).map(function (e) {
          return '<div class="row-item"><div class="time-tag">' + (e.time || '—') + '</div><div class="row-main">' +
            '<div class="row-title">' + esc(e.title) + '</div>' +
            (e.location ? '<div class="row-sub">📍 ' + esc(e.location) + '</div>' : '') + '</div></div>';
        }).join('') + '</section>';
    }

    // 食堂订单入口（实时拉取待接单数量）
    try {
      fetch(apiBase() + 'api/orders?since=0').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
        if (DB.get() && currentModule !== 'dashboard') return;
        var orders = (data && data.orders) || [];
        var pending = orders.filter(function (o) { return o.status === '待接单'; }).length;
        if (pending > 0) {
          var box = document.getElementById('dashOrders');
          if (box) {
            box.querySelector('.do-count').textContent = pending;
          } else {
            var sec = document.createElement('section');
            sec.className = 'card'; sec.id = 'dashOrders';
            sec.style.borderLeft = '4px solid var(--c-primary)';
            sec.innerHTML = '<div class="card-head"><h2>🍱 食堂订单</h2><button class="link-btn" data-go="orders">查看 ›</button></div>' +
              '<div style="display:flex;align-items:baseline;gap:8px"><span class="do-count" style="font-size:26px;font-weight:700;color:var(--c-primary)">' + pending + '</span><span style="font-size:13px;color:var(--c-text-3)">个新订单待接单（来自「小小怪食堂」点菜端）</span></div>';
            el.root.appendChild(sec);
          }
        }
      }).catch(function () {});
    } catch (e) {}

    el.root.innerHTML = html;
  }
  function statCard(label, num, sub, goId) {
    return '<button class="stat-card" data-go="' + goId + '"><div class="stat-num">' + num + '</div>' +
      '<div class="stat-label">' + label + '</div><div class="stat-sub">' + sub + '</div></button>';
  }
  function prioBadge(p) {
    if (!p) return '';
    var cls = p === '高' ? 'p-high' : p === '中' ? 'p-mid' : 'p-low';
    return '<span class="prio ' + cls + '">' + p + '</span>';
  }
  function money(n) { return '¥' + (Number(n) || 0).toFixed(0); }

  /* ---------------- 食堂订单（接收端） ------------- */
  function apiBase() {
    var b = (DB.get().settings.syncEndpoint || '').trim();
    if (b && !b.endsWith('/')) b += '/';
    return b; // 空 = 同源
  }
  var ordersTimer = null;
  function renderOrders() {
    el.title.textContent = '食堂订单';
    el.sub.textContent = '来自「小小怪食堂」点餐';
    el.fab.style.display = 'none';
    el.root.innerHTML = '<div class="empty-box"><div class="ei">🍱</div><h3>正在接收订单…</h3><p>来自点菜端的下单会出现在这里</p></div>';
    clearInterval(ordersTimer);
    function loadOnce() {
      DB.fetchOrders ? null : null;
      fetch(apiBase() + 'api/orders?since=0').then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (data) {
          var orders = (data.orders || []).slice().reverse();
          if (!orders.length) {
            el.root.innerHTML = '<div class="empty-box"><div class="ei">🍱</div><h3>还没有订单</h3><p>在点菜端下单后，这里会实时显示</p></div>';
            return;
          }
          var pending = orders.filter(function (o) { return o.status === '待接单'; }).length;
          var html = '<div class="ledger-summary" style="margin-bottom:12px">' +
            '<div class="ls-item"><span>累计订单</span><b>' + orders.length + '</b></div>' +
            '<div class="ls-item"><span>待接单</span><b class="expense">' + pending + '</b></div>' +
            '<div class="ls-item"><span>完成</span><b>' + orders.filter(function (o) { return o.status === '已完成'; }).length + '</b></div></div>';
          html += '<div class="list-wrap">' + orders.map(function (o) { return orderCard(o); }).join('') + '</div>';
          el.root.innerHTML = html;
        })
        .catch(function () {
          el.root.innerHTML = '<div class="empty-box"><div class="ei">⚠️</div><h3>无法连接订单服务</h3><p>请在设置里填写后端地址，或确认后端已启动</p></div>';
        });
    }
    loadOnce();
    ordersTimer = setInterval(loadOnce, 5000); // 每 5 秒轮询
    // 切换走时停止轮询
    el.root._stopOrders = function () { clearInterval(ordersTimer); };
  }
  function orderCard(o) {
    var items = (o.items || []).map(function (i) {
      return '<div class="oi-row"><span class="oi-name">' + esc(i.name) + (i.spice ? ' <span class="oi-sub">' + esc(i.spice) + '</span>' : '') + ' ×' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></div>';
    }).join('');
    var actions = '';
    if (o.status === '待接单') actions = '<button class="btn-accept" data-ostatus="' + o.id + '|已接单">接单</button>';
    else if (o.status === '已接单') actions = '<button class="btn-done" data-ostatus="' + o.id + '|已完成">完成</button><button class="btn-cancel" data-ostatus="' + o.id + '|已取消">取消</button>';
    return '<div class="order-card" data-oid="' + o.id + '">' +
      '<div class="order-head"><span class="order-time">' + new Date(o.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (o.table ? ' · 桌号 ' + esc(o.table) : '') + '</span>' +
      '<span class="status-badge status-' + esc(o.status) + '">' + esc(o.status) + '</span></div>' +
      '<div class="order-items">' + items + '</div>' +
      (o.note ? '<div class="d-val" style="font-size:12px;color:var(--c-text-3);margin-bottom:8px">备注：' + esc(o.note) + '</div>' : '') +
      '<div class="order-foot"><span class="order-total">合计 ' + money(o.total) + '</span>' +
      (actions ? '<div class="order-actions">' + actions + '</div>' : '') + '</div></div>';
  }

  /* ---------------- 更多分区 ---------------- */
  function renderMore() {
    el.title.textContent = '全部分区';
    el.sub.textContent = '点击进入 · 可自行扩展';
    el.fab.style.display = 'none';
    var html = '<div class="more-grid">' + MODULES.map(function (m) {
      return '<button class="more-card" data-go="' + m.id + '"><div class="more-ico">' + m.icon + '</div>' +
        '<div class="more-name">' + m.name + '</div><div class="more-desc">' + m.desc + '</div></button>';
    }).join('') + '</div>';
    html += '<section class="card"><h2>扩展位</h2><p class="empty">这里是预留空间。想加新的分区（如：读书清单、旅行计划、健身记录…），告诉我即可。</p></section>';
    el.root.innerHTML = html;
  }

  /* ---------------- 通用列表渲染 ---------------- */
  function renderList(m) {
    var list = DB.list(m.id);
    if (!list.length) {
      el.root.innerHTML = emptyBox(m);
      return;
    }
    var html = '<div class="list-wrap">';
    // 按日期字段排序（有的话）
    var dateField = m.fields.filter(function (f) { return f.type === 'date'; })[0];
    if (dateField) {
      list = list.slice().sort(function (a, b) {
        return (b[dateField.key] || '') .localeCompare(a[dateField.key] || '');
      });
    }
    if (m.hasDone) {
      var undone = list.filter(function (x) { return !x.done; });
      var done = list.filter(function (x) { return x.done; });
      html += undone.map(function (x) { return listRow(m, x, false); }).join('');
      if (done.length) {
        html += '<div class="sec-divider">已完成 (' + done.length + ')</div>';
        html += done.map(function (x) { return listRow(m, x, true); }).join('');
      }
    } else {
      html += list.map(function (x) { return listRow(m, x, false); }).join('');
    }
    html += '</div>';
    el.root.innerHTML = html;
  }
  function emptyBox(m) {
    return '<div class="empty-box"><div class="empty-ico">' + m.icon + '</div>' +
      '<h3>还没有' + m.name + '记录</h3><p>点击右下角 + 添加第一条</p></div>';
  }
  function listRow(m, item, done) {
    var main = item[m.fields[0].key] || '(无标题)';
    var subs = [];
    m.fields.slice(1).forEach(function (f) {
      var v = item[f.key];
      if (v === undefined || v === null || v === '') return;
      if (f.type === 'date') subs.push(fmtDate(v));
      else if (f.type === 'number' && m.id === 'ledger') return;
      else if (f.type === 'textarea') return;
      else subs.push(esc(v));
    });
    var extra = '';
    if (m.id === 'ledger') {
      var isIncome = item.kind === '收入';
      extra = '<span class="amount ' + (isIncome ? 'income' : 'expense') + '">' + (isIncome ? '+' : '-') + '¥' + (Number(item.amount) || 0).toFixed(2) + '</span>';
    } else if (m.id === 'goals') {
      extra = '<span class="progress-pill">' + (Number(item.progress) || 0) + '%</span>';
    } else if (m.id === 'todos') {
      extra = prioBadge(item.priority);
    }
    var chk = m.hasDone ? '<button class="chk' + (done ? ' on' : '') + '" data-toggle-todo="' + item.id + '"></button>' : '';
    return '<div class="row-item' + (done ? ' is-done' : '') + '" data-open="' + m.id + '|' + item.id + '">' +
      chk + '<div class="row-main"><div class="row-title">' + esc(main) + '</div>' +
      (subs.length ? '<div class="row-sub">' + subs.join(' · ') + '</div>' : '') +
      '</div>' + extra +
      '<button class="row-del" data-del="' + m.id + '|' + item.id + '">✕</button></div>';
  }

  /* ---------------- 看板 ---------------- */
  function renderBoard(m) {
    var list = DB.list(m.id);
    var html = '<div class="board-wrap">';
    m.columns.forEach(function (col) {
      var items = list.filter(function (x) { return (x.status || m.columns[0]) === col; });
      html += '<div class="board-col"><div class="board-col-head"><span>' + col + '</span><b>' + items.length + '</b></div>';
      html += items.map(function (x) {
        return '<div class="kanban-card" data-open="' + m.id + '|' + x.id + '">' +
          '<div class="kc-title">' + esc(x.title) + '</div>' +
          '<div class="kc-meta">' + (x.owner ? '<span>👤 ' + esc(x.owner) + '</span>' : '') +
          (x.due ? '<span>📅 ' + fmtDate(x.due) + '</span>' : '') + '</div>' +
          '<div class="kc-actions">' + m.columns.map(function (c) {
            return c === col ? '' : '<button data-move="' + x.id + '|' + c + '">→' + c + '</button>';
          }).join('') + '</div></div>';
      }).join('');
      html += '<button class="kanban-add" data-addcol="' + col + '">+ 添加</button></div>';
    });
    html += '</div>';
    el.root.innerHTML = html;
  }

  /* ---------------- 习惯打卡 ---------------- */
  function isCheckedToday(h) {
    var t = today();
    return (h.log || []).indexOf(t) >= 0;
  }
  function renderCheckin(m) {
    var list = DB.list(m.id);
    if (!list.length) { el.root.innerHTML = emptyBox(m); return; }
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }
    var html = '<div class="list-wrap">';
    list.forEach(function (h) {
      var log = h.log || [];
      var weekDone = days.filter(function (d) { return log.indexOf(d) >= 0; }).length;
      html += '<div class="habit-card" style="--hc:' + (h.color || '#6366f1') + '">' +
        '<div class="habit-head"><div><div class="habit-title">' + esc(h.title) + '</div>' +
        '<div class="habit-meta">本周 ' + weekDone + '/' + (h.target || 7) + ' 次</div></div>' +
        '<button class="row-del" data-del="' + m.id + '|' + h.id + '">✕</button></div>' +
        '<div class="habit-days">' + days.map(function (d) {
          var on = log.indexOf(d) >= 0;
          var wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(d.replace(/-/g, '/')).getDay()];
          return '<button class="hday' + (on ? ' on' : '') + (d === today() ? ' today' : '') + '" data-habit="' + h.id + '|' + d + '">' +
            '<span class="hday-w">' + wd + '</span><span class="hday-d">' + d.slice(8) + '</span></button>';
        }).join('') + '</div></div>';
    });
    html += '</div>';
    el.root.innerHTML = html;
  }

  /* ---------------- 记账 ---------------- */
  function renderLedger(m) {
    var list = DB.list(m.id);
    var ym = today().slice(0, 7);
    var income = 0, expense = 0;
    list.forEach(function (r) {
      if ((r.date || '').slice(0, 7) === ym) {
        if (r.kind === '收入') income += Number(r.amount) || 0;
        else expense += Number(r.amount) || 0;
      }
    });
    var head = '<div class="ledger-summary">' +
      '<div class="ls-item"><span>本月收入</span><b class="income">+¥' + income.toFixed(2) + '</b></div>' +
      '<div class="ls-item"><span>本月支出</span><b class="expense">-¥' + expense.toFixed(2) + '</b></div>' +
      '<div class="ls-item"><span>结余</span><b>' + (income - expense >= 0 ? '' : '-') + '¥' + Math.abs(income - expense).toFixed(2) + '</b></div>' +
      '</div>';
    if (!list.length) { el.root.innerHTML = head + emptyBox(m); return; }
    var sorted = list.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    el.root.innerHTML = head + '<div class="list-wrap">' + sorted.map(function (x) { return listRow(m, x, false); }).join('') + '</div>';
  }

  /* ---------------- 弹层 ----------------
     表单 / 详情 / 设置 共用
  ---------------------------------------- */
  function openSheet(title, bodyHTML) {
    el.sheetTitle.textContent = title;
    el.sheetBody.innerHTML = bodyHTML;
    el.sheetMask.classList.remove('hidden');
    requestAnimationFrame(function () { el.sheet.classList.add('show'); });
  }
  function closeSheet() {
    el.sheet.classList.remove('show');
    setTimeout(function () { el.sheetMask.classList.add('hidden'); }, 220);
  }

  function fieldInput(f, val) {
    var v = val === undefined || val === null ? (f.default !== undefined ? f.default : '') : val;
    var name = 'name="' + f.key + '"';
    if (f.type === 'textarea') {
      return '<label class="fld"><span>' + f.label + '</span><textarea ' + name + ' rows="3" placeholder="' + (f.placeholder || '') + '">' + esc(v) + '</textarea></label>';
    }
    if (f.type === 'select') {
      return '<label class="fld"><span>' + f.label + '</span><select ' + name + '>' +
        (f.options || []).map(function (o) { return '<option' + (String(v) === String(o) ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
        '</select></label>';
    }
    var inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text';
    if (f.type === 'date' && !v) v = '';
    return '<label class="fld"><span>' + f.label + (f.required ? ' <i>*</i>' : '') + '</span>' +
      '<input type="' + inputType + '" ' + name + ' value="' + esc(v) + '" placeholder="' + (f.placeholder || '') + '"' +
      (f.type === 'number' ? ' step="any" inputmode="decimal"' : '') + '></label>';
  }

  function openForm(m, item) {
    var isEdit = !!item;
    var body = '<form id="editForm" class="form">' +
      m.fields.map(function (f) { return fieldInput(f, item ? item[f.key] : undefined); }).join('') +
      '<div class="form-actions"><button type="button" class="btn ghost" data-cancel>取消</button>' +
      '<button type="submit" class="btn primary">' + (isEdit ? '保存' : '添加') + '</button></div></form>';
    openSheet((isEdit ? '编辑' : '新增') + m.name, body);

    var form = $('#editForm', el.sheetBody);
    // 日期默认今天
    $$('input[type=date]', form).forEach(function (inp) {
      if (!inp.value && inp.name !== 'deadline') inp.value = today();
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {};
      var ok = true;
      m.fields.forEach(function (f) {
        var inp = form.querySelector('[name="' + f.key + '"]');
        var v = inp ? inp.value.trim() : '';
        if (f.required && !v) { ok = false; inp.classList.add('err'); }
        data[f.key] = f.type === 'number' ? (v === '' ? '' : Number(v)) : v;
      });
      if (!ok) { toast('请填写必填项'); return; }
      if (isEdit) { DB.update(m.id, item.id, data); toast('已保存'); }
      else { DB.add(m.id, data); toast('已添加'); }
      closeSheet();
      go(currentModule);
    });
    form.addEventListener('click', function (ev) {
      if (ev.target.hasAttribute('data-cancel')) closeSheet();
    });
  }

  /* ---------------- 详情 ---------------- */
  function openDetail(m, item) {
    var body = '<div class="detail">' + m.fields.map(function (f) {
      var v = item[f.key];
      if (v === undefined || v === null || v === '') return '';
      if (f.type === 'date') v = fmtDate(v);
      return '<div class="d-row"><span class="d-label">' + f.label + '</span><div class="d-val">' + esc(v).replace(/\n/g, '<br>') + '</div></div>';
    }).join('') + '</div>' +
    '<div class="form-actions"><button class="btn ghost" data-del2>删除</button>' +
    '<button class="btn primary" data-edit>编辑</button></div>';
    openSheet(item[m.fields[0].key] || '详情', body);
    el.sheetBody.addEventListener('click', function (ev) {
      if (ev.target.hasAttribute('data-edit')) {
        closeSheet();
        setTimeout(function () { openForm(m, item); }, 240);
      } else if (ev.target.hasAttribute('data-del2')) {
        if (confirm('确定删除这条记录？')) { DB.remove(m.id, item.id); closeSheet(); toast('已删除'); go(currentModule); }
      }
    }, { once: true });
  }

  /* ---------------- 设置 ----------------
     含：备份导入导出、云同步预留、模块清单
  ---------------------------------------- */
  function openSettings() {
    var s = DB.get();
    var body =
      '<div class="settings">' +
      '<label class="fld"><span>昵称</span><input id="setNick" value="' + esc(s.settings.nickName) + '"></label>' +
      '<div class="set-group"><h4>数据备份</h4>' +
      '<p class="hint">数据保存在本机。建议定期导出备份，换设备时导入即可。</p>' +
      '<div class="form-actions"><button class="btn ghost" id="btnExport">导出备份</button>' +
      '<button class="btn ghost" id="btnImport">导入备份</button></div>' +
      '<input type="file" id="fileImport" accept=".json" class="hidden">' +
      '</div>' +
      '<div class="set-group"><h4>云同步 <span class="tag-soon">预留</span></h4>' +
      '<p class="hint">结构已预留同步接口。配置你自己的云服务后可多设备同步，随时找我开启。</p>' +
      '<label class="fld"><span>同步地址</span><input id="setSyncEp" placeholder="https://your-server/sync" value="' + esc(s.settings.syncEndpoint) + '"></label>' +
      '<label class="fld"><span>同步令牌</span><input id="setSyncToken" placeholder="token" value="' + esc(s.settings.syncToken) + '"></label>' +
      '<div class="form-actions"><button class="btn primary" id="btnSync">立即同步</button></div>' +
      '</div>' +
      '<div class="set-group"><h4>分区管理</h4>' +
      '<p class="hint">当前共 ' + MODULES.length + ' 个分区：' + MODULES.map(function (m) { return m.name; }).join('、') + '</p>' +
      '<p class="hint">想增加 / 删除 / 改名分区，直接告诉我，我帮你改。</p>' +
      '</div>' +
      '<div class="set-group danger"><h4>危险操作</h4>' +
      '<button class="btn danger" id="btnReset">清空全部数据</button></div>' +
      '</div>';
    openSheet('设置', body);

    $('#setNick').addEventListener('change', function () { DB.setSetting('nickName', this.value); toast('已保存'); });
    $('#btnExport').addEventListener('click', function () {
      var blob = new Blob([DB.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '工作台备份_' + today() + '.json';
      a.click();
      toast('已导出备份');
    });
    $('#btnImport').addEventListener('click', function () { $('#fileImport').click(); });
    $('#fileImport').addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { DB.importJSON(reader.result); toast('导入成功'); closeSheet(); go(currentModule); }
        catch (e) { toast('文件格式错误'); }
      };
      reader.readAsText(file);
    });
    $('#setSyncEp').addEventListener('change', function () { DB.setSetting('syncEndpoint', this.value); });
    $('#setSyncToken').addEventListener('change', function () { DB.setSetting('syncToken', this.value); });
    $('#btnSync').addEventListener('click', function () {
      var ep = DB.get().settings.syncEndpoint;
      if (!ep) { toast('请先填写同步地址'); return; }
      toast('同步接口已预留，填入可用服务后可启用');
    });
    $('#btnReset').addEventListener('click', function () {
      if (confirm('将清空全部数据且不可恢复，确定？')) { DB.reset(); closeSheet(); go('dashboard'); toast('已清空'); }
    });
  }

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-go],[data-open],[data-del],[data-toggle-todo],[data-habit],[data-move],[data-addcol],[data-check],[data-ostatus]') : null;
    if (!t) return;

    if (t.hasAttribute('data-ostatus')) {
      var op = t.getAttribute('data-ostatus').split('|');
      fetch(apiBase() + 'api/orders/' + op[0], {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: op[1] })
      }).then(function (r) { return r.ok; }).then(function (ok) {
        toast(ok ? ('已更新为「' + op[1] + '」') : '更新失败');
        if (ok) { var card = t.closest('.order-card'); if (card) card.style.opacity = .5; renderOrders(); }
      }).catch(function () { toast('网络错误'); });
      return;
    }
    if (t.hasAttribute('data-go')) { go(t.getAttribute('data-go')); return; }
    if (t.hasAttribute('data-del')) {
      var d = t.getAttribute('data-del').split('|');
      if (confirm('确定删除？')) { DB.remove(d[0], d[1]); toast('已删除'); go(currentModule); }
      return;
    }
    if (t.hasAttribute('data-toggle-todo')) {
      var id = t.getAttribute('data-toggle-todo');
      var item = DB.list('todos').filter(function (x) { return x.id === id; })[0];
      if (item) { DB.update('todos', id, { done: !item.done }); go(currentModule); }
      return;
    }
    if (t.hasAttribute('data-habit')) {
      var hp = t.getAttribute('data-habit').split('|');
      var h = DB.list('habits').filter(function (x) { return x.id === hp[0]; })[0];
      if (h) {
        var log = h.log || [];
        var idx = log.indexOf(hp[1]);
        if (idx >= 0) log = log.filter(function (d) { return d !== hp[1]; });
        else log = log.concat([hp[1]]);
        DB.update('habits', h.id, { log: log });
        go(currentModule);
      }
      return;
    }
    if (t.hasAttribute('data-check')) {
      var cid = t.getAttribute('data-check');
      var hh = DB.list('habits').filter(function (x) { return x.id === cid; })[0];
      if (hh) {
        var lg = (hh.log || []).slice();
        var i2 = lg.indexOf(today());
        if (i2 >= 0) lg = lg.filter(function (d) { return d !== today(); }); else lg.push(today());
        DB.update('habits', cid, { log: lg });
        renderDashboard();
      }
      return;
    }
    if (t.hasAttribute('data-move')) {
      var mv = t.getAttribute('data-move').split('|');
      DB.update('board', mv[0], { status: mv[1] });
      go(currentModule);
      return;
    }
    if (t.hasAttribute('data-addcol')) {
      var m = getModule('board');
      var tmp = {}; tmp.status = t.getAttribute('data-addcol');
      openForm(m, null);
      setTimeout(function () {
        var sel = el.sheetBody.querySelector('[name="status"]');
        if (sel) sel.value = tmp.status;
      }, 30);
      return;
    }
    if (t.hasAttribute('data-open')) {
      var op = t.getAttribute('data-open').split('|');
      var mod = getModule(op[0]);
      var rec = DB.list(op[0]).filter(function (x) { return x.id === op[1]; })[0];
      if (rec) openDetail(mod, rec);
      return;
    }
  });

  el.fab.addEventListener('click', function () {
    if (currentModule === '__more' || currentModule === 'dashboard') return;
    openForm(getModule(currentModule), null);
  });
  el.sheetClose.addEventListener('click', closeSheet);
  el.sheetMask.addEventListener('click', function (ev) { if (ev.target === el.sheetMask) closeSheet(); });
  el.btnMenu.addEventListener('click', openSettings);

  /* 编辑模式：显示模块切换提示（为扩展预留的入口） */
  el.btnEditMode.addEventListener('click', function () {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    toast(editMode ? '编辑模式：可拖动/调整模块（扩展功能）' : '已退出编辑模式');
    if (editMode) {
      openSheet('自定义工作台', '<p class="hint">这里预留给「调整分区顺序 / 增删分区 / 更换主题」等能力。</p>' +
        '<p class="hint">把你想要的效果告诉我，我来帮你实现，例如：</p>' +
        '<ul class="hint-list"><li>把「记账」挪到底部导航</li><li>新增「读书清单」分区</li><li>换成深色主题</li></ul>');
    }
  });

  /* ---------------- 启动 ---------------- */
  el.brandLogo.textContent = (state.settings.nickName || '我').slice(0, 1);
  go('dashboard');
  renderTabbar();
})();

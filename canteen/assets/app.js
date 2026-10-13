/* 小小怪食堂 · 主逻辑 */
(function () {
  'use strict';
  var FRONT_VER = 'canteen-v3';
  var state = CDB.init();
  var currentView = 'home';
  var currentCat = null;
  var editMode = false;
  var el = {
    title: document.getElementById('pageTitle'),
    sub: document.getElementById('pageSub'),
    root: document.getElementById('viewRoot'),
    cartBar: document.getElementById('cartBar'),
    cartBarInfo: document.getElementById('cartBarInfo'),
    btnOpenCart: document.getElementById('btnOpenCart'),
    fab: document.getElementById('fab'),
    tabbar: document.getElementById('tabbar'),
    sheetMask: document.getElementById('sheetMask'),
    sheet: document.getElementById('sheet'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetBody: document.getElementById('sheetBody'),
    sheetClose: document.getElementById('sheetClose'),
    btnMenu: document.getElementById('btnMenu'),
    btnEdit: document.getElementById('btnEdit'),
    btnOrders: document.getElementById('btnOrders'),
    toast: document.getElementById('toast')
  };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '¥' + (Number(n) || 0).toFixed(0); }
  var SPICE = ['不辣', '微辣', '中辣', '重辣', '麻辣'];
  var SPICE_ICON = { '不辣': '🟢', '微辣': '🟡', '中辣': '🟠', '重辣': '🔴', '麻辣': '🔥' };

  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.toast.classList.add('hidden'); }, 1800);
  }

  function openSheet(title, html) {
    el.sheetTitle.textContent = title; el.sheetBody.innerHTML = html;
    el.sheetMask.classList.remove('hidden');
    requestAnimationFrame(function () { el.sheet.classList.add('show'); });
  }
  function closeSheet() {
    el.sheet.classList.remove('show');
    setTimeout(function () { el.sheetMask.classList.add('hidden'); }, 220);
  }

  /* ============ 渲染 ============ */
  function render() {
    if (currentView === 'home') return renderHome();
    if (currentView === 'cat') return renderCat();
    if (currentView === 'orders') return renderOrders();
    if (currentView === 'manage') return renderManage();
  }

  function renderHome() {
    el.title.textContent = '小小怪食堂';
    el.sub.textContent = '选菜系 · 点好菜';
    el.fab.style.display = editMode ? 'flex' : 'none';
    var cats = CDB.cats();
    var html = '<div class="cat-grid">';
    cats.forEach(function (c) {
      html += '<div class="cat-card" data-cat="' + c.id + '">' +
        (editMode ? '<button class="cat-del" data-catdel="' + c.id + '">✕</button>' : '') +
        '<div class="cat-ico">' + (c.icon || '🍽️') + '</div>' +
        '<div class="cat-name">' + esc(c.name) + '</div>' +
        '<div class="cat-desc">' + esc(c.desc) + '</div></div>';
    });
    if (editMode) html += '<div class="cat-card cat-add" data-catadd="1"><div class="cat-ico">＋</div><div class="cat-name">新增菜系</div></div>';
    html += '</div>';
    html += '<p class="empty" style="margin-top:18px;text-align:center">长按右上角 ✎ 可编辑 / 增删菜系与菜品</p>';
    el.root.innerHTML = html;
    updateCartBar();
  }

  function renderCat() {
    var c = CDB.cat(currentCat);
    if (!c) { currentView = 'home'; return renderHome(); }
    el.title.textContent = c.icon + ' ' + c.name;
    el.sub.textContent = c.desc;
    el.fab.style.display = 'flex';
    var dishes = CDB.dishesOf(currentCat);
    var html = '<div class="section-title"><span class="back" data-home="1">‹ 全部菜系</span>' +
      (editMode ? '<span class="back" data-catedit="' + c.id + '">编辑版块</span>' : '') + '</div>';
    if (!dishes.length) {
      html += '<div class="empty-box"><div class="ei">🍽️</div><h3>这个菜系还没菜</h3><p>点右下角 + 添加第一道菜</p></div>';
    } else {
      html += '<div class="dish-list">';
      dishes.forEach(function (d) {
        html += '<div class="dish-card" data-dish="' + d.id + '">' +
          (editMode ? '<button class="dish-del" data-dishdel="' + d.id + '">✕</button>' : '') +
          dishImg(d) +
          '<div class="dish-main">' +
          '<div class="dish-top"><span class="dish-name">' + esc(d.name) + '</span>' + spiceTag(d.spice) + '</div>' +
          '<div class="dish-meta">材料成本 ' + money(d.ingredientPrice) + (d.ingredients ? ' · ' + esc(d.ingredients).slice(0, 18) : '') + '</div>' +
          '<div class="dish-bottom"><span class="dish-price">' + money(d.price) + '</span>' +
          (editMode ? '' : '<button class="add-btn" data-add="' + d.id + '">+</button>') + '</div>' +
          '</div></div>';
      });
      html += '</div>';
    }
    el.root.innerHTML = html;
    updateCartBar();
  }

  function dishImg(d) {
    if (d.image) return '<div class="dish-img"><img src="' + esc(d.image) + '" alt=""></div>';
    return '<div class="dish-img">🍴</div>';
  }
  function spiceTag(s) {
    return '<span class="spice ' + esc(s || '不辣') + '">' + (SPICE_ICON[s || '不辣'] || '') + (s || '不辣') + '</span>';
  }

  function renderOrders() {
    el.title.textContent = '我的订单';
    el.sub.textContent = '提交后可被主工作台接收';
    el.fab.style.display = 'none';
    CDB.fetchOrders(0).then(function (orders) {
      if (!orders.length) {
        el.root.innerHTML = '<div class="empty-box"><div class="ei">🧾</div><h3>还没有订单</h3><p>在菜单里下单后会显示在这里</p></div>';
        return;
      }
      el.root.innerHTML = orders.map(orderCard).join('');
    }).catch(function (e) {
      console.error('[点餐端] 拉取订单失败', e);
      el.root.innerHTML = '<div class="empty-box"><div class="ei">⚠️</div><h3>无法连接服务器</h3><p>请检查网络或后端地址设置</p></div>';
    });
    updateCartBar();
  }

  function orderCard(o) {
    var items = (o.items || []).map(function (i) {
      return '<div class="oi-row"><span class="oi-name">' + esc(i.name) + (i.spice ? '<span class="oi-sub">' + esc(i.spice) + '</span>' : '') + ' ×' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></div>';
    }).join('');
    return '<div class="order-card" data-order="' + o.id + '">' +
      '<div class="order-head"><span class="order-time">' + new Date(o.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (o.table ? ' · 桌号 ' + esc(o.table) : '') + '</span>' +
      '<span class="status-badge status-' + esc(o.status) + '">' + esc(o.status) + '</span></div>' +
      '<div class="order-items">' + items + '</div>' +
      (o.note ? '<div class="d-val" style="font-size:12px;color:var(--c-text-3);margin-bottom:8px">备注：' + esc(o.note) + '</div>' : '') +
      '<div class="order-foot"><span class="order-total">合计 ' + money(o.total) + '</span></div></div>';
  }

  function renderManage() {
    el.title.textContent = '菜单管理';
    el.sub.textContent = '导出 / 导入 / 同步设置';
    el.fab.style.display = 'none';
    var s = CDB.get();
    var html = '<div class="settings">' +
      '<div class="set-group"><h4>数据备份</h4>' +
      '<p class="hint">菜系与菜品保存在本机。建议定期导出，换新设备时导入。</p>' +
      '<div class="form-actions"><button class="btn ghost" id="btnExport">导出菜单</button><button class="btn ghost" id="btnImport">导入菜单</button></div>' +
      '<input type="file" id="fileImport" accept=".json" class="hidden"></div>' +
      '<div class="set-group"><h4>订单同步服务</h4>' +
      '<p class="hint">后端地址一般留空（自动指向本站点）。当前使用的地址：<code>' + esc(CDB.apiBase()) + '</code></p>' +
      '<label class="fld"><span>后端地址（一般不用改）</span><input id="setApi" placeholder="https://你的服务/api" value="' + esc(s.settings.apiBase) + '"></label>' +
      '<div class="form-actions"><button class="btn primary" id="btnTest">测试连接</button></div>' +
      '<div id="connStatus" class="conn-status">点击下方「测试连接」检测服务</div></div>' +
      '<div class="set-group danger"><h4>重置</h4><button class="btn danger" id="btnReset">清空菜单（恢复示例）</button></div>' +
      '<div class="set-group"><p class="hint">前端版本 ' + FRONT_VER + ' · 若与最新不符，请刷新或换无痕窗口</p></div>' +
      '</div>';
    el.root.innerHTML = html;

    $('#btnExport').addEventListener('click', function () {
      var blob = new Blob([CDB.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = '小小怪食堂菜单.json'; a.click(); toast('已导出');
    });
    $('#btnImport').addEventListener('click', function () { $('#fileImport').click(); });
    $('#fileImport').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { try { CDB.importJSON(r.result); toast('导入成功'); } catch (e) { toast('格式错误'); } };
      r.readAsText(f);
    });
    $('#setApi').addEventListener('change', function () { CDB.setSetting('apiBase', this.value.trim()); toast('已保存'); });
    $('#btnTest').addEventListener('click', function () {
      var url = CDB.apiBase() + 'api/health';
      var st = document.getElementById('connStatus');
      console.log('[点餐端] 测试连接 →', url);
      st.className = 'conn-status'; st.textContent = '正在连接 ' + url + ' …';
      fetch(url).then(function (r) {
        console.log('[点餐端] 响应:', r.status, 'ok=', r.ok);
        if (r.ok) { st.className = 'conn-status ok'; st.textContent = '✓ 连接成功，服务正常'; toast('连接成功 ✓'); }
        else { st.className = 'conn-status bad'; st.textContent = '✗ 地址不可用，状态码 ' + r.status; toast('地址不可用'); }
      }).catch(function (e) {
        console.error('[点餐端] 连接失败:', e);
        st.className = 'conn-status bad'; st.textContent = '✗ 无法连接：' + ((e && e.message) || e); toast('无法连接');
      });
    });
    $('#btnReset').addEventListener('click', function () { if (confirm('清空所有自定义菜单？')) { CDB.reset(); toast('已重置'); renderHome(); } });
    updateCartBar();
  }

  /* ============ 表单 ============ */
  function imageField(current) {
    return '<div class="fld"><span>菜品封面</span><div class="img-pick">' +
      '<div class="img-prev" id="imgPrev">' + (current ? '<img src="' + esc(current) + '">' : '🍴') + '</div>' +
      '<div><button type="button" class="img-btn" id="pickImg">选择图片</button>' +
      (current ? '<button type="button" class="img-rm" id="rmImg">移除</button>' : '') + '</div>' +
      '<input type="file" id="imgFile" accept="image/*" class="hidden"></div></div>';
  }
  function bindImage(form) {
    var file = $('#imgFile', form), prev = $('#imgPrev', form);
    var hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'image'; hidden.value = ''; form.appendChild(hidden);
    if (file) file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { hidden.value = r.result; prev.innerHTML = '<img src="' + r.result + '">'; };
      r.readAsDataURL(f);
    });
    var pick = $('#pickImg', form); if (pick) pick.addEventListener('click', function () { file.click(); });
    var rm = $('#rmImg', form); if (rm) rm.addEventListener('click', function () { hidden.value = ''; prev.innerHTML = '🍴'; });
  }

  function openDishForm(catId, dish) {
    var isEdit = !!dish;
    var d = dish || { catId: catId, spice: '不辣', ingredientPrice: '', price: '', ingredients: '', method: '', image: '', name: '' };
    var html = '<form id="dishForm" class="form">' +
      '<label class="fld"><span>菜品名称 <i>*</i></span><input name="name" value="' + esc(d.name) + '" placeholder="如：麻婆豆腐"></label>' +
      imageField(d.image) +
      '<label class="fld"><span>辣度</span><select name="spice">' + SPICE.map(function (s) { return '<option' + (s === d.spice ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>准备材料</span><textarea name="ingredients" rows="2" placeholder="如：豆腐、牛肉末、豆瓣酱">' + esc(d.ingredients) + '</textarea></label>' +
      '<div style="display:flex;gap:10px"><label class="fld" style="flex:1"><span>材料成本(¥)</span><input name="ingredientPrice" type="number" step="any" value="' + esc(d.ingredientPrice) + '" placeholder="8"></label>' +
      '<label class="fld" style="flex:1"><span>售价(¥) <i>*</i></span><input name="price" type="number" step="any" value="' + esc(d.price) + '" placeholder="22"></label></div>' +
      '<label class="fld"><span>制作方式</span><textarea name="method" rows="3" placeholder="步骤说明…">' + esc(d.method) + '</textarea></label>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-cancel>取消</button><button type="submit" class="btn primary">' + (isEdit ? '保存' : '添加') + '</button></div></form>';
    openSheet((isEdit ? '编辑' : '新增') + '菜品', html);
    var form = $('#dishForm', el.sheetBody);
    bindImage(form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {};
      ['name', 'spice', 'ingredients', 'ingredientPrice', 'price', 'method', 'image'].forEach(function (k) {
        var inp = form.querySelector('[name="' + k + '"]');
        var v = inp ? inp.value.trim() : '';
        data[k] = (k === 'ingredientPrice' || k === 'price') ? (v === '' ? 0 : Number(v)) : v;
      });
      if (!data.name) { toast('请填写菜品名称'); return; }
      if (!data.price) { toast('请填写售价'); return; }
      if (isEdit) { CDB.updateDish(dish.id, data); toast('已保存'); }
      else { CDB.addDish(data); toast('已添加'); }
      closeSheet(); render();
    });
    form.addEventListener('click', function (ev) { if (ev.target.hasAttribute('data-cancel')) closeSheet(); });
  }

  function openCatForm(cat) {
    var isEdit = !!cat;
    var c = cat || { name: '', icon: '🍽️', desc: '' };
    var emojis = ['🍽️', '🌶️', '🍲', '🥘', '🍰', '🍝', '🍜', '🍱', '🥗', '🍤', '🍚', '🍵'];
    var html = '<form id="catForm" class="form">' +
      '<label class="fld"><span>版块名称 <i>*</i></span><input name="name" value="' + esc(c.name) + '" placeholder="如：湘菜"></label>' +
      '<label class="fld"><span>图标(emoji)</span><select name="icon">' + emojis.map(function (e) { return '<option' + (e === c.icon ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>简介</span><input name="desc" value="' + esc(c.desc) + '" placeholder="一句话描述"></label>' +
      '<div class="form-actions"><button type="button" class="btn ghost" data-cancel>取消</button><button type="submit" class="btn primary">' + (isEdit ? '保存' : '添加') + '</button></div></form>';
    openSheet((isEdit ? '编辑' : '新增') + '菜系版块', html);
    var form = $('#catForm', el.sheetBody);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = { name: form.name.value.trim(), icon: form.icon.value, desc: form.desc.value.trim() };
      if (!data.name) { toast('请填写名称'); return; }
      if (isEdit) { CDB.updateCat(cat.id, data); toast('已保存'); }
      else { CDB.addCat(data); toast('已添加'); }
      closeSheet(); render();
    });
    form.addEventListener('click', function (ev) { if (ev.target.hasAttribute('data-cancel')) closeSheet(); });
  }

  function openDishDetail(d) {
    var html = '<div class="detail">' +
      '<div class="d-img">' + (d.image ? '<img src="' + esc(d.image) + '">' : '🍴') + '</div>' +
      '<div class="d-title-row"><span class="dish-name" style="font-size:18px">' + esc(d.name) + '</span>' + spiceTag(d.spice) + '</div>' +
      row('准备材料', d.ingredients) +
      row('材料成本', money(d.ingredientPrice)) +
      row('售价', money(d.price)) +
      row('制作方式', d.method) +
      '</div><div class="form-actions"><button class="btn ghost" id="dEdit">编辑</button><button class="btn primary" id="dAdd">加入购物车</button></div>';
    openSheet(d.name, html);
    $('#dAdd', el.sheetBody).addEventListener('click', function () {
      CDB.cartAdd({ dishId: d.id, name: d.name, price: Number(d.price) || 0, spice: d.spice, qty: 1 });
      toast('已加入购物车'); closeSheet(); updateCartBar();
    });
    $('#dEdit', el.sheetBody).addEventListener('click', function () { closeSheet(); setTimeout(function () { openDishForm(d.catId, d); }, 240); });
    function row(l, v) { return v ? '<div class="d-row"><span class="d-label">' + l + '</span><div class="d-val">' + esc(v).replace(/\n/g, '<br>') + '</div></div>' : ''; }
  }

  /* ============ 购物车 ============ */
  function cartCount() { return CDB.cart().reduce(function (a, x) { return a + x.qty; }, 0); }
  function cartTotal() { return CDB.cart().reduce(function (a, x) { return a + x.qty * x.price; }, 0); }
  function updateCartBar() {
    var n = cartCount();
    if (n > 0) {
      el.cartBar.classList.remove('hidden');
      el.cartBarInfo.innerHTML = '<span class="cb-count">' + n + ' 件</span><span class="cb-total">' + money(cartTotal()) + '</span>';
    } else el.cartBar.classList.add('hidden');
  }

  function openCart() {
    var items = CDB.cart();
    if (!items.length) { toast('购物车是空的'); return; }
    var html = '<div class="cart-list">' + items.map(function (i) {
      return '<div class="cart-item" data-ci="' + i.dishId + '|' + esc(i.spice) + '">' +
        '<div class="ci-img">' + (i.image ? '<img src="' + esc(i.image) + '">' : '🍴') + '</div>' +
        '<div class="ci-main"><div class="ci-name">' + esc(i.name) + '</div>' +
        '<div class="ci-spice">' + (SPICE_ICON[i.spice] || '') + (i.spice || '不辣') + '</div>' +
        '<div class="ci-price">' + money(i.price) + '</div></div>' +
        '<div class="stepper"><button class="step-btn" data-step="-1" data-ci="' + i.dishId + '|' + esc(i.spice) + '">−</button>' +
        '<span class="ci-qty">' + i.qty + '</span>' +
        '<button class="step-btn" data-step="1" data-ci="' + i.dishId + '|' + esc(i.spice) + '">+</button></div></div>';
    }).join('') + '</div>' +
    '<label class="fld"><span>桌号 / 取餐号（可选）</span><input id="orderTable" placeholder="如：A03"></label>' +
    '<label class="fld"><span>订单备注（可选）</span><textarea id="orderNote" rows="2" placeholder="少放辣、不要香菜…"></textarea></label>' +
    '<div class="form-actions"><button class="btn ghost" id="cartClear">清空</button><button class="btn primary" id="cartSubmit">提交订单 ' + money(cartTotal()) + '</button></div>';
    openSheet('购物车', html);
    el.sheetBody.addEventListener('click', function (ev) {
      var step = ev.target.getAttribute('data-step');
      if (step) {
        var p = ev.target.getAttribute('data-ci').split('|');
        var it = CDB.cart().filter(function (x) { return x.dishId === p[0] && x.spice === p[1]; })[0];
        if (it) { CDB.cartUpdateQty(p[0], p[1], it.qty + Number(step)); openCart(); updateCartBar(); }
        return;
      }
    }, { once: false });
    $('#cartClear').addEventListener('click', function () { CDB.cartClear(); closeSheet(); updateCartBar(); toast('已清空'); });
    $('#cartSubmit').addEventListener('click', function () {
      var payload = {
        items: CDB.cart().map(function (i) { return { dishId: i.dishId, name: i.name, price: i.price, qty: i.qty, spice: i.spice }; }),
        total: cartTotal(),
        table: $('#orderTable').value.trim(),
        note: $('#orderNote').value.trim()
      };
      CDB.submitOrder(payload).then(function (res) {
        console.log('[点餐端] 下单成功', res);
        CDB.cartClear(); closeSheet(); updateCartBar(); toast('下单成功 ✓');
        currentView = 'orders'; render();
      }).catch(function (e) {
        console.error('[点餐端] 下单失败', e);
        var msg = (e && e.message) ? e.message : '下单失败，检查网络';
        toast('下单失败：' + msg);
        // 同时把错误写到连接状态框，避免一闪而过
        var box = document.getElementById('connStatus');
        if (box) { box.className = 'conn-status err'; box.textContent = '✗ 下单失败：' + msg; }
      });
    });
  }

  /* ============ 事件 ============ */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-cat],[data-catadd],[data-catdel],[data-catedit],[data-dish],[data-dishdel],[data-add],[data-home],[data-tab],[data-order]') : null;
    if (!t) return;
    if (t.hasAttribute('data-home')) { currentView = 'home'; render(); return; }
    if (t.hasAttribute('data-cat')) { currentCat = t.getAttribute('data-cat'); if (editMode) openCatForm(CDB.cat(currentCat)); else { currentView = 'cat'; render(); } return; }
    if (t.hasAttribute('data-catadd')) { openCatForm(null); return; }
    if (t.hasAttribute('data-catedit')) { openCatForm(CDB.cat(t.getAttribute('data-catedit'))); return; }
    if (t.hasAttribute('data-catdel')) { if (confirm('删除该菜系及其中所有菜品？')) { CDB.removeCat(t.getAttribute('data-catdel')); render(); } return; }
    if (t.hasAttribute('data-dish')) { var dd = CDB.dish(t.getAttribute('data-dish')); if (dd) openDishDetail(dd); return; }
    if (t.hasAttribute('data-dishdel')) { if (confirm('删除这道菜？')) { CDB.removeDish(t.getAttribute('data-dishdel')); render(); } return; }
    if (t.hasAttribute('data-add')) { var d2 = CDB.dish(t.getAttribute('data-add')); if (d2) { CDB.cartAdd({ dishId: d2.id, name: d2.name, price: Number(d2.price) || 0, spice: d2.spice, qty: 1, image: d2.image }); toast('已加入购物车'); updateCartBar(); } return; }
    if (t.hasAttribute('data-tab')) { goTab(t.getAttribute('data-tab')); return; }
  });

  function goTab(v) {
    $$('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-go') === v); });
    currentView = v; render();
  }

  el.btnOpenCart.addEventListener('click', openCart);
  el.fab.addEventListener('click', function () {
    if (currentView === 'home') { if (editMode) openCatForm(null); }
    else if (currentView === 'cat') openDishForm(currentCat, null);
  });
  el.sheetClose.addEventListener('click', closeSheet);
  el.sheetMask.addEventListener('click', function (ev) { if (ev.target === el.sheetMask) closeSheet(); });
  el.btnMenu.addEventListener('click', function () { currentView = 'manage'; render(); });
  el.btnOrders.addEventListener('click', function () { goTab('orders'); });
  el.btnEdit.addEventListener('click', function () {
    editMode = !editMode; document.body.classList.toggle('edit', editMode);
    el.btnEdit.classList.toggle('on', editMode);
    toast(editMode ? '编辑模式：点版块=编辑，右下角+可新增' : '已退出编辑模式');
    render();
  });
  $$('.tab').forEach(function (b) { b.addEventListener('click', function () { goTab(b.getAttribute('data-go')); }); });

  CDB.subscribe(function () { updateCartBar(); });
  render();
})();

/* ========== 过程资产模块视图 · views-assets.js ========== */
/* 包含：开发规范 / 文档模板 / 设计规范 / 评审 Checklist 的列表与 CRUD */

/* ---------- 过程资产模块的临时筛选/搜索状态变量 ---------- */
let __subSpecCat = "";   // 开发规范 - 当前分类筛选
let __subSpecKw = "";    // 开发规范 - 当前关键词
let __subTplCat = "";    // 文档模板 - 当前分类筛选
let __subTplType = "";   // 文档模板 - 当前文件类型筛选
let __subTplKw = "";     // 文档模板 - 当前关键词
let __subDesignCat = ""; // 设计规范 - 当前分类筛选
let __subDesignKw = "";  // 设计规范 - 当前关键词
let __subCheckCat = "";  // 评审Checklist - 当前分类筛选
let __subCheckKw = "";   // 评审Checklist - 当前关键词

/**
 * 生成带实时预览的 Markdown 编辑器 HTML
 * @param {string} inputId - textarea 的 id
 * @param {string} previewId - 预览区的 id
 * @param {string} value - 初始值
 * @param {string} placeholder - textarea 占位提示
 * @param {number} rows - textarea 行数
 */
function _mdEditor(inputId, previewId, value, placeholder, rows) {
  const esc = _escape(value || "");
  return `<div class="md-editor-wrap">
    <textarea id="${inputId}" class="ipt md-editor-input" rows="${rows || 10}"
      placeholder="${placeholder || '支持 Markdown 语法'}"
      oninput="_refreshMdPreview('${inputId}', '${previewId}')">${esc}</textarea>
    <div id="${previewId}" class="md-editor-preview">
      ${esc ? _renderMd(value || "") : '<div class="md-editor-empty">预览区 · 开始输入后自动渲染</div>'}
    </div>
  </div>`;
}

/** 根据 textarea 值实时刷新右侧 Markdown 预览 */
function _refreshMdPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  const val = input.value;
  preview.innerHTML = val
    ? _renderMd(val)
    : '<div class="md-editor-empty">预览区 · 开始输入后自动渲染</div>';
}

/* ---------- 开发规范 ---------- */

function renderSubSpec() {
  const list = (ASSET_SPECS || []).slice().sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  const cats = ["全部"].concat(getAssetSpecCategories());
  const activeCat = __subSpecCat || "全部";
  const kw = (__subSpecKw || "").trim().toLowerCase();
  const filtered = list.filter((x) => {
    const catOk = activeCat === "全部" || x.category === activeCat;
    if (!catOk) return false;
    if (!kw) return true;
    return (
      x.title.toLowerCase().includes(kw) ||
      (x.desc || "").toLowerCase().includes(kw) ||
      (x.tags || []).some((t) => t.toLowerCase().includes(kw))
    );
  });

  // 业务级 action 权限判断（仅用来控制按钮/功能显隐，不控制页面可见性）
  const canAdd = window.currentCanAction ? window.currentCanAction("asset", "sub-spec", "add") : true;
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-spec", "edit") : true;
  const canDel = window.currentCanAction ? window.currentCanAction("asset", "sub-spec", "delete") : true;
  const canExport = window.currentCanAction ? window.currentCanAction("asset", "sub-spec", "export") : true;

  // 卡片内编辑/删除操作（无权限时隐藏）
  const _cardActions = (id) => {
    const btns = [];
    if (canEdit) btns.push(btn("编辑", "ghost sm", `openEditAssetSpec('${id}')`));
    if (canDel) btns.push(btn("删除", "danger sm", `delAssetSpec('${id}')`));
    if (btns.length === 0) return "";
    return `<div class="asset-card-actions" onclick="event.stopPropagation()">${btns.join("")}</div>`;
  };

  const cardTpl = filtered.length === 0
    ? `<div class="empty-zone">${canAdd ? "暂无开发规范，点击右上角「+ 新增」创建" : "暂无开发规范"}</div>`
    : filtered.map((x) => `
        <div class="asset-card" onclick="openAssetSpecDetail('${x.id}')">
          <div class="asset-card-header">
            <span class="asset-card-cat">${_escape(x.category)}</span>
            <span class="asset-card-ver">${_escape(x.version || "")}</span>
          </div>
          <div class="asset-card-title">${_escape(x.title)}</div>
          <div class="asset-card-desc">${_escape(x.desc || "")}</div>
          <div class="asset-card-tags">
            ${(x.tags || []).map((t) => `<span class="asset-tag">${_escape(t)}</span>`).join("")}
          </div>
          <div class="asset-card-footer">
            <span>更新 ${_date(x.updatedAt)}</span>
            ${_cardActions(x.id)}
          </div>
        </div>`).join("");

  const filterHtml = filterGroup([
    {
      label: "分类",
      html: cats
        .map(
          (c) =>
            `<span class="ftag ${
              c === activeCat ? "active" : ""
            }" onclick="__subSpecCat = '${c}'; replaceView()">${c}</span>`
        )
        .join(""),
    },
  ]);

  // toolbar 右侧按钮：仅显示有权限的操作
  const toolbarBtns = [];
  if (canAdd) toolbarBtns.push(btn("+ 新增规范", "sm", "openAddAssetSpec()"));
  if (canExport) toolbarBtns.push(btn("↻ 恢复默认", "gray sm", "resetAllAssetSpecs()"));

  return `
    ${pageHeader(PAGES["sub-spec"].title, PAGES["sub-spec"].desc)}
    ${toolbar(
      `共 ${list.length} 条规范 · 筛选后 ${filtered.length} 条`,
      toolbarBtns.join("")
    )}
    <div class="asset-search-bar">
      ${filterHtml}
      <div class="asset-search-wrap">
        <input class="asset-search" placeholder="搜索标题、描述、标签..." value="${_escape(__subSpecKw || "")}"
          oninput="__subSpecKw = this.value; replaceView()" />
      </div>
    </div>
    <div class="asset-grid">${cardTpl}</div>
  `;
}

/* ---------- 开发规范：查看详情弹窗 ---------- */
function openAssetSpecDetail(id) {
  const item = findAssetSpec(id);
  if (!item) { toast("规范不存在"); return; }
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-spec", "edit") : true;
  const canExport = window.currentCanAction ? window.currentCanAction("asset", "sub-spec", "export") : true;
  const meta = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;padding:10px 14px;background:#f6f8fa;border-radius:6px;font-size:13px;color:#555;">
      <span class="asset-card-cat">${_escape(item.category)}</span>
      ${item.version ? `<span class="asset-card-ver">${_escape(item.version)}</span>` : ""}
      <span>创建 ${_date(item.createdAt)}</span>
      <span>更新 ${_date(item.updatedAt)}</span>
    </div>`;
  const body = meta + `<div>${_renderMd(item.content || "")}</div>`;
  const footer = `
    <button class="btn ghost" onclick="closeModal()">关闭</button>
    ${canEdit ? `<button class="btn" onclick="closeModal();openEditAssetSpec('${item.id}')">编辑</button>` : ""}
    ${canExport ? `<button class="btn gray" onclick="downloadAssetSpec('${item.id}')">下载</button>` : ""}`;
  openModal(modalContent("📖 " + _escape(item.title), body, footer), "800px");
}
/* ---------- 文档模板 ---------- */

function renderSubTpl() {
  const canAdd = window.currentCanAction ? window.currentCanAction("asset", "sub-tpl", "add") : true;
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-tpl", "edit") : true;
  const canDel = window.currentCanAction ? window.currentCanAction("asset", "sub-tpl", "delete") : true;
  const list = (ASSET_TPLS || []).slice().sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  const cats = ["全部"].concat(getAssetTplCategories());
  const types = ["全部", "Markdown", "Word", "Excel", "其他"];
  const activeCat = __subTplCat || "全部";
  const activeType = __subTplType || "全部";
  const kw = (__subTplKw || "").trim().toLowerCase();
  const filtered = list.filter((x) => {
    if (activeCat !== "全部" && x.category !== activeCat) return false;
    if (activeType !== "全部" && x.fileType !== activeType) return false;
    if (!kw) return true;
    return (
      x.title.toLowerCase().includes(kw) ||
      (x.desc || "").toLowerCase().includes(kw)
    );
  });

  const cardTpl = filtered.length === 0
    ? `<div class="empty-zone">${canAdd ? "暂无模板，点击右上角「+ 新增」创建" : "暂无模板"}</div>`
    : filtered.map((x) => `
        <div class="asset-card" onclick="openAssetTplDetail('${x.id}')">
          <div class="asset-card-header">
            <span class="asset-card-cat">${_escape(x.category)}</span>
            <span class="asset-card-ver">📄 ${_escape(x.fileType || "")}</span>
          </div>
          <div class="asset-card-title">${_escape(x.title)}</div>
          <div class="asset-card-desc">${_escape(x.desc || "")}</div>
          <div class="asset-card-footer">
            <span>更新 ${_date(x.updatedAt)}</span>
            <div class="asset-card-actions" onclick="event.stopPropagation()">
              ${canEdit ? btn("编辑", "ghost sm", `openEditAssetTpl('${x.id}')`) : ""}
              ${canDel ? btn("删除", "danger sm", `delAssetTpl('${x.id}')`) : ""}
            </div>
          </div>
        </div>`).join("");

  const filterHtml = filterGroup([
    {
      label: "分类",
      html: cats
        .map(
          (c) =>
            `<span class="ftag ${
              c === activeCat ? "active" : ""
            }" onclick="__subTplCat = '${c}'; replaceView()">${c}</span>`
        )
        .join(""),
    },
    {
      label: "格式",
      html: types
        .map(
          (t) =>
            `<span class="ftag ${
              t === activeType ? "active" : ""
            }" onclick="__subTplType = '${t}'; replaceView()">${t}</span>`
        )
        .join(""),
    },
  ]);

  const toolbarBtns = [];
  if (canAdd) toolbarBtns.push(btn("+ 新增模板", "sm", "openAddAssetTpl()"));
  toolbarBtns.push(btn("↻ 恢复默认", "gray sm", "resetAllAssetTpls()"));

  return `
    ${pageHeader(PAGES["sub-tpl"].title, PAGES["sub-tpl"].desc)}
    ${toolbar(
      `共 ${list.length} 个模板 · 筛选后 ${filtered.length} 个`,
      toolbarBtns.join(" ")
    )}
    <div class="asset-search-bar">
      ${filterHtml}
      <div class="asset-search-wrap">
        <input class="asset-search" placeholder="搜索模板名称或描述..." value="${_escape(__subTplKw || "")}"
          oninput="__subTplKw = this.value; replaceView()" />
      </div>
    </div>
    <div class="asset-grid">${cardTpl}</div>
  `;
}

/* ---------- 文档模板：查看详情弹窗 ---------- */
function openAssetTplDetail(id) {
  const item = findAssetTpl(id);
  if (!item) { toast("模板不存在"); return; }
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-tpl", "edit") : true;
  const canExport = window.currentCanAction ? window.currentCanAction("asset", "sub-tpl", "export") : true;
  const meta = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;padding:10px 14px;background:#f6f8fa;border-radius:6px;font-size:13px;color:#555;">
      <span class="asset-card-cat">${_escape(item.category)}</span>
      <span class="asset-card-ver">📄 ${_escape(item.fileType || "")}</span>
      <span>创建 ${_date(item.createdAt)}</span>
      <span>更新 ${_date(item.updatedAt)}</span>
    </div>`;
  const body = meta + `<pre class="tpl-preview">${_escape(item.content || "")}</pre>`;
  const footer = `
    <button class="btn ghost" onclick="closeModal()">关闭</button>
    ${canEdit ? `<button class="btn" onclick="closeModal();openEditAssetTpl('${item.id}')">编辑</button>` : ""}
    ${canExport ? `<button class="btn gray" onclick="downloadAssetTpl('${item.id}')">下载 JSON</button>` : ""}`;
  openModal(modalContent("📋 " + _escape(item.title), body, footer), "800px");
}
/* ---------- 设计规范 ---------- */

function renderSubDesign() {
  const canAdd = window.currentCanAction ? window.currentCanAction("asset", "sub-design", "add") : true;
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-design", "edit") : true;
  const canDel = window.currentCanAction ? window.currentCanAction("asset", "sub-design", "delete") : true;
  const list = (ASSET_DESIGNS || []).slice().sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  const cats = ["全部"].concat(getAssetDesignCategories());
  const activeCat = __subDesignCat || "全部";
  const kw = (__subDesignKw || "").trim().toLowerCase();
  const filtered = list.filter((x) => {
    if (activeCat !== "全部" && x.category !== activeCat) return false;
    if (!kw) return true;
    return (
      x.title.toLowerCase().includes(kw) ||
      (x.desc || "").toLowerCase().includes(kw)
    );
  });

  const cardTpl = filtered.length === 0
    ? `<div class="empty-zone">${canAdd ? "暂无设计规范，点击右上角「+ 新增」创建" : "暂无设计规范"}</div>`
    : filtered.map((x) => `
        <div class="design-card" onclick="openAssetDesignDetail('${x.id}')">
          <div class="design-card-cover" style="background:${x.coverColor || '#1890ff'}"></div>
          <div class="design-card-body">
            <div class="design-card-header">
              <span class="asset-card-cat">${_escape(x.category)}</span>
              <span class="asset-card-ver">${_escape(x.version || "")}</span>
            </div>
            <div class="design-card-title">${_escape(x.title)}</div>
            <div class="design-card-desc">${_escape(x.desc || "")}</div>
            <div class="asset-card-footer">
              <span>更新 ${_date(x.updatedAt)}</span>
              <div class="asset-card-actions" onclick="event.stopPropagation()">
                ${canEdit ? btn("编辑", "ghost sm", `openEditAssetDesign('${x.id}')`) : ""}
                ${canDel ? btn("删除", "danger sm", `delAssetDesign('${x.id}')`) : ""}
              </div>
            </div>
          </div>
        </div>`).join("");

  const filterHtml = filterGroup([
    {
      label: "分类",
      html: cats
        .map(
          (c) =>
            `<span class="ftag ${
              c === activeCat ? "active" : ""
            }" onclick="__subDesignCat = '${c}'; replaceView()">${c}</span>`
        )
        .join(""),
    },
  ]);

  const toolbarBtns = [];
  if (canAdd) toolbarBtns.push(btn("+ 新增规范", "sm", "openAddAssetDesign()"));
  toolbarBtns.push(btn("↻ 恢复默认", "gray sm", "resetAllAssetDesigns()"));

  return `
    ${pageHeader(PAGES["sub-design"].title, PAGES["sub-design"].desc)}
    ${toolbar(
      `共 ${list.length} 份规范 · 筛选后 ${filtered.length} 份`,
      toolbarBtns.join(" ")
    )}
    <div class="asset-search-bar">
      ${filterHtml}
      <div class="asset-search-wrap">
        <input class="asset-search" placeholder="搜索设计规范名称..." value="${_escape(__subDesignKw || "")}"
          oninput="__subDesignKw = this.value; replaceView()" />
      </div>
    </div>
    <div class="design-grid">${cardTpl}</div>
  `;
}

/* ---------- 设计规范：查看详情弹窗 ---------- */
function openAssetDesignDetail(id) {
  const item = findAssetDesign(id);
  if (!item) { toast("规范不存在"); return; }
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-design", "edit") : true;
  const canExport = window.currentCanAction ? window.currentCanAction("asset", "sub-design", "export") : true;
  const meta = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;padding:10px 14px;background:#f6f8fa;border-radius:6px;font-size:13px;color:#555;">
      <span class="asset-card-cat">${_escape(item.category)}</span>
      ${item.version ? `<span class="asset-card-ver">${_escape(item.version)}</span>` : ""}
      <span class="cover-color-dot" style="background:${item.coverColor || '#1890ff'}"></span>
      <span>创建 ${_date(item.createdAt)}</span>
      <span>更新 ${_date(item.updatedAt)}</span>
    </div>`;
  const body = meta + `<div>${_renderMd(item.content || "")}</div>`;
  const footer = `
    <button class="btn ghost" onclick="closeModal()">关闭</button>
    ${canEdit ? `<button class="btn" onclick="closeModal();openEditAssetDesign('${item.id}')">编辑</button>` : ""}
    ${canExport ? `<button class="btn gray" onclick="downloadAssetDesign('${item.id}')">下载</button>` : ""}`;
  openModal(modalContent("🎨 " + _escape(item.title), body, footer), "800px");
}
/* ---------- 评审 Checklist ---------- */

function renderSubCheck() {
  const canAdd = window.currentCanAction ? window.currentCanAction("asset", "sub-check", "add") : true;
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-check", "edit") : true;
  const canDel = window.currentCanAction ? window.currentCanAction("asset", "sub-check", "delete") : true;
  const list = (ASSET_CHECKS || []).slice().sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  const cats = ["全部"].concat(getAssetCheckCategories());
  const activeCat = __subCheckCat || "全部";
  const kw = (__subCheckKw || "").trim().toLowerCase();
  const filtered = list.filter((x) => {
    if (activeCat !== "全部" && x.category !== activeCat) return false;
    if (!kw) return true;
    return (
      x.title.toLowerCase().includes(kw) ||
      (x.desc || "").toLowerCase().includes(kw)
    );
  });

  const cardTpl = filtered.length === 0
    ? `<div class="empty-zone">${canAdd ? "暂无 Checklist，点击右上角「+ 新增」创建" : "暂无 Checklist"}</div>`
    : filtered.map((x) => {
        const total = (x.items || []).length;
        const done = (x.items || []).filter((i) => i.checked).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return `
          <div class="asset-card" onclick="openAssetCheckDetail('${x.id}')">
            <div class="asset-card-header">
              <span class="asset-card-cat">${_escape(x.category)}</span>
              <span class="asset-card-ver">${done}/${total}</span>
            </div>
            <div class="asset-card-title">${_escape(x.title)}</div>
            <div class="asset-card-desc">${_escape(x.desc || "")}</div>
            <div class="check-progress">
              <div class="check-progress-bar" style="width:${pct}%"></div>
            </div>
            <div class="asset-card-footer">
              <span>更新 ${_date(x.updatedAt)}</span>
              <div class="asset-card-actions" onclick="event.stopPropagation()">
                ${canEdit ? btn("编辑", "ghost sm", `openEditAssetCheck('${x.id}')`) : ""}
                ${canDel ? btn("删除", "danger sm", `delAssetCheck('${x.id}')`) : ""}
              </div>
            </div>
          </div>`;
      }).join("");

  const filterHtml = filterGroup([
    {
      label: "分类",
      html: cats
        .map(
          (c) =>
            `<span class="ftag ${
              c === activeCat ? "active" : ""
            }" onclick="__subCheckCat = '${c}'; replaceView()">${c}</span>`
        )
        .join(""),
    },
  ]);

  const toolbarBtns = [];
  if (canAdd) toolbarBtns.push(btn("+ 新增 Checklist", "sm", "openAddAssetCheck()"));
  toolbarBtns.push(btn("↻ 恢复默认", "gray sm", "resetAllAssetChecks()"));

  return `
    ${pageHeader(PAGES["sub-check"].title, PAGES["sub-check"].desc)}
    ${toolbar(
      `共 ${list.length} 份 Checklist · 筛选后 ${filtered.length} 份`,
      toolbarBtns.join(" ")
    )}
    <div class="asset-search-bar">
      ${filterHtml}
      <div class="asset-search-wrap">
        <input class="asset-search" placeholder="搜索 Checklist 名称..." value="${_escape(__subCheckKw || "")}"
          oninput="__subCheckKw = this.value; replaceView()" />
      </div>
    </div>
    <div class="asset-grid">${cardTpl}</div>
  `;
}

/* ---------- 评审 Checklist：查看详情弹窗 ---------- */
function openAssetCheckDetail(id) {
  const item = findAssetCheck(id);
  if (!item) { toast("Checklist 不存在"); return; }
  const canEdit = window.currentCanAction ? window.currentCanAction("asset", "sub-check", "edit") : true;
  const items = item.items || [];
  const done = items.filter((i) => i.checked).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
  const checkListHtml = items
    .map(
      (it, idx) => `
      <label class="check-item ${it.checked ? "checked" : ""}">
        <input type="checkbox" ${it.checked ? "checked" : ""}
          onchange="toggleAssetCheckItem('${id}', ${idx}, this.checked)" />
        <span class="check-item-text">${_escape(it.text)}</span>
      </label>`
    )
    .join("");
  const meta = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;padding:10px 14px;background:#f6f8fa;border-radius:6px;font-size:13px;color:#555;">
      <span class="asset-card-cat">${_escape(item.category)}</span>
      <span>进度 ${done}/${items.length} (${pct}%)</span>
      <span>更新 ${_date(item.updatedAt)}</span>
    </div>`;
  const body = meta + `
    <div class="check-progress-wrap" style="margin-bottom:12px;">
      <div class="check-progress-bar-lg" style="width:${pct}%"></div>
      <span>${pct}%</span>
    </div>
    <div class="check-list" style="max-height:42vh;overflow:auto;">${checkListHtml || '<div class="empty-zone">暂无条目</div>'}</div>`;
  const footer = `
    <button class="btn ghost" onclick="closeModal()">关闭</button>
    ${canEdit ? `<button class="btn" onclick="closeModal();openEditAssetCheck('${item.id}')">编辑条目</button>` : ""}
    ${canEdit ? `<button class="btn gray" onclick="resetAssetCheckItems('${item.id}');openAssetCheckDetail('${item.id}')">重置勾选</button>` : ""}`;
  openModal(modalContent("✅ " + _escape(item.title), body, footer), "800px");
}
/* ---------- Checklist 条目勾选（实时保存） ---------- */

function toggleAssetCheckItem(id, idx, checked) {
  const item = findAssetCheck(id);
  if (!item) return;
  if (!item.items[idx]) return;
  item.items[idx].checked = !!checked;
  updateAssetCheck(id, { items: item.items });
  // 不重新渲染整个页面（避免打断勾选），但更新进度条
  const done = item.items.filter((i) => i.checked).length;
  const pct = item.items.length > 0 ? Math.round((done / item.items.length) * 100) : 0;
  document.querySelectorAll(".check-progress-bar-lg").forEach((el) => (el.style.width = pct + "%"));
  document.querySelectorAll(".check-progress-wrap span").forEach((el) => (el.textContent = pct + "%"));
}

function resetAssetCheckItems(id) {
  const item = findAssetCheck(id);
  if (!item) return;
  updateAssetCheck(id, { items: item.items.map((i) => ({ ...i, checked: false })) });
  toast("已重置全部勾选项");
  replaceView();
}

/* ---------- 开发规范 CRUD ---------- */

function openAddAssetSpec() {
  // 业务级权限守卫：仅允许有 add action 的角色打开新增弹窗
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "add")) {
    toast("您没有新增开发规范的权限，请联系管理员");
    return;
  }
  openModal(
    modalContent(
      "新增开发规范",
      `<div class="fm">
        ${formRow("标题", `<input id="as_title" class="ipt" placeholder="如：TypeScript 类型规范" />`, true)}
        ${formRow("分类", `<select id="as_cat" class="ipt">
          <option>编码规范</option><option>命名规范</option><option>注释规范</option><option>Git规范</option><option>提交规范</option><option>安全规范</option><option>其他</option>
        </select>`)}
        ${formRow("版本号", `<input id="as_ver" class="ipt" value="v1.0" />`)}
        ${formRow("标签", `<input id="as_tags" class="ipt" placeholder="英文逗号分隔，如：JS, 前端" />`)}
        ${formRow("描述", `<textarea id="as_desc" class="ipt" rows="2" placeholder="简短描述该规范的范围和目的"></textarea>`)}
        ${formRow("正文 (Markdown)", _mdEditor("as_content", "as_preview", "", "支持 Markdown：## 标题、- 列表、`代码`、**加粗** 等", 12))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", "submitAddAssetSpec()")}`
    )
  , "960px"
  );
}
function submitAddAssetSpec() {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "add")) {
    toast("您没有新增开发规范的权限");
    closeModal();
    return;
  }
  const title = document.getElementById("as_title").value.trim();
  if (!title) { toast("请填写标题"); return; }
  const tagsRaw = document.getElementById("as_tags").value.trim();
  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [];
  const item = addAssetSpec({
    title,
    category: document.getElementById("as_cat").value,
    version: document.getElementById("as_ver").value.trim() || "v1.0",
    desc: document.getElementById("as_desc").value.trim(),
    content: document.getElementById("as_content").value,
    tags,
  });
  closeModal();
  toast("已新增规范：" + item.title);
  replaceView();
}

function openEditAssetSpec(id) {
  // 业务级权限守卫：仅允许有 edit action 的角色打开编辑弹窗
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "edit")) {
    toast("您没有编辑开发规范的权限，请联系管理员");
    return;
  }
  const item = findAssetSpec(id);
  if (!item) return;
  openModal(
    modalContent(
      "编辑开发规范",
      `<div class="fm">
        ${formRow("标题", `<input id="es_title" class="ipt" value="${_escape(item.title)}" />`, true)}
        ${formRow("分类", `<select id="es_cat" class="ipt">
          ${["编码规范","命名规范","注释规范","Git规范","提交规范","安全规范","其他"].map(c => `<option ${c===item.category?'selected':''}>${c}</option>`).join("")}
        </select>`)}
        ${formRow("版本号", `<input id="es_ver" class="ipt" value="${_escape(item.version || '')}" />`)}
        ${formRow("标签", `<input id="es_tags" class="ipt" value="${_escape((item.tags||[]).join(', '))}" />`)}
        ${formRow("描述", `<textarea id="es_desc" class="ipt" rows="2">${_escape(item.desc || '')}</textarea>`)}
        ${formRow("正文 (Markdown)", _mdEditor("es_content", "es_preview", item.content, "", 12))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", `submitEditAssetSpec('${id}')`)}`
    )
  , "960px"
  );
}
function submitEditAssetSpec(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "edit")) {
    toast("您没有编辑开发规范的权限");
    closeModal();
    return;
  }
  const tagsRaw = document.getElementById("es_tags").value.trim();
  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [];
  updateAssetSpec(id, {
    title: document.getElementById("es_title").value.trim(),
    category: document.getElementById("es_cat").value,
    version: document.getElementById("es_ver").value.trim(),
    desc: document.getElementById("es_desc").value.trim(),
    content: document.getElementById("es_content").value,
    tags,
  });
  closeModal();
  toast("已保存");
  replaceView();
}

function delAssetSpec(id) {
  // 业务级权限守卫：仅允许有 delete action 的角色触发删除
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "delete")) {
    toast("您没有删除开发规范的权限，请联系管理员");
    return;
  }
  const item = findAssetSpec(id);
  if (!item) return;
  openModal(
    modalContent(
      "确认删除",
      `<p>确定删除规范 <strong>${_escape(item.title)}</strong> 吗？此操作不可撤销。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDelAssetSpec('${id}')`)}`
    )
  );
}
function doDelAssetSpec(id) {
  // 业务级权限守卫（防止弹窗被跳过直接调 console）
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "delete")) {
    closeModal();
    toast("您没有删除开发规范的权限");
    return;
  }
  deleteAssetSpec(id);
  closeModal();
  toast("已删除");
  replaceView();
}
function resetAllAssetSpecs() {
  // 业务级权限守卫：恢复默认属于破坏性操作，需要 delete 或 export 权限
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-spec", "export")) {
    toast("您没有恢复默认的权限，请联系管理员");
    return;
  }
  openModal(
    modalContent(
      "恢复默认",
      `<p>将清空所有自定义开发规范，恢复为系统默认的 5 条示例数据。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认恢复", "danger", "doResetAllAssetSpecs()")}`
    )
  );
}
function doResetAllAssetSpecs() {
  resetAssetSpecs();
  closeModal();
  toast("已恢复默认");
  replaceView();
}
function downloadAssetSpec(id) {
  const item = findAssetSpec(id);
  if (!item) return;
  _downloadJson(`${item.title}_${_date(item.updatedAt)}.json`, item);
  toast("已下载");
}

/* ---------- 文档模板 CRUD ---------- */

function openAddAssetTpl() {
  openModal(
    modalContent(
      "新增文档模板",
      `<div class="fm">
        ${formRow("标题", `<input id="at_title" class="ipt" placeholder="如：接口文档模板" />`, true)}
        ${formRow("分类", `<select id="at_cat" class="ipt">
          <option>产品</option><option>研发</option><option>测试</option><option>运维</option><option>管理</option><option>其他</option>
        </select>`)}
        ${formRow("文件格式", `<select id="at_type" class="ipt">
          <option>Markdown</option><option>Word</option><option>Excel</option><option>其他</option>
        </select>`)}
        ${formRow("描述", `<textarea id="at_desc" class="ipt" rows="2" placeholder="模板用途说明"></textarea>`)}
        ${formRow("模板正文", _mdEditor("at_content", "at_preview", "", "模板正文内容，支持 Markdown", 12))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", "submitAddAssetTpl()")}`
    )
  , "960px"
  );
}
function submitAddAssetTpl() {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-tpl", "add")) {
    toast("您没有新增模板的权限");
    closeModal();
    return;
  }
  const title = document.getElementById("at_title").value.trim();
  if (!title) { toast("请填写标题"); return; }
  const item = addAssetTpl({
    title,
    category: document.getElementById("at_cat").value,
    fileType: document.getElementById("at_type").value,
    desc: document.getElementById("at_desc").value.trim(),
    content: document.getElementById("at_content").value,
  });
  closeModal();
  toast("已新增模板：" + item.title);
  replaceView();
}

function openEditAssetTpl(id) {
  const item = findAssetTpl(id);
  if (!item) return;
  openModal(
    modalContent(
      "编辑文档模板",
      `<div class="fm">
        ${formRow("标题", `<input id="et_title" class="ipt" value="${_escape(item.title)}" />`, true)}
        ${formRow("分类", `<select id="et_cat" class="ipt">
          ${["产品","研发","测试","运维","管理","其他"].map(c => `<option ${c===item.category?'selected':''}>${c}</option>`).join("")}
        </select>`)}
        ${formRow("文件格式", `<select id="et_type" class="ipt">
          ${["Markdown","Word","Excel","其他"].map(t => `<option ${t===item.fileType?'selected':''}>${t}</option>`).join("")}
        </select>`)}
        ${formRow("描述", `<textarea id="et_desc" class="ipt" rows="2">${_escape(item.desc || '')}</textarea>`)}
        ${formRow("模板正文", _mdEditor("et_content", "et_preview", item.content, "", 12))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", `submitEditAssetTpl('${id}')`)}`
    )
  , "960px"
  );
}
function submitEditAssetTpl(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-tpl", "edit")) {
    toast("您没有编辑模板的权限");
    closeModal();
    return;
  }
  updateAssetTpl(id, {
    title: document.getElementById("et_title").value.trim(),
    category: document.getElementById("et_cat").value,
    fileType: document.getElementById("et_type").value,
    desc: document.getElementById("et_desc").value.trim(),
    content: document.getElementById("et_content").value,
  });
  closeModal();
  toast("已保存");
  replaceView();
}

function delAssetTpl(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-tpl", "delete")) {
    toast("您没有删除模板的权限，请联系管理员");
    return;
  }
  const item = findAssetTpl(id);
  if (!item) return;
  openModal(
    modalContent(
      "确认删除",
      `<p>确定删除模板 <strong>${_escape(item.title)}</strong> 吗？此操作不可撤销。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDelAssetTpl('${id}')`)}`
    )
  );
}
function doDelAssetTpl(id) {
  deleteAssetTpl(id);
  closeModal();
  toast("已删除");
  replaceView();
}
function resetAllAssetTpls() {
  openModal(
    modalContent(
      "恢复默认",
      `<p>将清空所有自定义模板，恢复为系统默认的 5 条示例数据。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认恢复", "danger", "doResetAllAssetTpls()")}`
    )
  );
}
function doResetAllAssetTpls() {
  resetAssetTpls();
  closeModal();
  toast("已恢复默认");
  replaceView();
}
function downloadAssetTpl(id) {
  const item = findAssetTpl(id);
  if (!item) return;
  _downloadJson(`${item.title}_模板.json`, item);
  toast("已下载");
}

/* ---------- 设计规范 CRUD ---------- */

function openAddAssetDesign() {
  openModal(
    modalContent(
      "新增设计规范",
      `<div class="fm">
        ${formRow("标题", `<input id="ad_title" class="ipt" placeholder="如：按钮组件规范" />`, true)}
        ${formRow("分类", `<select id="ad_cat" class="ipt">
          <option>视觉规范</option><option>组件规范</option><option>交互规范</option><option>布局规范</option><option>其他</option>
        </select>`)}
        ${formRow("版本号", `<input id="ad_ver" class="ipt" value="v1.0" />`)}
        ${formRow("封面颜色", `<input id="ad_color" type="color" value="#1890ff" style="height:32px;padding:0;width:80px;" />`)}
        ${formRow("描述", `<textarea id="ad_desc" class="ipt" rows="2" placeholder="规范的目的和范围"></textarea>`)}
        ${formRow("正文 (Markdown)", _mdEditor("ad_content", "ad_preview", "", "支持 Markdown 语法", 12))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", "submitAddAssetDesign()")}`
    )
  , "960px"
  );
}
function submitAddAssetDesign() {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-design", "add")) {
    toast("您没有新增设计规范的权限");
    closeModal();
    return;
  }
  const title = document.getElementById("ad_title").value.trim();
  if (!title) { toast("请填写标题"); return; }
  const item = addAssetDesign({
    title,
    category: document.getElementById("ad_cat").value,
    version: document.getElementById("ad_ver").value.trim() || "v1.0",
    coverColor: document.getElementById("ad_color").value,
    desc: document.getElementById("ad_desc").value.trim(),
    content: document.getElementById("ad_content").value,
  });
  closeModal();
  toast("已新增设计规范：" + item.title);
  replaceView();
}

function openEditAssetDesign(id) {
  const item = findAssetDesign(id);
  if (!item) return;
  openModal(
    modalContent(
      "编辑设计规范",
      `<div class="fm">
        ${formRow("标题", `<input id="ed_title" class="ipt" value="${_escape(item.title)}" />`, true)}
        ${formRow("分类", `<select id="ed_cat" class="ipt">
          ${["视觉规范","组件规范","交互规范","布局规范","其他"].map(c => `<option ${c===item.category?'selected':''}>${c}</option>`).join("")}
        </select>`)}
        ${formRow("版本号", `<input id="ed_ver" class="ipt" value="${_escape(item.version || '')}" />`)}
        ${formRow("封面颜色", `<input id="ed_color" type="color" value="${item.coverColor || '#1890ff'}" style="height:32px;padding:0;width:80px;" />`)}
        ${formRow("描述", `<textarea id="ed_desc" class="ipt" rows="2">${_escape(item.desc || '')}</textarea>`)}
        ${formRow("正文 (Markdown)", _mdEditor("ed_content", "ed_preview", item.content, "", 12))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", `submitEditAssetDesign('${id}')`)}`
    )
  , "960px"
  );
}
function submitEditAssetDesign(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-design", "edit")) {
    toast("您没有编辑设计规范的权限");
    closeModal();
    return;
  }
  updateAssetDesign(id, {
    title: document.getElementById("ed_title").value.trim(),
    category: document.getElementById("ed_cat").value,
    version: document.getElementById("ed_ver").value.trim(),
    coverColor: document.getElementById("ed_color").value,
    desc: document.getElementById("ed_desc").value.trim(),
    content: document.getElementById("ed_content").value,
  });
  closeModal();
  toast("已保存");
  replaceView();
}

function delAssetDesign(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-design", "delete")) {
    toast("您没有删除设计规范的权限，请联系管理员");
    return;
  }
  const item = findAssetDesign(id);
  if (!item) return;
  openModal(
    modalContent(
      "确认删除",
      `<p>确定删除设计规范 <strong>${_escape(item.title)}</strong> 吗？此操作不可撤销。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDelAssetDesign('${id}')`)}`
    )
  );
}
function doDelAssetDesign(id) {
  deleteAssetDesign(id);
  closeModal();
  toast("已删除");
  replaceView();
}
function resetAllAssetDesigns() {
  openModal(
    modalContent(
      "恢复默认",
      `<p>将清空所有自定义设计规范，恢复为系统默认的 5 条示例数据。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认恢复", "danger", "doResetAllAssetDesigns()")}`
    )
  );
}
function doResetAllAssetDesigns() {
  resetAssetDesigns();
  closeModal();
  toast("已恢复默认");
  replaceView();
}
function downloadAssetDesign(id) {
  const item = findAssetDesign(id);
  if (!item) return;
  _downloadJson(`${item.title}_设计规范.json`, item);
  toast("已下载");
}

/* ---------- 评审 Checklist CRUD ---------- */

function openAddAssetCheck() {
  openModal(
    modalContent(
      "新增评审 Checklist",
      `<div class="fm">
        ${formRow("标题", `<input id="ac_title" class="ipt" placeholder="如：代码评审 Checklist" />`, true)}
        ${formRow("分类", `<select id="ac_cat" class="ipt">
          <option>研发</option><option>测试</option><option>需求</option><option>发布</option><option>设计</option><option>其他</option>
        </select>`)}
        ${formRow("描述", `<textarea id="ac_desc" class="ipt" rows="2" placeholder="Checklist 的使用场景说明"></textarea>`)}
        ${formRow("检查项（Markdown 勾选框语法）", _mdEditor("ac_items", "ac_preview", "", "- [ ] 代码符合编码规范\n- [ ] 变量命名清晰\n- [x] 已有单元测试（默认勾选）", 10))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", "submitAddAssetCheck()")}`
    )
  , "960px"
  );
}
function submitAddAssetCheck() {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-check", "add")) {
    toast("您没有新增 Checklist 的权限");
    closeModal();
    return;
  }
  const title = document.getElementById("ac_title").value.trim();
  if (!title) { toast("请填写标题"); return; }
  const text = document.getElementById("ac_items").value.trim();
  const items = text
    ? text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const m = line.match(/^-\s*\[([xX ])\]\s*(.+)$/);
          if (m) return { text: m[2].trim(), checked: m[1].toLowerCase() === "x" };
          return { text: line, checked: false };
        })
    : [];
  const item = addAssetCheck({
    title,
    category: document.getElementById("ac_cat").value,
    desc: document.getElementById("ac_desc").value.trim(),
    items,
  });
  closeModal();
  toast("已新增 Checklist：" + item.title);
  replaceView();
}

function openEditAssetCheck(id) {
  const item = findAssetCheck(id);
  if (!item) return;
  const itemsText = (item.items || []).map((i) => `- [${i.checked ? "x" : " "}] ${i.text}`).join("\n");
  openModal(
    modalContent(
      "编辑评审 Checklist",
      `<div class="fm">
        ${formRow("标题", `<input id="ec_title" class="ipt" value="${_escape(item.title)}" />`, true)}
        ${formRow("分类", `<select id="ec_cat" class="ipt">
          ${["研发","测试","需求","发布","设计","其他"].map(c => `<option ${c===item.category?'selected':''}>${c}</option>`).join("")}
        </select>`)}
        ${formRow("描述", `<textarea id="ec_desc" class="ipt" rows="2">${_escape(item.desc || '')}</textarea>`)}
        ${formRow("检查项（Markdown 勾选框语法）", _mdEditor("ec_items", "ec_preview", itemsText, "", 10))}
      </div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", `submitEditAssetCheck('${id}')`)}`
    )
  , "960px"
  );
}
function submitEditAssetCheck(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-check", "edit")) {
    toast("您没有编辑 Checklist 的权限");
    closeModal();
    return;
  }
  const text = document.getElementById("ec_items").value.trim();
  const items = text
    ? text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const m = line.match(/^-\s*\[([xX ])\]\s*(.+)$/);
          if (m) return { text: m[2].trim(), checked: m[1].toLowerCase() === "x" };
          return { text: line, checked: false };
        })
    : [];
  updateAssetCheck(id, {
    title: document.getElementById("ec_title").value.trim(),
    category: document.getElementById("ec_cat").value,
    desc: document.getElementById("ec_desc").value.trim(),
    items,
  });
  closeModal();
  toast("已保存");
  replaceView();
}

function delAssetCheck(id) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("asset", "sub-check", "delete")) {
    toast("您没有删除 Checklist 的权限，请联系管理员");
    return;
  }
  const item = findAssetCheck(id);
  if (!item) return;
  openModal(
    modalContent(
      "确认删除",
      `<p>确定删除 Checklist <strong>${_escape(item.title)}</strong> 吗？此操作不可撤销。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDelAssetCheck('${id}')`)}`
    )
  );
}
function doDelAssetCheck(id) {
  deleteAssetCheck(id);
  closeModal();
  toast("已删除");
  replaceView();
}
function resetAllAssetChecks() {
  openModal(
    modalContent(
      "恢复默认",
      `<p>将清空所有自定义 Checklist，恢复为系统默认的 4 条示例数据。</p>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认恢复", "danger", "doResetAllAssetChecks()")}`
    )
  );
}
function doResetAllAssetChecks() {
  resetAssetChecks();
  closeModal();
  toast("已恢复默认");
  replaceView();
}


/* ---------- 过程资产 VIEWS 填充 ---------- */
VIEWS["sub-spec"] = renderSubSpec;
VIEWS["sub-tpl"] = renderSubTpl;
VIEWS["sub-design"] = renderSubDesign;
VIEWS["sub-check"] = renderSubCheck;


/* ---------- 过程资产 window 挂载 ---------- */
window.openAddAssetSpec = openAddAssetSpec;
window.submitAddAssetSpec = submitAddAssetSpec;
window.openEditAssetSpec = openEditAssetSpec;
window.submitEditAssetSpec = submitEditAssetSpec;
window.delAssetSpec = delAssetSpec;
window.doDelAssetSpec = doDelAssetSpec;
window.resetAllAssetSpecs = resetAllAssetSpecs;
window.doResetAllAssetSpecs = doResetAllAssetSpecs;
window.downloadAssetSpec = downloadAssetSpec;
window.openAssetSpecDetail = openAssetSpecDetail;

/* 过程资产模块 — 文档模板 */
window.openAddAssetTpl = openAddAssetTpl;
window.submitAddAssetTpl = submitAddAssetTpl;
window.openEditAssetTpl = openEditAssetTpl;
window.submitEditAssetTpl = submitEditAssetTpl;
window.delAssetTpl = delAssetTpl;
window.doDelAssetTpl = doDelAssetTpl;
window.resetAllAssetTpls = resetAllAssetTpls;
window.doResetAllAssetTpls = doResetAllAssetTpls;
window.downloadAssetTpl = downloadAssetTpl;
window.openAssetTplDetail = openAssetTplDetail;

/* 过程资产模块 — 设计规范 */
window.openAddAssetDesign = openAddAssetDesign;
window.submitAddAssetDesign = submitAddAssetDesign;
window.openEditAssetDesign = openEditAssetDesign;
window.submitEditAssetDesign = submitEditAssetDesign;
window.delAssetDesign = delAssetDesign;
window.doDelAssetDesign = doDelAssetDesign;
window.resetAllAssetDesigns = resetAllAssetDesigns;
window.doResetAllAssetDesigns = doResetAllAssetDesigns;
window.downloadAssetDesign = downloadAssetDesign;
window.openAssetDesignDetail = openAssetDesignDetail;

/* 过程资产模块 — 评审 Checklist */
window.toggleAssetCheckItem = toggleAssetCheckItem;
window.openAssetCheckDetail = openAssetCheckDetail;
window.resetAssetCheckItems = resetAssetCheckItems;
window.openAddAssetCheck = openAddAssetCheck;
window.submitAddAssetCheck = submitAddAssetCheck;
window.openEditAssetCheck = openEditAssetCheck;
window.submitEditAssetCheck = submitEditAssetCheck;
window.delAssetCheck = delAssetCheck;
window.doDelAssetCheck = doDelAssetCheck;
window.resetAllAssetChecks = resetAllAssetChecks;
window.doResetAllAssetChecks = doResetAllAssetChecks;
/* ========== OA 门户 · 工作台组件 · views-portal.js ==========
 * 包含：
 *   ① 全局搜索（顶部搜索框 → 独立搜索页 → 点击弹窗查看详情）
 *      搜索范围：研发公共（标准库 / 经验案例库）+ 过程资产（开发规范 / 文档模板 / 设计规范 / 评审 Checklist）
 *   ② 通知公告面板（工作台右侧，数据来自 config-notices.js）
 *   ③ 我的常用应用（工作台磁贴行，按账号持久化）
 * 路由状态 __searchQuery / __searchSrc 定义在 router.js（属路由状态，随路由持久化）
 * 本文件必须在 router.js 之后加载（openSearch 等会操作路由状态）
 */

/* ---------- 搜索数据源定义 ---------- */
const SEARCH_SOURCES = {
  std:    { label: "标准库",          icon: "📚", mod: "dev",   color: "#52c41a", enter: "selectModule('dev');selectSub('stdHome')" },
  ec:     { label: "经验案例库",      icon: "💡", mod: "dev",   color: "#13c2c2", enter: "selectModule('dev');selectSub('ec')" },
  spec:   { label: "开发规范",        icon: "📐", mod: "asset", color: "#1677ff", enter: "selectModule('asset');selectSub('sub-spec')" },
  tpl:    { label: "文档模板",        icon: "📄", mod: "asset", color: "#722ed1", enter: "selectModule('asset');selectSub('sub-tpl')" },
  design: { label: "设计规范",        icon: "🎨", mod: "asset", color: "#eb2f96", enter: "selectModule('asset');selectSub('sub-design')" },
  check:  { label: "评审 Checklist",  icon: "✅", mod: "asset", color: "#fa8c16", enter: "selectModule('asset');selectSub('sub-check')" },
};

/** 搜索结果缓存（渲染搜索页时重建，详情弹窗按索引取用） */
let __searchResults = [];

/** 安全读取全局数据数组
 *  注意：各 config 模块的数据均为顶层 let 声明（全局词法环境），
 *  「window.X = X」的文件尾挂载捕获的是加载时的 null，不会随后续 load 刷新
 *  （EC_CASES / STANDARDS 等存量代码均如此），因此必须读词法绑定本身。
 */
function _portalData(key) {
  switch (key) {
    case "std": return typeof STANDARDS !== "undefined" ? STANDARDS : [];
    case "ec": return typeof EC_CASES !== "undefined" ? EC_CASES : [];
    case "spec": return typeof ASSET_SPECS !== "undefined" ? ASSET_SPECS : [];
    case "tpl": return typeof ASSET_TPLS !== "undefined" ? ASSET_TPLS : [];
    case "design": return typeof ASSET_DESIGNS !== "undefined" ? ASSET_DESIGNS : [];
    case "check": return typeof ASSET_CHECKS !== "undefined" ? ASSET_CHECKS : [];
    default: return [];
  }
}

/* ---------- 工具：截取命中关键词上下文的摘要 ---------- */
function _searchSnippet(text, q) {
  const s = String(text == null ? "" : text).replace(/\s+/g, " ");
  const i = s.toLowerCase().indexOf(q);
  if (i < 0) return "";
  const start = Math.max(0, i - 36);
  const end = Math.min(s.length, i + q.length + 64);
  return (start > 0 ? "…" : "") + s.slice(start, end) + (end < s.length ? "…" : "");
}

/** 工具：关键词高亮（先转义再包 <mark>） */
function _searchHl(text, q) {
  const s = _escape(text == null ? "" : text);
  if (!q) return s;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return s.replace(new RegExp("(" + esc + ")", "gi"), '<mark class="search-mark">$1</mark>');
  } catch (e) {
    return s;
  }
}

/** 工具：受权限过滤的数据源是否可见 */
function _searchSrcAllowed(srcKey) {
  const meta = SEARCH_SOURCES[srcKey];
  return !!meta && canAccessModule(meta.mod);
}

/* ---------- 搜索：收集全部命中结果 ---------- */
function _searchCollect(q) {
  const kw = String(q || "").trim().toLowerCase();
  const out = [];
  if (!kw) return out;
  const hit = (...fields) => fields.some((f) => String(f == null ? "" : f).toLowerCase().indexOf(kw) >= 0);

  /* ① 标准库 */
  if (_searchSrcAllowed("std")) {
    _portalData("std").forEach((s) => {
      if (!hit(s.stdNo, s.nameCn, s.nameEn, s.domain, s.org, s.drafter, s.body)) return;
      const snip = _searchSnippet(s.body, kw) || _searchSnippet(s.domain, kw);
      out.push({
        src: "std", id: s.id, icon: "📚", color: SEARCH_SOURCES.std.color,
        title: `${s.stdNo} ${s.nameCn}`,
        meta: `${s.level || ""}${s.nature ? " / " + s.nature : ""} · ${s.status === "current" ? "现行" : s.status === "obsolete" ? "已作废" : s.status} · 实施 ${s.implDate || "-"}`,
        snippet: snip,
      });
    });
  }

  /* ② 经验案例库 */
  if (_searchSrcAllowed("ec")) {
    _portalData("ec").forEach((c) => {
      if (!hit(c.title, (c.keywords || []).join(" "), c.productName, c.shareName, c.shareDept, c.problemDesc, c.rootCause, c.solution, c.summary)) return;
      const snip = _searchSnippet(c.problemDesc, kw) || _searchSnippet(c.rootCause, kw) || _searchSnippet(c.summary, kw);
      out.push({
        src: "ec", id: c.id, icon: "💡", color: SEARCH_SOURCES.ec.color,
        title: c.title,
        meta: `${c.shareName || ""} · ${c.category || ""} · ${c.source || ""}`,
        snippet: snip,
      });
    });
  }

  /* ③ 过程资产：开发规范 / 文档模板 / 设计规范 / 评审 Checklist */
  const assetDefs = [
    { key: "spec",   arr: _portalData("spec"),   fields: (x) => [x.title, x.category, x.desc, (x.tags || []).join(" "), x.content], snip: (x) => _searchSnippet(x.desc, kw) || _searchSnippet(x.content, kw), meta: (x) => `${x.category || ""}${x.version ? " · " + x.version : ""}` },
    { key: "tpl",    arr: _portalData("tpl"),    fields: (x) => [x.title, x.category, x.desc, x.content], snip: (x) => _searchSnippet(x.desc, kw) || _searchSnippet(x.content, kw), meta: (x) => `${x.category || ""}${x.fileType ? " · " + x.fileType : ""}` },
    { key: "design", arr: _portalData("design"), fields: (x) => [x.title, x.category, x.desc, x.content], snip: (x) => _searchSnippet(x.desc, kw) || _searchSnippet(x.content, kw), meta: (x) => `${x.category || ""}${x.version ? " · " + x.version : ""}` },
    { key: "check",  arr: _portalData("check"),  fields: (x) => [x.title, x.category, x.desc, (x.items || []).map((i) => i.text).join(" ")], snip: (x) => _searchSnippet(x.desc, kw) || _searchSnippet((x.items || []).map((i) => i.text).join("；"), kw), meta: (x) => `${x.category || ""} · ${(x.items || []).length} 个检查项` },
  ];
  assetDefs.forEach((def) => {
    if (!_searchSrcAllowed(def.key) || !def.arr) return;
    def.arr.forEach((x) => {
      if (!hit.apply(null, def.fields(x))) return;
      out.push({
        src: def.key, id: x.id, icon: SEARCH_SOURCES[def.key].icon, color: SEARCH_SOURCES[def.key].color,
        title: x.title, meta: def.meta(x), snippet: def.snip(x),
      });
    });
  });

  return out;
}

/* ---------- 搜索：执行搜索（header 输入框入口） ---------- */
function openSearch(q) {
  const kw = String(q == null ? "" : q).trim();
  if (!kw) {
    window.toast("请输入搜索关键词");
    return;
  }
  __searchQuery = kw;
  __searchSrc = "";
  if (typeof saveRoute === "function") saveRoute();
  if (typeof window.renderSearchPage === "function") {
    window.renderSearchPage();
  }
}

/** 清除搜索状态，回到来源页 */
function exitSearch() {
  __searchQuery = "";
  __searchSrc = "";
  if (typeof saveRoute === "function") saveRoute();
  if (typeof window.renderCurView === "function") window.renderCurView();
}

/* ---------- 搜索：来源过滤 ---------- */
function filterSearchSrc(src) {
  __searchSrc = src || "";
  if (typeof saveRoute === "function") saveRoute();
  if (typeof window.renderSearchPage === "function") window.renderSearchPage();
}

/* ---------- 搜索：渲染独立搜索页 ---------- */
function renderSearchPage() {
  const q = __searchQuery;
  const all = _searchCollect(q);
  __searchResults = all;
  const list = __searchSrc ? all.filter((r) => r.src === __searchSrc) : all;

  /* 来源筛选 chips（含各来源命中数） */
  const srcCount = {};
  all.forEach((r) => { srcCount[r.src] = (srcCount[r.src] || 0) + 1; });
  const chips = [`<span class="search-chip${__searchSrc ? "" : " on"}" onclick="filterSearchSrc('')">全部 ${all.length}</span>`]
    .concat(Object.keys(SEARCH_SOURCES).filter((k) => srcCount[k]).map((k) =>
      `<span class="search-chip${__searchSrc === k ? " on" : ""}" onclick="filterSearchSrc('${k}')">${SEARCH_SOURCES[k].icon} ${SEARCH_SOURCES[k].label} ${srcCount[k]}</span>`));

  let body;
  if (list.length === 0) {
    body = `<div class="empty" style="margin-top:32px">🔍 未找到与「${_escape(q)}」相关的${__searchSrc ? SEARCH_SOURCES[__searchSrc].label : "内容"}<br><br><span class="muted small">搜索范围：标准库 / 案例库 / 过程资产</span></div>`;
  } else {
    body = `<div class="search-list">${list.map((r) => {
      const idx = all.indexOf(r);
      const srcMeta = SEARCH_SOURCES[r.src];
      return `<div class="search-item" onclick="openSearchDetail(${idx})">
        <div class="search-item-icon" style="background:${r.color}1a;color:${r.color}">${r.icon}</div>
        <div class="search-item-body">
          <div class="search-item-title">${_searchHl(r.title, q)}<span class="tag g" style="margin-left:8px">${srcMeta.label}</span></div>
          <div class="search-item-snippet">${_searchHl(r.snippet, q) || '<span class="muted">（无摘要）</span>'}</div>
          <div class="search-item-meta">${_escape(r.meta || "")}</div>
        </div>
        <div class="search-item-arrow">›</div>
      </div>`;
    }).join("")}</div>`;
  }

  document.getElementById("content").innerHTML = `
    ${pageHeader(PAGES.search.title, PAGES.search.desc.replace("{q}", _escape(q)).replace("{n}", all.length))}
    <div class="search-chips">${chips.join("")}</div>
    ${body}`;
  if (typeof window.renderCrumb === "function") window.renderCrumb();
}

/* ---------- 搜索：结果详情弹窗 ---------- */
function openSearchDetail(idx) {
  const r = __searchResults[idx];
  if (!r) return;
  const srcMeta = SEARCH_SOURCES[r.src];
  const foot = `${btn("关闭", "gray", "closeModal()")} ${btn("进入 " + srcMeta.label, "", `closeModal();${srcMeta.enter}`)}`;
  const body = _searchDetailBody(r);
  openModal(modalContent(`${r.icon} ${r.title}`, body, foot), "720px");
}

/** 按数据类型构建详情弹窗内容 */
function _searchDetailBody(r) {
  if (r.src === "std") {
    const s = _portalData("std").find((x) => x.id === r.id);
    if (!s) return '<div class="empty">数据不存在或已删除</div>';
    const meta = [
      ["标准编号", s.stdNo], ["中文名称", s.nameCn], ["英文名称", s.nameEn || "-"],
      ["发布日期", s.pubDate || "-"], ["实施日期", s.implDate || "-"],
      ["状态", s.status === "current" ? "现行" : s.status === "obsolete" ? "已作废" : s.status],
      ["级别 / 性质", `${s.level || "-"} / ${s.nature || "-"}`],
      ["所属领域", s.domain || "-"], ["归口组织", s.org || "-"],
      ["起草单位", s.drafter || "-"], ["代替标准号", s.supersedes || "-"],
    ];
    const att = (s.attachments || []).map((a) => `<span class="tag g">📎 ${_escape(a.name)}（${_escape(a.size || "")}）</span>`).join(" ");
    return `<div class="search-detail-meta">${meta.map(([k, v]) => metaRow(k, _escape(v))).join("")}</div>
      <div class="search-detail-sec">标准正文</div>
      <div class="md-preview">${_renderMd(s.body)}</div>
      ${att ? `<div class="search-detail-sec">附件</div><div>${att}</div>` : ""}`;
  }
  if (r.src === "ec") {
    const c = _portalData("ec").find((x) => x.id === r.id);
    if (!c) return '<div class="empty">数据不存在或已删除</div>';
    const phases = UI.phases;
    const vals = [c.problemDesc, c.analysis, c.rootCause, c.solution, c.summary];
    const att = (c.attachments || []).map((a) => `<span class="tag g">📎 ${_escape(a.name)}（${_escape(a.size || "")}）</span>`).join(" ");
    return `<div class="search-detail-meta">
        ${metaRow("分享人", `${_escape(c.shareName || "")}（${_escape(c.shareEmpId || "")}） · ${_escape(c.shareDept || "")}`)}
        ${metaRow("产品 / 类别", `${_escape(c.productName || "-")} · ${_escape(c.category || "")} · ${_escape(c.source || "")}`)}
        ${metaRow("关键字", (c.keywords || []).map((k) => tag(_escape(k), "g")).join(" ") || "-")}
      </div>
      ${phases.map((p, i) => `<div class="search-detail-sec">${p}</div><div class="md-preview">${_renderMd(vals[i] || "（未填写）")}</div>`).join("")}
      ${att ? `<div class="search-detail-sec">附件</div><div>${att}</div>` : ""}`;
  }
  /* 过程资产四类 */
  const defs = {
    spec:   { dataKey: "spec",   ver: (x) => x.version,   extra: (x) => metaRow("标签", (x.tags || []).map((t) => tag(_escape(t), "g")).join(" ") || "-") },
    tpl:    { dataKey: "tpl",    ver: (x) => x.fileType,  extra: () => "" },
    design: { dataKey: "design", ver: (x) => x.version,   extra: () => "" },
    check:  { dataKey: "check",  ver: () => "",            extra: () => "" },
  };
  const def = defs[r.src];
  const x = _portalData(def.dataKey).find((y) => y.id === r.id);
  if (!x) return '<div class="empty">数据不存在或已删除</div>';
  const sec = r.src === "check"
    ? `<div class="search-detail-sec">检查项（${(x.items || []).length}）</div>
       <div class="search-check-list">${(x.items || []).map((i) => `<label class="search-check-item"><input type="checkbox" disabled ${i.checked ? "checked" : ""}> ${_escape(i.text)}</label>`).join("")}</div>`
    : `<div class="search-detail-sec">内容</div><div class="md-preview">${_renderMd(x.content)}</div>`;
  return `<div class="search-detail-meta">
      ${metaRow("分类", _escape(x.category || "-"))}
      ${def.ver(x) ? metaRow(r.src === "tpl" ? "格式" : "版本", _escape(def.ver(x))) : ""}
      ${def.extra(x)}
      ${metaRow("更新时间", _fmtDate(x.updatedAt || x.createdAt))}
    </div>
    <div class="search-detail-sec">简介</div>
    <div style="font-size:13px;color:var(--sub)">${_escape(x.desc || "")}</div>
    ${sec}`;
}

/* ========== 通知公告面板（工作台） ========== */

function _portalNoticePanel() {
  const notices = window.getPublishedNotices ? window.getPublishedNotices() : [];
  const unread = window.countUnreadNotices ? window.countUnreadNotices() : 0;
  const list = notices.slice(0, 4).map((n) => {
    const readIds = window.getReadNoticeIds ? window.getReadNoticeIds() : [];
    const isRead = readIds.indexOf(n.id) >= 0;
    return `<div class="portal-notice" onclick="openNoticeDetail('${n.id}')">
      <div class="portal-notice-dot" style="visibility:${isRead ? "hidden" : "visible"}"></div>
      <div class="portal-notice-body">
        <div class="portal-notice-title">${n.top ? '<span class="tag warn" style="margin-right:6px">置顶</span>' : ""}${_escape(n.title)}</div>
        <div class="portal-notice-meta">${_escape(n.publisher || "")} · ${_fmtDate(n.createdAt)} · ${(window.NOTICE_TYPES || {})[n.type] || "通知"}</div>
      </div>
      <div class="portal-notice-arrow">›</div>
    </div>`;
  }).join("");
  const emptyHtml = notices.length === 0
    ? '<div class="portal-panel-empty">📭 暂无通知公告</div>'
    : "";
  return `<div class="portal-panel">
    <div class="portal-panel-head">
      <span class="portal-panel-title">📢 通知公告${unread > 0 ? `<span class="portal-panel-badge">${unread} 条未读</span>` : ""}</span>
    </div>
    <div class="portal-panel-body">${list || emptyHtml}</div>
  </div>`;
}

/** 打开单条公告详情（标记已读） */
function openNoticeDetail(id) {
  const n = window.findNotice ? window.findNotice(id) : null;
  if (!n) return;
  window.markNoticeRead && window.markNoticeRead(id);
  const typeName = (window.NOTICE_TYPES || {})[n.type] || "通知";
  const body = `<div class="search-detail-meta">
      ${metaRow("类型", typeName + (n.top ? " · 置顶" : ""))}
      ${metaRow("发布人", _escape(n.publisher || "-"))}
      ${metaRow("发布时间", _fmtDate(n.createdAt))}
    </div>
    <div class="md-preview">${_renderMd(n.content)}</div>`;
  openModal(modalContent(`${n.top ? "📌 " : "📢"}${_escape(n.title)}`, body, btn("关闭", "gray", "closeModal()")), "640px");
  // 刷新工作台面板的未读状态（若当前在工作台）
  if ((window.curModule || "home") === "home" && typeof window.renderCurView === "function") {
    window.renderCurView();
  }
}

/* ========== 我的常用应用（工作台） ========== */

const FAV_KEY_PREFIX = "oa_fav_apps::";
const FAV_DEFAULT_COUNT = 4;

function _favKey() {
  return FAV_KEY_PREFIX + (window.CURR_ACCT || "guest");
}

/** 全部可选子系统（当前角色可见，按板块顺序） */
function _favCandidates() {
  const out = [];
  Object.keys(MODULES).forEach((mk) => {
    if (mk === "home") return;
    if (!canAccessModule(mk)) return;
    _visibleSubs(mk).forEach((s) => out.push({
      mod: mk,
      sub: s.key,
      name: s.name,
      icon: s.icon || "📦",
      modName: MODULES[mk].name,
      type: s.type || "",
      url: s.url || "",
    }));
  });
  return out;
}

/** 读取常用应用（无记录则默认取前 N 个可见子系统） */
function getFavApps() {
  let list = [];
  try {
    const raw = localStorage.getItem(_favKey());
    if (raw) list = JSON.parse(raw) || [];
  } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];
  /* 过滤失效项（权限变更 / 菜单删除） */
  const cands = _favCandidates();
  list = list.filter((f) => cands.some((c) => c.mod === f.mod && c.sub === f.sub));
  if (list.length === 0) {
    list = cands.slice(0, FAV_DEFAULT_COUNT).map((c) => ({ mod: c.mod, sub: c.sub }));
  }
  return list;
}

function saveFavApps(list) {
  try { localStorage.setItem(_favKey(), JSON.stringify(list)); } catch (e) {}
}

/** 直接进入某个常用子系统 */
function openFavApp(modKey, subKey) {
  if (!canAccessModule(modKey)) {
    window.toast(TOAST.noPermAccess.replace("{role}", ROLES[CUR_ROLE].name).replace("{module}", MODULES[modKey] ? MODULES[modKey].name : modKey));
    return;
  }
  const sub = findMenuNode(modKey, subKey);
  if (!sub || !hasRole(modKey, subKey)) {
    window.toast("该子系统不存在或已无访问权限");
    return;
  }
  if (sub.type === "external" && sub.url) {
    window.open(sub.url, "_blank");
    return;
  }
  curModule = modKey;
  curView = subKey;
  curSubSub = "";
  __routeQuery = null;
  __searchQuery = "";
  __searchSrc = "";
  if (typeof syncViewState === "function") syncViewState();
  if (typeof saveRoute === "function") saveRoute();
  if (typeof renderCurrent === "function") renderCurrent();
}

/** 常用应用管理弹窗（勾选增删） */
function openFavManage() {
  const cands = _favCandidates();
  const fav = getFavApps();
  const favSet = {};
  fav.forEach((f) => { favSet[f.mod + "::" + f.sub] = true; });
  const groups = Object.keys(MODULES).filter((mk) => mk !== "home" && canAccessModule(mk)).map((mk) => {
    const items = cands.filter((c) => c.mod === mk).map((c) => {
      const key = c.mod + "::" + c.sub;
      const extBadge = c.type === "external" ? '<span class="tag ext">外链</span>' : "";
      return `<label class="fav-manage-item"><input type="checkbox" class="fav-cb" value="${key}" ${favSet[key] ? "checked" : ""}> <span class="fav-manage-icon">${c.icon}</span>${_escape(c.name)}${extBadge}</label>`;
    }).join("");
    return items ? `<div class="fav-manage-group"><div class="fav-manage-group-title">${_escape(MODULES[mk].name)}</div><div class="fav-manage-items">${items}</div></div>` : "";
  }).join("");
  const body = `<div style="font-size:13px;color:var(--sub);margin-bottom:12px">勾选需要固定在「我的常用应用」的子系统（最多 8 个）</div>
    <div id="favManageList" style="max-height:52vh;overflow-y:auto">${groups || '<div class="empty">暂无可选子系统</div>'}</div>`;
  const foot = `${btn("取消", "gray", "closeModal()")} ${btn("💾 保存", "", "saveFavFromModal()")}`;
  openModal(modalContent("🧭 管理我的常用应用", body, foot), "560px");
}

function saveFavFromModal() {
  const cbs = document.querySelectorAll("#favManageList .fav-cb:checked");
  const list = [];
  cbs.forEach((cb) => {
    const [mod, sub] = cb.value.split("::");
    list.push({ mod: mod, sub: sub });
  });
  if (list.length > 8) {
    window.toast("最多只能选择 8 个常用应用");
    return;
  }
  saveFavApps(list);
  closeModal();
  window.toast("常用应用已保存");
  if ((window.curModule || "home") === "home" && typeof window.renderCurView === "function") {
    window.renderCurView();
  }
}

/** 工作台「我的常用应用」分区 */
function _portalFavSection() {
  const fav = getFavApps();
  const tiles = fav.map((f) => {
    const c = _favCandidates().find((x) => x.mod === f.mod && x.sub === f.sub);
    if (!c) return "";
    const color = (typeof MODULE_THEME !== "undefined" && MODULE_THEME[f.mod]) || "#1677ff";
    const isExt = c.type === "external" && c.url;
    const badge = isExt ? '<span class="tag ext">外链</span>' : "";
    return `<div class="portal-tile portal-fav-tile" style="--tc:${color}" onclick="openFavApp('${f.mod}','${f.sub}')">
      <div class="portal-tile-head">
        <div class="portal-tile-icon" style="background:${color}1a;color:${color}">${c.icon}</div>
        <div class="portal-tile-name">${_escape(c.name)}</div>
      </div>
      <div class="portal-tile-meta">${_escape(c.modName)}${badge}</div>
    </div>`;
  }).join("");
  // 列数钳制在 6~8：不足 6 个也至少 6 列，最多 8 个一行（空态兜底 1 列）
  const favCols = Math.max(6, Math.min(Math.max(fav.length, 1), 8));
  return `<div class="portal-section-title">🧭 我的常用应用<span class="portal-section-sub">（按需固定，最多 8 个）</span><span class="portal-section-act" onclick="openFavManage()">⚙ 管理</span></div>
  <div class="portal-grid portal-grid-fav" style="--cols:${favCols}">${tiles || '<div class="empty" style="grid-column:1/-1">暂无常用应用，点击「⚙ 管理」添加</div>'}</div>`;
}

/* ---------- 挂载到 window（供 HTML 内联 onclick 调用） ---------- */
window.openSearch = openSearch;
window.exitSearch = exitSearch;
window.filterSearchSrc = filterSearchSrc;
window.renderSearchPage = renderSearchPage;
window.openSearchDetail = openSearchDetail;
window.openNoticeDetail = openNoticeDetail;
window.openFavApp = openFavApp;
window.openFavManage = openFavManage;
window.saveFavFromModal = saveFavFromModal;
window.getFavApps = getFavApps;
window.saveFavApps = saveFavApps;

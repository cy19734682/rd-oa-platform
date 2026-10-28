/* ========== OA 门户 · 工作台组件 · views-portal.js ==========
 * 包含：
 *   ① 全局搜索（顶部搜索框 → 独立搜索页 → 点击弹窗查看详情）
 *      搜索范围：研发公共（标准库 / 经验案例库）+ 过程资产（开发规范 / 文档模板 / 设计规范 / 评审 Checklist）
 *      （v5.5：子系统窗口只搜本子系统内容，且仅 dev / asset 子系统保留搜索框）
 *   ② 通知公告（v4：侧栏公告下线，最新一条置于首页 crumb 公告条，
 *      v5.9 起去掉「查看更多」，只展示最新一条；数据来自 config-notices.js）
 *   ③ 我的常用应用（首页左侧栏紧凑磁贴，按账号持久化）
 *   ④ 首页左侧栏用户卡（v3 起随首页侧栏布局新增，v4 起侧栏仅剩用户卡 + 常用应用）
 * 路由状态 __searchQuery / __searchSrc 定义在 router.js（属路由状态，随路由持久化）
 * 本文件必须在 router.js 之后加载（openSearch 等会操作路由状态）
 */

/* ---------- 搜索数据源定义 ----------
 * enter 为「进入」按钮行为（v2：跨窗口跳转助手，同窗口则站内落地） */
const SEARCH_SOURCES = {
  std:    { label: "标准库",          icon: "📚", mod: "dev",   color: "#52c41a", view: "stdHome",   enter: "__jumpSub('dev','stdHome')" },
  ec:     { label: "经验案例库",      icon: "💡", mod: "dev",   color: "#13c2c2", view: "ec",        enter: "__jumpSub('dev','ec')" },
  spec:   { label: "开发规范",        icon: "📐", mod: "asset", color: "#1677ff", view: "sub-spec",  enter: "__jumpSub('asset','sub-spec')" },
  tpl:    { label: "文档模板",        icon: "📄", mod: "asset", color: "#722ed1", view: "sub-tpl",   enter: "__jumpSub('asset','sub-tpl')" },
  design: { label: "设计规范",        icon: "🎨", mod: "asset", color: "#eb2f96", view: "sub-design", enter: "__jumpSub('asset','sub-design')" },
  check:  { label: "评审 Checklist",  icon: "✅", mod: "asset", color: "#fa8c16", view: "sub-check", enter: "__jumpSub('asset','sub-check')" },
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

/** 工具：受权限 + 搜索范围过滤的数据源是否可见
 *  - 主系统门户（无 window.__SUB_KEY）：全部来源，仍受 canAccessModule 权限过滤
 *  - 子系统窗口（dev / asset）：只允许本子系统的来源，
 *    即研发公共搜「标准库 / 案例库」、过程资产搜「规范 / 模板 / 设计规范 / Checklist」；
 *    其余子系统（proj / perf 等）无搜索框，不会进入搜索页 */
function _searchSrcAllowed(srcKey) {
  const meta = SEARCH_SOURCES[srcKey];
  if (!meta) return false;
  if (!canAccessModule(meta.mod)) return false;
  if (typeof window !== "undefined" && window.__SUB_KEY && meta.mod !== window.__SUB_KEY) return false;
  return true;
}

/** 工具：当前搜索范围文案（主系统为全局；子系统为本子系统来源拼接） */
function _searchScopeLabel() {
  const sub = typeof window !== "undefined" ? window.__SUB_KEY || "" : "";
  if (!sub) return "搜索范围：标准库 / 案例库 / 过程资产";
  const labels = Object.keys(SEARCH_SOURCES).filter((k) => SEARCH_SOURCES[k].mod === sub).map((k) => SEARCH_SOURCES[k].label);
  return "搜索范围：本子系统 · " + (labels.join(" / ") || "无");
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
    body = `<div class="empty" style="margin-top:32px">🔍 未找到与「${_escape(q)}」相关的${__searchSrc ? SEARCH_SOURCES[__searchSrc].label : "内容"}<br><br><span class="muted small">${_searchScopeLabel()}</span></div>`;
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

/* ========== 首页左侧栏（v5：用户卡 + 常用应用 + 系统管理） ==========
 * 仅主系统首页（VIEWS.home）使用，由 views.js renderHome 经 window 守卫调用。
 * v5 起调整：crumb 公告条去掉发布人与发布时间；原主区「平台入口」卡片区下线
 *（操作说明书入口移除），系统管理迁入侧栏（_portalSideSys，仅 sysAdmin）。
 * 数据全部复用现有层（公告 getPublishedNotices / 常用应用 getFavApps），
 * 零新增存储。
 */

/** 侧栏 · 用户卡：头像 + 姓名/工号 + 角色（v6.6 起为纯展示，无点击）+ 问候语 + 日期 + 问候语文案 */
function _portalSideUser() {
  const name = window.CURR_ACCT_NAME || "";
  const acct = window.CURR_ACCT || "";
  const roleKey = window.CURR_ACCT_ROLE_KEY || CUR_ROLE || "";
  const roleName = (typeof ROLES !== "undefined" && ROLES[roleKey] && ROLES[roleKey].name) || roleKey;
  const d = new Date();
  const dateStr = `${d.getMonth() + 1}月${d.getDate()}日 周${"日一二三四五六".charAt(d.getDay())}`;
  return `<div class="portal-side-user">
      <div class="portal-side-avatar">${_escape((name || "👤").charAt(0))}</div>
      <div class="portal-side-user-info">
        <div class="portal-side-user-name">${_escape(name) || "同学"}</div>
        <div class="portal-side-user-meta">${_escape(acct)}${roleName ? " · " + _escape(roleName) : ""}</div>
      </div>
    </div>
    <div class="portal-side-hello">
      <div class="portal-side-greeting">${_greeting()}，${_escape(name) || "同学"} 👋</div>
      <div class="portal-side-motto">${NAV.portalHelloSub}</div>
      <div class="portal-side-date">${dateStr}</div>
      <div class="portal-side-dateprog">${_dateProgressHtml()}</div>
    </div>`;
}

/** 用户卡日期进度小字（v5.2）：本周第 N 天 · 今年第 N 天 · 距月末 N 天（纯计算，无数据依赖） */
function _dateProgressHtml() {
  const now = new Date();
  const wd = now.getDay() || 7;
  const yd = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1;
  const left = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  return NAV.sideDateProgress.replace("{wd}", wd).replace("{yd}", yd).replace("{left}", left);
}

/** crumb 公告条（v5.1：首页面包屑行只保留公告，去掉发布人与发布时间；
 *  v5.9：去掉「查看更多」，只展示最新一条，点击标题看详情）
 * 由 router.js renderCrumb 首页分支调用（window 守卫）；无公告时返回空串。
 * 点击标题打开详情并标记已读。 */
function _crumbNoticeHtml() {
  const notices = window.getPublishedNotices ? window.getPublishedNotices() : [];
  if (!notices.length) return "";
  const n = notices[0];
  const readIds = window.getReadNoticeIds ? window.getReadNoticeIds() : [];
  const isRead = readIds.indexOf(n.id) >= 0;
  return `<div class="crumb-notice">
    <span class="crumb-notice-main">
      <span class="crumb-notice-dot" style="visibility:${isRead ? "hidden" : "visible"}"></span>
      <span class="crumb-notice-tag">📢 公告</span>
      <span class="crumb-notice-title" onclick="openNoticeDetail('${n.id}')" title="${_escape(n.title)}">${n.top ? '<span class="tag warn" style="margin-right:6px">置顶</span>' : ""}${_escape(n.title)}</span>
    </span>
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
  // 刷新工作台与 crumb 公告条的未读状态（若当前在主系统首页）
  if ((window.curModule || "home") === "home") {
    if (typeof window.renderCurView === "function") window.renderCurView();
    if (typeof renderCrumb === "function") renderCrumb();
  }
}

/* ========== 我的常用应用（首页左侧栏紧凑磁贴） ==========
 * 数据结构（批次三起两级化）：{ app, mod, sub }
 *   app = 所属子系统（门户卡 key；非子系统的旧菜单项为 ""）
 *   mod/sub = 页面在菜单树中的位置；外部系统卡 mod/sub 均为 ""
 * 旧数据 { mod, sub } 自动迁移：内部子系统按 mod 反查补 app，
 *   已迁出板块的旧外链项（pms/board/sub-auto）按迁移表转到新门户卡。
 */

const FAV_KEY_PREFIX = "oa_fav_apps::";
const FAV_DEFAULT_COUNT = 4;
/** 旧外链子系统 key → 新门户卡 key（批次二外部系统迁出板块） */
const FAV_LEGACY_EXT = { pms: "ext-pms", board: "ext-board", "sub-auto": "ext-auto" };

function _favKey() {
  return FAV_KEY_PREFIX + (window.CURR_ACCT || "guest");
}

/** 全部可选应用（当前角色可见：内部子系统页面 + 外链门户卡，按板块顺序） */
function _favCandidates() {
  const out = [];
  Object.keys(MODULES).forEach((mk) => {
    if (mk === "home") return;
    if (!canAccessModule(mk)) return;
    _visibleSubs(mk).forEach((s) => out.push({
      app: (typeof _isSubsystemKey === "function" && _isSubsystemKey(mk)) ? mk : "",
      mod: mk,
      sub: s.key,
      name: s.name,
      icon: s.icon || "📦",
      modName: MODULES[mk].name,
      type: s.type || "",
      url: s.url || "",
    }));
  });
  /* 外链门户卡（批次二起外部系统迁出板块，作为整体固定到常用应用） */
  if (typeof getPortalApps === "function") {
    getPortalApps().filter((a) => a.kind === "external").forEach((a) => {
      if (typeof _portalAppAllowed === "function" && !_portalAppAllowed(a)) return;
      out.push({
        app: a.key, mod: "", sub: "",
        name: a.name, icon: a.icon || "🔗",
        modName: "外部系统", type: "external", url: a.url || "",
      });
    });
  }
  return out;
}

/** 旧 fav 项结构迁移：补 app 字段；命中的旧外链项转为新门户卡 {app, "", ""} */
function _favMigrateItem(f, cands) {
  if (!f || typeof f !== "object") return null;
  if (f.app !== undefined && f.mod !== undefined && f.sub !== undefined) {
    return { app: f.app, mod: f.mod, sub: f.sub };
  }
  if (f.mod && f.sub) {
    const live = cands.some((c) => c.mod === f.mod && c.sub === f.sub);
    if (!live && FAV_LEGACY_EXT[f.sub] && typeof findPortalApp === "function" && findPortalApp(FAV_LEGACY_EXT[f.sub])) {
      return { app: FAV_LEGACY_EXT[f.sub], mod: "", sub: "" };
    }
    if (typeof _isSubsystemKey === "function" && _isSubsystemKey(f.mod)) {
      return { app: f.mod, mod: f.mod, sub: f.sub };
    }
  }
  return { app: "", mod: f.mod || "", sub: f.sub || "" };
}

/** 读取常用应用（无记录则默认取前 N 个可见应用；旧结构自动迁移） */
function getFavApps() {
  let list = [];
  try {
    const raw = localStorage.getItem(_favKey());
    if (raw) list = JSON.parse(raw) || [];
  } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];
  const cands = _favCandidates();
  /* 结构迁移 {mod,sub} → {app,mod,sub}，并过滤失效项（权限变更 / 菜单删除 / 门户卡下架） */
  list = list
    .map((f) => _favMigrateItem(f, cands))
    .filter((f) => f && cands.some((c) => c.app === f.app && c.mod === f.mod && c.sub === f.sub));
  if (list.length === 0) {
    list = cands.slice(0, FAV_DEFAULT_COUNT).map((c) => ({ app: c.app, mod: c.mod, sub: c.sub }));
  }
  return list;
}

function saveFavApps(list) {
  try { localStorage.setItem(_favKey(), JSON.stringify(list)); } catch (e) {}
}

/** 直接进入某个常用应用
 *  新签名 openFavApp(app, mod, sub)；兼容旧两参调用 openFavApp(mod, sub) */
function openFavApp(app, mod, sub) {
  if (sub === undefined) {
    sub = mod;
    mod = app;
    app = (typeof _isSubsystemKey === "function" && _isSubsystemKey(mod)) ? mod : "";
  }
  if (!mod) {
    /* 外链门户卡：新窗口打开 */
    const card = typeof findPortalApp === "function" ? findPortalApp(app) : null;
    if (card && card.url) { window.open(card.url, "_blank"); return; }
    window.toast("该外部系统地址无效或已下架");
    return;
  }
  if (!canAccessModule(mod)) {
    window.toast(TOAST.noPermAccess.replace("{role}", ROLES[CUR_ROLE].name).replace("{module}", MODULES[mod] ? MODULES[mod].name : mod));
    return;
  }
  const subNode = findMenuNode(mod, sub);
  if (!subNode || !hasRole(mod, sub)) {
    window.toast("该子系统不存在或已无访问权限");
    return;
  }
  if (subNode.type === "external" && subNode.url) {
    window.open(subNode.url, "_blank");
    return;
  }
  /* v2 窗口级分离：内部子系统一律新窗口打开，并落到指定二级页（?m=sub） */
  if (typeof __jumpSub === "function") {
    __jumpSub(mod, sub);
  } else if (typeof openSubsystem === "function") {
    openSubsystem(mod, sub);
  }
}

/** 常用应用管理弹窗（勾选增删；内部页面按板块分组，外链门户卡独立分组） */
function openFavManage() {
  const cands = _favCandidates();
  const fav = getFavApps();
  const favSet = {};
  fav.forEach((f) => { favSet[f.app + "::" + f.mod + "::" + f.sub] = true; });
  const groups = Object.keys(MODULES).filter((mk) => mk !== "home" && canAccessModule(mk)).map((mk) => {
    const items = cands.filter((c) => c.mod === mk).map((c) => {
      const key = c.app + "::" + c.mod + "::" + c.sub;
      const extBadge = c.type === "external" ? '<span class="tag ext">外链</span>' : "";
      return `<label class="fav-manage-item"><input type="checkbox" class="fav-cb" value="${key}" ${favSet[key] ? "checked" : ""}> <span class="fav-manage-icon">${c.icon}</span>${_escape(c.name)}${extBadge}</label>`;
    }).join("");
    return items ? `<div class="fav-manage-group"><div class="fav-manage-group-title">${_escape(MODULES[mk].name)}</div><div class="fav-manage-items">${items}</div></div>` : "";
  });
  /* 外链门户卡分组（mod 为空即门户级外部系统） */
  const extItems = cands.filter((c) => !c.mod).map((c) => {
    const key = c.app + "::" + c.mod + "::" + c.sub;
    return `<label class="fav-manage-item"><input type="checkbox" class="fav-cb" value="${key}" ${favSet[key] ? "checked" : ""}> <span class="fav-manage-icon">${c.icon}</span>${_escape(c.name)}<span class="tag ext">外链</span></label>`;
  }).join("");
  if (extItems) {
    groups.push(`<div class="fav-manage-group"><div class="fav-manage-group-title">外部系统</div><div class="fav-manage-items">${extItems}</div></div>`);
  }
  const body = `<div style="font-size:13px;color:var(--sub);margin-bottom:12px">勾选需要固定在「我的常用应用」的子系统页面或外部系统（最多 8 个）</div>
    <div id="favManageList" style="max-height:52vh;overflow-y:auto">${groups.join("") || '<div class="empty">暂无可选应用</div>'}</div>`;
  const foot = `${btn("取消", "gray", "closeModal()")} ${btn("💾 保存", "", "saveFavFromModal()")}`;
  openModal(modalContent("🧭 管理我的常用应用", body, foot), "560px");
}

function saveFavFromModal() {
  const cbs = document.querySelectorAll("#favManageList .fav-cb:checked");
  const list = [];
  cbs.forEach((cb) => {
    const parts = String(cb.value).split("::");
    list.push({ app: parts[0] || "", mod: parts[1] || "", sub: parts[2] || "" });
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

/** 侧栏 · 常用应用：3 列紧凑磁贴（外链卡带 ↗ 标记；管理复用常用应用管理弹窗） */
function _portalSideFav() {
  const fav = getFavApps();
  const cands = _favCandidates();
  const tiles = fav.map((f) => {
    const c = cands.find((x) => x.app === f.app && x.mod === f.mod && x.sub === f.sub);
    if (!c) return "";
    const color = (typeof MODULE_THEME !== "undefined" && MODULE_THEME[f.mod]) || "#1677ff";
    const isExt = c.type === "external" && c.url;
    return `<div class="portal-side-fav" onclick="openFavApp('${f.app}','${f.mod}','${f.sub}')" title="${_escape(c.name)}${isExt ? "（外部系统，新窗口打开）" : ""}">
      <div class="portal-side-fav-icon" style="background:${color}1a;color:${color}">${c.icon}</div>
      <div class="portal-side-fav-name">${_escape(c.name)}${isExt ? '<span class="portal-side-fav-ext">↗</span>' : ""}</div>
    </div>`;
  }).join("");
  return `<div class="portal-side-block">
    <div class="portal-side-head">
      <span class="portal-side-title">${NAV.sideFav}</span>
      <span class="portal-side-act" onclick="openFavManage()">${NAV.sideFavManage}</span>
    </div>
    <div class="portal-side-fav-grid">${tiles || `<div class="portal-side-empty" style="grid-column:1/-1">${NAV.sideFavEmpty}</div>`}</div>
  </div>`;
}

/** 侧栏 · 系统管理入口（v5：原主区平台入口卡迁入侧栏，仅 sysAdmin 可见）
 * 权限门与 selectModule('sys') 同源（CUR_ROLE，登录时由账号 key 决定）
 * 点击进入系统管理板块（仍在主系统窗口内） */
function _portalSideSys() {
  const isAdmin = typeof CUR_ROLE !== "undefined" && CUR_ROLE === "sysAdmin";
  if (!isAdmin) return "";
  return `<div class="portal-side-link" onclick="selectModule('sys')" title="进入系统管理">${NAV.sideSys}<span class="portal-side-tag">${NAV.sideAdminTag}</span></div>`;
}

/* ---------- 侧栏 · 待办摘要行（v5.2） ----------
 * 紧凑摘要形态（非 v4 已下线的待办完整列表）：复用 _collectTodos() 的跨模块
 * 待办聚合（按角色），点击弹铃铛待办面板（showLoginTodoModal(true)）。
 * 0 条时展示置灰兜底文案，不绑点击（面板本身对空列表不弹窗）。 */
function _portalSideTd() {
  const todos = typeof _collectTodos === "function" ? _collectTodos() : [];
  const count = todos.length;
  if (count > 0) {
    return `<div class="portal-side-td" onclick="showLoginTodoModal(true)" title="点击查看全部待办">
      <span class="portal-side-td-label">${NAV.sideTd}</span>
      <span class="portal-side-td-num">${count} ${NAV.sideTdUnit}</span>
      <span class="portal-side-td-go">›</span>
    </div>`;
  }
  return `<div class="portal-side-td zero" title="当前没有待处理事项">
    <span class="portal-side-td-label">${NAV.sideTd}</span>
    <span class="portal-side-td-none">${NAV.sideTdNone}</span>
  </div>`;
}

/* ---------- 侧栏 · 最近访问（v5.2） ----------
 * 自动记录最近进入的内部子系统二级页（router.js 的 selectSub/selectSubSub/go
 * 挂钩 recordRecentVisit），按账号隔离（oa_recent::<账号>），最多保留 8 条，
 * 侧栏展示最近 5 条；点击与常用应用一致——新窗口打开子系统并落地该页。 */

/** 最近访问存储 key（按当前账号隔离；未登录回落 guest） */
function _recentKey() {
  const id = window.CURR_ACCT_ID || window.CURR_ACCT_NAME || "";
  return "oa_recent::" + (id || "guest");
}

/** 读取最近访问列表（容错解析，过滤脏数据） */
function getRecentVisits() {
  try {
    const raw = localStorage.getItem(_recentKey());
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.filter((x) => x && x.mod && x.sub);
    }
  } catch (e) {}
  return [];
}

/** 记录一次子系统访问：去重后置顶，截断到 RECENT_MAX 条
 * 仅记内部子系统（门户 kind=internal 的 mod）；home/sys/外链不记录 */
const RECENT_MAX = 8;
function recordRecentVisit(modKey, subKey) {
  if (!modKey || !subKey) return;
  if (modKey === "home" || modKey === "sys") return;
  if (typeof _isSubsystemKey === "function" && !_isSubsystemKey(modKey)) return;
  const node = typeof findMenuNode === "function" ? findMenuNode(modKey, subKey) : null;
  if (!node || node.type === "external") return;
  try {
    const list = getRecentVisits().filter((x) => !(x.mod === modKey && x.sub === subKey));
    list.unshift({ mod: modKey, sub: subKey, name: node.name || subKey, icon: node.icon || "📄", ts: Date.now() });
    _save(_recentKey(), list.slice(0, RECENT_MAX));
  } catch (e) {}
}

/** 侧栏 · 最近访问：最近 5 条内部子系统二级页（图标 + 名称 + 跳转箭头） */
function _portalSideRecent() {
  const list = getRecentVisits().slice(0, 5);
  const rows = list.map((r) => `<div class="portal-side-recent-row" onclick="__jumpSub('${r.mod}','${r.sub}')" title="打开${_escape(r.name)}">
    <span class="portal-side-recent-icon">${r.icon || "📄"}</span>
    <span class="portal-side-recent-name">${_escape(r.name)}</span>
    <span class="portal-side-recent-go">›</span>
  </div>`).join("");
  return `<div class="portal-side-block">
    <div class="portal-side-head">
      <span class="portal-side-title">${NAV.sideRecent}</span>
    </div>
    ${rows || `<div class="portal-side-empty">${NAV.sideRecentEmpty}</div>`}
  </div>`;
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
window._crumbNoticeHtml = _crumbNoticeHtml;
window._portalSideSys = _portalSideSys;
window._portalSideTd = _portalSideTd;
window._portalSideRecent = _portalSideRecent;
window.getRecentVisits = getRecentVisits;
window.recordRecentVisit = recordRecentVisit;

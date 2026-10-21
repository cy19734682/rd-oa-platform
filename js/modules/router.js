/* ========== 路由导航（OA 门户模型） ==========
 * 门户三级：工作台（平台首页）→ 板块首页（子系统磁贴）→ 子系统页
 *   curModule: "home" 表示工作台；否则为板块模块 key
 *   curView:   "" 表示板块首页（子系统磁贴一次性铺开）；否则为子系统 key
 *   curSubSub: 三级子系统 key（菜单管理可配），非空表示当前渲染三级子系统页
 * 导航入口全部走磁贴点击，无顶部一级菜单、无左侧边栏。
 */

/* ---------- 路由持久化 key ---------- */
const ROUTE_KEY = "oa_route";

/* ---------- 当前模块/视图状态 ---------- */
let curModule = "home";
let curView = "";
let curSubSub = "";
let __routeQuery = null;
/* ---------- 全局搜索状态（非空表示当前处于独立搜索页） ---------- */
let __searchQuery = "";
let __searchSrc = "";

/* ---------- 辅助：当前角色可见的二级子系统（按 order 升序） ---------- */
function _visibleSubs(modKey) {
  const m = MODULES[modKey];
  if (!m || !m.subs) return [];
  return _sortedSubs(modKey).filter((s) => hasRole(modKey, s.key));
}

/* ---------- 辅助：某二级子系统下当前角色可见的三级子项 ---------- */
function _visibleChildren(modKey, subKey) {
  const sub = findMenuNode(modKey, subKey);
  if (!sub || !sub.subs || !sub.subs.length) return [];
  return sub.subs
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter((ss) => hasRole(modKey, subKey, ss.key));
}

/* ---------- 持久化当前路由到 sessionStorage ---------- */
function saveRoute() {
  try {
    sessionStorage.setItem(ROUTE_KEY, JSON.stringify({ m: curModule, v: curView, ss: curSubSub, s: __searchQuery }));
  } catch (e) {
    // 忽略存储异常
  }
}

/* ---------- 清除持久化的路由状态 ---------- */
function clearRoute() {
  try {
    sessionStorage.removeItem(ROUTE_KEY);
  } catch (e) {
    // 忽略
  }
}

/* ---------- 获取当前角色有权限访问的第一个模块 key ---------- */
function getFirstAccessibleModule() {
  const keys = Object.keys(MODULES);
  for (const k of keys) {
    if (k === "home") continue;
    if (canAccessModule(k)) return k;
  }
  return null;
}

/* ---------- 渲染面包屑（可点击跳转）+ 右上角返回条 ----------
 * 工作台：      <b>工作台</b>
 * 板块首页：    工作台 / <b>研发公共</b>
 * 子系统页：    工作台 / 研发公共 / <b>标准库</b>   + 「← 返回研发公共」
 * 三级子系统页：工作台 / 研发公共 / 考核表 / <b>月度考核</b>
 * 搜索页：      工作台 / <b>搜索结果</b>「关键词」
 */
function renderCrumb() {
  const el = document.getElementById("crumb");
  if (!el) return;
  const sep = '<span class="crumb-sep">/</span>';

  /* 独立搜索页：面包屑与模块解耦，逐级均可回到工作台 */
  if (__searchQuery) {
    el.innerHTML = `<div class="crumb-links"><span class="crumb-link" onclick="exitSearch()">工作台</span>${sep}<b>搜索结果</b><span class="crumb-q">「${_escape(__searchQuery)}」</span></div>`;
    return;
  }

  const nodes = [];

  if (curModule === "home") {
    el.innerHTML = `<div class="crumb-links">${NAV.crumbHome}</div>`;
    return;
  }

  const m = MODULES[curModule];
  nodes.push('<span class="crumb-link" onclick="goHome()">工作台</span>');

  const sub = curView ? findMenuNode(curModule, curView) : null;
  const onSubPage = !!sub;

  if (onSubPage) {
    nodes.push(`<span class="crumb-link" onclick="selectModule('${curModule}')">${_escape(m.name)}</span>`);
    if (curSubSub) {
      const ss = (sub.subs || []).find((x) => x.key === curSubSub);
      nodes.push(`<span class="crumb-link" onclick="selectSub('${curView}')">${_escape(sub.name)}</span>`);
      nodes.push(`<b>${_escape(ss ? ss.name : curSubSub)}</b>`);
    } else {
      nodes.push(`<b>${_escape(sub.name)}</b>`);
    }
  } else {
    nodes.push(`<b>${_escape(m.name)}</b>`);
  }

  // 返回条：三级子系统页回到父级分组页（如「年度绩效管理」），二级子系统页回到板块首页
  const backHtml = !onSubPage ? "" : (curSubSub
    ? `<div class="crumb-back"><button class="btn gray sm" onclick="selectSub('${curView}')">${NAV.backToGroup.replace('{group}', _escape(sub.name))}</button></div>`
    : `<div class="crumb-back"><button class="btn gray sm" onclick="selectModule('${curModule}')">${NAV.backToModule.replace('{module}', _escape(m.name))}</button></div>`);
  el.innerHTML = `<div class="crumb-links">${nodes.join(sep)}</div>${backHtml}`;
}

/* ---------- 渲染当前状态对应的页面（子系统页 / 三级页 / 占位） ---------- */
function renderCurrent() {
  const m = MODULES[curModule];
  const sub = curView ? findMenuNode(curModule, curView) : null;
  let html;
  if (curSubSub && sub) {
    const ss = (sub.subs || []).find((x) => x.key === curSubSub);
    if (ss && hasRole(curModule, curView, curSubSub)) {
      if (ss.type === "external" && ss.url) {
        html = renderPlaceholder();
      } else if (typeof VIEWS[curSubSub] === "function") {
        html = VIEWS[curSubSub]();
      } else {
        html = renderPlaceholder();
      }
    } else {
      curSubSub = "";
      html = _renderSubLevel(m, sub);
    }
  } else {
    html = _renderSubLevel(m, sub);
  }
  document.getElementById("content").innerHTML = html;
  renderCrumb();
}

/* ---------- 渲染二级层级：带三级子项的分组磁贴页 / 子系统页 / 占位 ---------- */
function _renderSubLevel(m, sub) {
  if (!sub) return renderPlaceholder();
  const children = _visibleChildren(curModule, sub.key);
  if (children.length > 0) {
    // 二级下还有三级子项 → 先铺开三级磁贴（分组页）
    return typeof window.renderSubGroupHome === "function"
      ? window.renderSubGroupHome()
      : renderPlaceholder();
  }
  if (sub.type === "external" && sub.url) return renderPlaceholder();
  if (sub.action && typeof window[sub.action] === "function") {
    // 带 action 的菜单项：直接执行动作（不产生路由）
    window[sub.action]();
    return "";
  }
  if (typeof VIEWS[sub.key] === "function") return VIEWS[sub.key]();
  return renderPlaceholder();
}

/* ---------- 渲染板块首页（子系统磁贴一次性铺开） ---------- */
function renderModulePage() {
  const m = MODULES[curModule];
  const subs = _visibleSubs(curModule);
  let html;
  if (subs.length === 0) {
    html = `<div class="empty" style="margin-top:40px">🔒 该板块下暂无可访问的子系统，请联系管理员开通权限</div>`;
  } else if (typeof window.renderModuleHome === "function") {
    html = window.renderModuleHome();
  } else {
    html = renderPlaceholder();
  }
  document.getElementById("content").innerHTML = html;
  renderCrumb();
}

/* ---------- 工作台（平台首页） ---------- */
function goHome() {
  curModule = "home";
  curView = "";
  curSubSub = "";
  __routeQuery = null;
  __searchQuery = "";
  __searchSrc = "";
  syncViewState();
  saveRoute();
  document.getElementById("app").style.display = "flex";
  document.getElementById("view-login").style.display = "none";
  document.getElementById("content").innerHTML = VIEWS.home();
  renderCrumb();
}

/* ---------- 选择一级板块（进入板块首页，铺开子系统磁贴） ---------- */
function selectModule(k) {
  if (k === "home" || !MODULES[k]) {
    goHome();
    return;
  }
  const m = MODULES[k];
  if (!canAccessModule(k)) {
    window.toast(TOAST.noPermAccess.replace('{role}', ROLES[CUR_ROLE].name).replace('{module}', m.name));
    return;
  }
  if (m.type === "external" && m.url && (!m.subs || !m.subs.length)) {
    window.open(m.url, "_blank");
    return;
  }
  curModule = k;
  curView = "";
  curSubSub = "";
  __routeQuery = null;
  __searchQuery = "";
  __searchSrc = "";
  syncViewState();
  saveRoute();
  renderModulePage();
}

/* ---------- 选择二级菜单（磁贴点击进入子系统页；带三级子项则进入分组页） ---------- */
function selectSub(v) {
  const m = MODULES[curModule];
  const sub = (m && m.subs) ? m.subs.find((s) => s.key === v) : null;
  if (!sub) return;
  if (!hasRole(curModule, v)) {
    window.toast(TOAST.noPermAccess.replace('{role}', ROLES[CUR_ROLE].name).replace('{module}', sub.name));
    return;
  }
  if (sub.type === "external" && sub.url) {
    window.open(sub.url, "_blank");
    return;
  }
  curView = v;
  curSubSub = "";
  __routeQuery = null;
  __searchQuery = "";
  __searchSrc = "";
  syncViewState();
  saveRoute();
  renderCurrent();
}

/* ---------- 选择三级菜单 ---------- */
function selectSubSub(subKey, subSubKey) {
  const m = MODULES[curModule];
  const sub = (m && m.subs) ? m.subs.find((s) => s.key === subKey) : null;
  const ss = sub ? (sub.subs || []).find((x) => x.key === subSubKey) : null;
  if (!ss || !hasRole(curModule, subKey, subSubKey)) return;
  if (ss.type === "external" && ss.url) {
    window.open(ss.url, "_blank");
    return;
  }
  curView = subKey;
  curSubSub = subSubKey;
  __routeQuery = null;
  __searchQuery = "";
  __searchSrc = "";
  syncViewState();
  saveRoute();
  renderCurrent();
}

/* ---------- 处理带 action 字段的菜单点击（支持任意层级路径） ---------- */
function selectActionSub(...keys) {
  const node = findMenuNode(curModule, ...keys.filter((k) => !!k));
  if (node && node.action && typeof window[node.action] === "function") {
    window[node.action]();
  }
}

/* ---------- 路由切换（go 内部处理查询参数与当前层级渲染） ---------- */
function go(v, fromHome) {
  document.getElementById("app").style.display = "flex";
  document.getElementById("view-login").style.display = "none";
  // 解析简单查询参数：key?a=1&b=2 → curView = 'key', __routeQuery = {a:'1', b:'2'}
  if (typeof v === "string" && v.includes("?")) {
    const qIdx = v.indexOf("?");
    const qs = v.substring(qIdx + 1);
    v = v.substring(0, qIdx);
    const q = {};
    qs.split("&").forEach((pair) => {
      if (!pair) return;
      const eq = pair.indexOf("=");
      if (eq === -1) q[decodeURIComponent(pair)] = "";
      else q[decodeURIComponent(pair.substring(0, eq))] = decodeURIComponent(pair.substring(eq + 1));
    });
    __routeQuery = q;
  } else {
    __routeQuery = null;
  }
  if (curModule === "home" || !MODULES[curModule]) {
    goHome();
    return;
  }
  curView = v;
  curSubSub = "";
  __searchQuery = "";
  __searchSrc = "";
  syncViewState();
  saveRoute();
  renderCurrent();
}

/* ---------- 恢复路由状态（带权限校验，无权限则降级到工作台） ---------- */
function restoreRoute() {
  let saved = null;
  try {
    const raw = sessionStorage.getItem(ROUTE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    // 忽略
  }
  if (!saved || !saved.m) {
    goHome();
    return;
  }
  /* 搜索页恢复优先于模块降级：刷新后应回到搜索结果页（模块仅作返回上下文） */
  if (saved.s) {
    const mk = saved.m !== "home" && MODULES[saved.m] && canAccessModule(saved.m) ? saved.m : "home";
    curModule = mk;
    __searchQuery = String(saved.s);
    __searchSrc = "";
    curView = "";
    curSubSub = "";
    syncViewState();
    saveRoute();
    if (typeof window.renderSearchPage === "function") {
      document.getElementById("app").style.display = "flex";
      document.getElementById("view-login").style.display = "none";
      window.renderSearchPage();
    } else {
      goHome();
    }
    return;
  }
  if (saved.m === "home" || !MODULES[saved.m] || !canAccessModule(saved.m)) {
    goHome();
    return;
  }
  curModule = saved.m;
  const sub = saved.v ? findMenuNode(curModule, saved.v) : null;
  if (!saved.v || !sub || !hasRole(curModule, saved.v)) {
    curView = "";
    curSubSub = "";
    syncViewState();
    saveRoute();
    renderModulePage();
    return;
  }
  curView = saved.v;
  if (saved.ss) {
    const ss = (sub.subs || []).find((x) => x.key === saved.ss);
    curSubSub = ss && hasRole(curModule, saved.v, saved.ss) ? saved.ss : "";
  } else {
    curSubSub = "";
  }
  syncViewState();
  saveRoute();
  renderCurrent();
}

/* ---------- 占位视图：外部子系统入口 / 未实现功能 ---------- */
function renderPlaceholder() {
  const m = MODULES[curModule];
  const curSub = curView ? findMenuNode(curModule, curView) : null;

  if (curSub && curSub.type === "external" && curSub.url) {
    return `
    <div class="page-title">${curSub.name}（外部子系统入口）</div>
    <div class="page-desc">第三方系统，已打通 SSO 免二次登录</div>
    <div class="empty">
      <div style="font-size:15px;color:var(--title);margin-bottom:8px">🔗 目标地址</div>
      <div style="background:#f7f9fc;border:1px solid #e8eaec;border-radius:var(--radius);padding:12px 16px;color:#1890ff;word-break:break-all;font-size:13px;margin-bottom:20px">${curSub.url}</div>
      <div style="display:flex;gap:12px">
        <button class="btn" onclick="window.open('${curSub.url}', '_blank')">在新窗口打开 ${curSub.name} ↗</button>
        <button class="btn gray" onclick="goHome()">返回工作台</button>
      </div>
    </div>`;
  }

  let name = "功能入口";
  if (curSub) name = curSub.name;
  else if (curSubSub) name = curSubSub;
  const pageTitle = PAGES.placeholder.title.replace("{name}", name);
  const pageDesc = PAGES.placeholder.desc;
  const hint = EMPTY.placeholderHint;
  const btnText = EMPTY.placeholderBtn;
  return `
  <div class="page-title">${pageTitle}</div>
  <div class="page-desc">${pageDesc}</div>
  <div class="empty">${hint}<br><br><button class="btn" onclick="goHome()">${btnText}</button></div>`;
}

/* ---------- 权限变更后的菜单刷新 ---------- */
function refreshAfterPermChange() {
  /* 搜索页结果受权限过滤影响，直接重渲染搜索页 */
  if (__searchQuery) {
    if (typeof window.renderSearchPage === "function") window.renderSearchPage();
    return;
  }
  if (curModule !== "home" && !canAccessModule(curModule)) {
    goHome();
    return;
  }
  if (curModule !== "home") {
    const sub = curView ? findMenuNode(curModule, curView) : null;
    if (curView && (!sub || !hasRole(curModule, curView))) {
      curView = "";
      curSubSub = "";
      syncViewState();
      renderModulePage();
      return;
    }
    if (curSubSub && (!sub || !hasRole(curModule, curView, curSubSub))) {
      curSubSub = "";
      syncViewState();
    }
  }
  renderCurView();
}

document.addEventListener('permschange', refreshAfterPermChange);

/* ---------- 重新渲染当前视图 ---------- */
function renderCurView() {
  if (__searchQuery) {
    if (typeof window.renderSearchPage === "function") window.renderSearchPage();
    return;
  }
  if (curModule === "home" || !MODULES[curModule]) {
    goHome();
    return;
  }
  if (!curView) {
    renderModulePage();
    return;
  }
  renderCurrent();
}

/* ---------- 同步当前视图状态到 window ---------- */
function syncViewState() {
  window.curModule = curModule;
  window.curView = curView;
  window.curSubSub = curSubSub;
}

/* ---------- 挂载到 window ---------- */
window.selectModule = selectModule;
window.selectSub = selectSub;
window.selectSubSub = selectSubSub;
window.selectActionSub = selectActionSub;
window.go = go;
window.goHome = goHome;
window.renderCurView = renderCurView;
window.restoreRoute = restoreRoute;
window.clearRoute = clearRoute;
window.getFirstAccessibleModule = getFirstAccessibleModule;

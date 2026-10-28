/* ========== 路由导航（v2 主系统 + 子系统窗口级分离） ==========
 * 窗口两级：
 *   主系统窗口（index.html）：门户（VIEWS.home）→ 系统管理等主系统内模块
 *   子系统窗口（subs/<key>.html）：只承载该子系统自己的模块树
 *     curModule: 子系统窗口恒等于 window.__SUB_KEY；主系统为 "home" 或 sys
 *     curView:   "" 表示子系统首页（二级磁贴一次性铺开）；否则为二级 key
 *     curSubSub: 三级子系统 key（菜单管理可配），非空表示当前渲染三级子系统页
 * 路由持久化按窗口隔离：主系统 oa_route；子系统窗口 oa_route::<app>
 * 进入子系统一律 window.open 新窗口（openSubsystem），壳内切换已废弃。
 */

/* ---------- 路由持久化 key（按窗口隔离） ---------- */
function _routeKey() {
  return (typeof window !== "undefined" && window.__SUB_KEY) ? "oa_route::" + window.__SUB_KEY : "oa_route";
}

/* ---------- 当前模块/视图状态 ---------- */
let curModule = "home";
let curView = "";
let curSubSub = "";
/* ---------- 当前子系统 key（主系统+子系统模型；空 = 主系统门户） ---------- */
let curApp = "";
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

/* ---------- 辅助：某 key 是否为「内部子系统」（门户 kind=internal 的 mod） ----------
 * 系统管理（sys）与工作台（home）不属于子系统，留在主系统内 */
function _isSubsystemKey(k) {
  if (!k || k === "home" || k === "sys" || !MODULES[k]) return false;
  const apps = typeof getPortalApps === "function" ? getPortalApps() : [];
  return apps.some((a) => a && a.kind === "internal" && a.mod === k);
}

/* ---------- 持久化当前路由到 sessionStorage（按窗口隔离） ---------- */
function saveRoute() {
  try {
    sessionStorage.setItem(_routeKey(), JSON.stringify({ app: curApp, m: curModule, v: curView, ss: curSubSub, s: __searchQuery }));
  } catch (e) {
    // 忽略存储异常
  }
}

/* ---------- 清除持久化的路由状态 ---------- */
function clearRoute() {
  try {
    sessionStorage.removeItem(_routeKey());
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
 * 主系统门户：      crumb 公告条（最新一条通知，v5 起不再显示「主系统」一级）
 * 主系统内页面：    主系统 / <b>系统管理</b>            + 「← 返回主系统」
 * 子系统窗口首页：  <b>项目管理</b>（v5.5 起不显示「主系统」一级，与主系统同构）
 * 子系统窗口页：    研发公共 / <b>标准库</b>            （无返回条，回门户走顶栏 Logo）
 * 三级子系统页：    研发公共 / 考核表 / <b>月度考核</b>  + 「← 返回考核表」
 * 搜索页：          主系统 / <b>搜索结果</b>「关键词」
 * 注：子系统窗口中一级为当前子系统名（点击回本子系统首页），回主门户统一走
 *     顶栏 Logo（与主系统「点 Logo 回门户」行为一致）；
 *     公告条仅在主系统首页渲染（_crumbNoticeHtml 定义在 views-portal.js，
 *     经 window 守卫调用；子系统窗口不展示；无公告时首页 crumb 为空）。
 */
function renderCrumb() {
  const el = document.getElementById("crumb");
  if (!el) return;
  const sep = '<span class="crumb-sep">/</span>';
  const inSub = !!(typeof window !== "undefined" && window.__SUB_KEY);
  /* v5.9：首页 crumb 用 is-home 标记——首页公告条左右内边距 290px（与首页主区列对齐），
   * 其余页面面包屑仍为常规 20px。
   * v6.6：搜索结果页不是首页——__searchQuery 非空时不打 is-home，
   *       否则搜索页（curModule 仍停在 home）会误用首页的 290px 内边距。 */
  const onHome = !__searchQuery && (curModule === "home" || !curModule);
  el.className = "crumb" + (onHome ? " is-home" : "");

  /* 独立搜索页：面包屑与模块解耦，逐级均可回到来源页
   * v5.5：子系统窗口一级为本子系统名（与 crumb 规范一致，不出现「主系统」） */
  if (__searchQuery) {
    const rootLink = inSub && curModule && MODULES[curModule]
      ? `<span class="crumb-link" onclick="exitSearch()">${_escape(MODULES[curModule].name)}</span>`
      : `<span class="crumb-link" onclick="exitSearch()">${NAV.crumbPortal}</span>`;
    el.innerHTML = `<div class="crumb-links">${rootLink}${sep}<b>搜索结果</b><span class="crumb-q">「${_escape(__searchQuery)}」</span></div>`;
    return;
  }

  const nodes = [];

  if (curModule === "home" || !curModule) {
    /* v5：主系统首页 crumb 去掉「主系统」一级，只保留最新一条公告
     * （子系统窗口不展示，公告属主系统；无公告时 crumb 为空） */
    const notice = (!inSub && window._crumbNoticeHtml) ? _crumbNoticeHtml() : "";
    el.innerHTML = notice;
    return;
  }

  const m = MODULES[curModule];
  const sub = curView ? findMenuNode(curModule, curView) : null;
  const onSubPage = !!sub;

  /* v6.2：子系统窗口在首页时不再渲染「本系统 / 本系统」重复两级——
   * 有下级才把本系统名作为可点击一级，否则只由下面 else 分支输出一个纯文本节点 */
  if (inSub) {
    if (onSubPage) nodes.push(`<span class="crumb-link" onclick="selectModule('${curModule}')">${_escape(m.name)}</span>`);
  } else {
    nodes.push(`<span class="crumb-link" onclick="goHome()">${NAV.crumbPortal}</span>`);
  }

  if (onSubPage) {
    if (!inSub) {
      nodes.push(`<span class="crumb-link" onclick="selectModule('${curModule}')">${_escape(m.name)}</span>`);
    }
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

  // 返回条：仅三级子系统页显示「← 返回父级分组」；子系统二级页回门户走顶栏 Logo
  // （与主系统无壳行为对齐），主系统二级页仍显示「← 返回主系统」
  const backHtml = !onSubPage ? "" : (curSubSub
    ? `<div class="crumb-back"><button class="btn gray sm" onclick="selectSub('${curView}')">${NAV.backToGroup.replace('{group}', _escape(sub.name))}</button></div>`
    : (inSub ? "" : `<div class="crumb-back"><button class="btn gray sm" onclick="goHome()">${NAV.backToPortal}</button></div>`));
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

/* ---------- 主系统门户（平台首页 = 各子系统入口） ----------
 * 上下文感知：子系统窗口中 goHome 表示回到该子系统首页（不再是门户） */
function goHome() {
  if (typeof window !== "undefined" && window.__SUB_KEY) {
    selectModule(window.__SUB_KEY);
    return;
  }
  curApp = "";
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

/* ---------- 新窗口打开子系统（门户内部卡 / 常用应用 / 搜索进入等统一入口） ----------
 * 校验门户卡存在性与模块权限后 window.open 独立页面；外部卡直接打开外链 */
function openSubsystem(appKey, viewKey) {
  const app = typeof findPortalApp === "function" ? findPortalApp(appKey) : null;
  if (app && app.kind === "external") {
    if (app.url) window.open(app.url, "_blank");
    return;
  }
  const modKey = app ? app.mod : appKey;
  if (!modKey || !MODULES[modKey]) return;
  if (!canAccessModule(modKey)) {
    window.toast(TOAST.noPermAccess.replace('{role}', ROLES[CUR_ROLE].name).replace('{module}', MODULES[modKey].name));
    return;
  }
  const q = viewKey ? "?m=" + encodeURIComponent(viewKey) : "";
  window.open("subs/" + modKey + ".html" + q, "_blank");
}

/* ---------- 返回主系统门户 ----------
 * 子系统窗口：opener 存活则聚焦原门户标签，否则新开主门户；
 * 主系统窗口：等价于 goHome() */
function backToPortal() {
  if (typeof window !== "undefined" && window.__SUB_KEY) {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
        return;
      }
    } catch (e) {
      // 跨窗口访问被拒时走新开标签兜底
    }
    window.open("../index.html", "_blank");
    return;
  }
  goHome();
}

/* ---------- 选择一级板块（进入板块首页，铺开子系统磁贴） ---------- */
function selectModule(k) {
  /* 子系统窗口只允许停留在自己的模块树内 */
  if (typeof window !== "undefined" && window.__SUB_KEY && k !== window.__SUB_KEY) {
    k = window.__SUB_KEY;
  }
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
  /* 子系统窗口中 curApp 恒为当前子系统 key（供面包屑/持久化使用） */
  curApp = (typeof window !== "undefined" && window.__SUB_KEY) ? window.__SUB_KEY : "";
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
  if (typeof recordRecentVisit === "function") recordRecentVisit(curModule, v);
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
  if (typeof recordRecentVisit === "function") recordRecentVisit(curModule, subKey);
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
  if (typeof recordRecentVisit === "function") recordRecentVisit(curModule, v);
  renderCurrent();
}

/* ---------- 恢复路由状态（带权限校验，无权限则降级） ----------
 * 主系统窗口：读 oa_route，支持 URL 查询参数 ?m=&v=（跨窗口深链落地）；
 *    v1 遗留的壳态路由（app 非空）直接回门户——子系统已改为独立窗口。
 * 子系统窗口：读 oa_route::<app>，只恢复本子系统内的深层路由。 */
function restoreRoute() {
  const inSub = !!(typeof window !== "undefined" && window.__SUB_KEY);
  let saved = null;
  try {
    const raw = sessionStorage.getItem(_routeKey());
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    // 忽略
  }

  if (inSub) {
    const appKey = window.__SUB_KEY;
    curApp = appKey;
    curModule = appKey;
    if (!saved || !saved.v) {
      curView = "";
      curSubSub = "";
      syncViewState();
      saveRoute();
      renderModulePage();
      return;
    }
    const sub = findMenuNode(curModule, saved.v);
    if (!sub || !hasRole(curModule, saved.v)) {
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
    return;
  }

  /* 主系统窗口：URL 查询参数优先（?m=sys&v=sysAcct 等跨窗口深链） */
  let qMod = "", qView = "";
  try {
    const qs = new URLSearchParams(window.location.search || "");
    qMod = qs.get("m") || "";
    qView = qs.get("v") || "";
  } catch (e) {
    // 忽略
  }
  if (qMod && MODULES[qMod] && canAccessModule(qMod)) {
    curApp = "";
    curModule = qMod;
    const sub = qView ? findMenuNode(curModule, qView) : null;
    if (qView && sub && hasRole(curModule, qView)) {
      curView = qView;
      curSubSub = "";
    } else {
      curView = "";
      curSubSub = "";
    }
    __searchQuery = "";
    __searchSrc = "";
    syncViewState();
    saveRoute();
    document.getElementById("app").style.display = "flex";
    document.getElementById("view-login").style.display = "none";
    if (curView) renderCurrent(); else renderModulePage();
    return;
  }

  /* v1 遗留：壳态路由（app 非空）→ 子系统已独立成窗口，主系统直接回门户 */
  if (saved && saved.app) {
    goHome();
    return;
  }

  if (!saved || !saved.m) {
    goHome();
    return;
  }

  /* 搜索页恢复优先于模块降级：刷新后应回到搜索结果页（模块仅作返回上下文） */
  if (saved.s) {
    const mk = (saved.m !== "home" && MODULES[saved.m] && canAccessModule(saved.m)) ? saved.m : "home";
    curModule = mk;
    curApp = "";
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
  curApp = "";
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
        <button class="btn gray" onclick="goHome()">${NAV.backToPortal}</button>
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
  /* 子系统窗口：当前子系统被收回权限 → 出门控页（无权访问） */
  if (typeof window !== "undefined" && window.__SUB_KEY) {
    if (!canAccessModule(window.__SUB_KEY)) {
      if (typeof window.showSubGate === "function") window.showSubGate("noperm");
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
    return;
  }
  /* 主系统窗口：模块被收回权限 → 回门户 */
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
  window.curApp = curApp;
}

/* ---------- 挂载到 window ---------- */
window.selectModule = selectModule;
window.selectSub = selectSub;
window.selectSubSub = selectSubSub;
window.selectActionSub = selectActionSub;
window.go = go;
window.goHome = goHome;
window.openSubsystem = openSubsystem;
window.backToPortal = backToPortal;
window.renderCurView = renderCurView;
window.restoreRoute = restoreRoute;
window.clearRoute = clearRoute;
window.getFirstAccessibleModule = getFirstAccessibleModule;

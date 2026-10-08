/* ========== 路由导航 ========== */

/* ---------- 路由持久化 key ---------- */
const ROUTE_KEY = "oa_route";

/* ---------- 当前模块/视图状态（三级：module → sub → subsub） ---------- */
let curModule = "dev";
let curView = "std";
let curSubSub = "";
let __routeQuery = null;

/* ---------- 辅助：从模块的可见子菜单中找第一个 external sub ---------- */
function _getFirstExternalSub(modKey) {
  const m = MODULES[modKey];
  if (!m || !m.subs || !m.subs.length) return null;
  const visibleSubs = m.subs.filter((s) => hasRole(modKey, s.key));
  const firstExt = visibleSubs.find((s) => s.type === "external" && s.url);
  return firstExt || null;
}

/* ---------- 辅助：判断模块的所有可见子菜单是否都是 external ---------- */
function _allSubsExternal(modKey) {
  const m = MODULES[modKey];
  if (!m || !m.subs || !m.subs.length) return false;
  const visibleSubs = m.subs.filter((s) => hasRole(modKey, s.key));
  return visibleSubs.length > 0 && visibleSubs.every((s) => s.type === "external" && s.url);
}

/* ---------- 辅助：获取某 sub 下有权限的第一个三级 sub ---------- */
function _getFirstAccessibleSubSub(modKey, subKey) {
  const m = MODULES[modKey];
  const sub = (m && m.subs) ? m.subs.find((s) => s.key === subKey) : null;
  if (!sub || !sub.subs || !sub.subs.length) return null;
  const perms = ROLES[CUR_ROLE] && ROLES[CUR_ROLE].perms;
  const subPerm = perms && perms[modKey] && perms[modKey].subs ? perms[modKey].subs[subKey] : null;
  for (const ss of sub.subs) {
    if (subPerm === true) return ss.key;
    if (subPerm && typeof subPerm === "object" && subPerm.subs && subPerm.subs[ss.key] === true) return ss.key;
  }
  return null;
}

/* ---------- 持久化当前路由到 sessionStorage ---------- */
function saveRoute() {
  try {
    sessionStorage.setItem(ROUTE_KEY, JSON.stringify({ m: curModule, v: curView, ss: curSubSub }));
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
    if (canAccessModule(k)) return k;
  }
  return null;
}

/* ---------- 恢复路由状态（带权限校验，无权限则降级） ---------- */
function restoreRoute() {
  let saved = null;
  try {
    const raw = sessionStorage.getItem(ROUTE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    // 忽略
  }
  if (!saved || !saved.m || !saved.v) {
    const firstKey = getFirstAccessibleModule();
    if (!firstKey) {
      window.toast("当前角色无任何可访问菜单，请联系管理员");
      window.logout && window.logout();
      return;
    }
    selectModule(firstKey);
    return;
  }
  if (!canAccessModule(saved.m)) {
    const firstKey = getFirstAccessibleModule();
    if (!firstKey) {
      window.toast("当前角色无任何可访问菜单，请联系管理员");
      window.logout && window.logout();
      return;
    }
    selectModule(firstKey);
    return;
  }
  curModule = saved.m;
  curSubSub = saved.ss || "";
  syncViewState();
  const m = MODULES[curModule];
  const sidebar = document.getElementById("sidebar");
  if (!m.subs || m.subs.length === 0) {
    sidebar.style.display = "none";
    renderTop();
    goHome();
    return;
  }
  const visibleSubs = m.subs.filter((s) => hasRole(curModule, s.key));
  const targetSub = visibleSubs.find((s) => s.key === saved.v);
  curView = targetSub ? targetSub.key : (visibleSubs[0] || m.subs[0]).key;
  // 如果持久化的三级 sub 无权限或不存在，降级到该 sub 下第一个有权限的三级
  const curSubObj = (m.subs || []).find((s) => s.key === curView);
  if (curSubObj && curSubObj.subs && curSubObj.subs.length > 0) {
    const hasSubSub = curSubObj.subs.some((ss) => ss.key === curSubSub && hasRole(curModule, curView, ss.key));
    if (!hasSubSub) {
      curSubSub = _getFirstAccessibleSubSub(curModule, curView) || "";
    }
  } else {
    curSubSub = "";
  }
  sidebar.style.display = "flex";
  renderTop();
  renderSide();
  go(curView, false);
}

/* ---------- 渲染顶部一级菜单（按角色过滤） ---------- */
function renderTop() {
  const t = document.getElementById("topmenu");
  t.innerHTML = Object.entries(MODULES)
    .filter(([k]) => canAccessModule(k))
    .map(
      ([k, m]) => {
        if (m.type === "external" && m.url) {
          return `<div class="topitem" onclick="window.open('${m.url}', '_blank')" title="外部系统">${m.name} ↗</div>`;
        }
        return `<div class="topitem ${k === curModule ? "active" : ""}" onclick="selectModule('${k}')">${m.name}</div>`;
      },
    )
    .join("");
}

/* ---------- 渲染左侧二级菜单（支持三级 subs 渲染，按角色过滤） ---------- */
function renderSide() {
  const m = MODULES[curModule];
  document.getElementById("sideTitle").innerText = m.name;
  document.getElementById("sideNav").innerHTML = (m.subs || [])
    .filter((s) => hasRole(curModule, s.key))
    .map((s) => {
      // 外部链接子菜单
      if (s.type === "external" && s.url) {
        return `<div class="sitem" onclick="window.open('${s.url}', '_blank')" title="外部系统"><span class="ic">${s.icon}</span><span class="sl">${s.name} ↗</span></div>`;
      }
      // 带 action 的子菜单
      if (s.action) {
        return `<div class="sitem ${s.key === curView ? "active" : ""}" onclick="selectActionSub('${s.key}')"><span class="ic">${s.icon}</span><span class="sl">${s.name}</span></div>`;
      }
      // 有三级 subs 的父级菜单 —— 点击只展开/收起，不打开页面
      const thirdSubs = (s.subs || []).filter((ss) => hasRole(curModule, s.key, ss.key));
      if (thirdSubs.length > 0) {
        const isOpen = curView === s.key;
        const thirdHtml = thirdSubs
          .map((ss) => `<div class="sitem subsub ${curSubSub === ss.key && isOpen ? "active" : ""}" onclick="selectSubSub('${s.key}', '${ss.key}')"><span class="ic">${ss.icon || "📄"}</span><span class="sl">${ss.name}</span></div>`)
          .join("");
        return `
          <div class="side-third-group ${isOpen ? "open" : ""}">
            <div class="sitem side-third-header ${isOpen && !curSubSub ? "active" : ""}" onclick="toggleSideGroup(this)">
              <span class="ic">${s.icon}</span><span class="sl">${s.name}</span>
              <span class="side-caret">▼</span>
            </div>
            <div class="side-third-body ${isOpen ? "" : "collapsed"}">${thirdHtml}</div>
          </div>`;
      }
      // 普通无子级的二级菜单 —— 点击打开页面
      return `<div class="sitem ${s.key === curView && !curSubSub ? "active" : ""}" onclick="selectSub('${s.key}')"><span class="ic">${s.icon}</span><span class="sl">${s.name}</span></div>`;
    })
    .join("");
}

/* ---------- 处理带 action 字段的子菜单点击 ---------- */
function selectActionSub(v) {
  const m = MODULES[curModule];
  const sub = (m.subs || []).find((s) => s.key === v);
  if (sub && sub.action && typeof window[sub.action] === "function") {
    window[sub.action]();
  }
}

/* ---------- 切换左侧三级菜单组的展开/收起（只切换 DOM，不触发路由） ---------- */
function toggleSideGroup(headerEl) {
  const group = headerEl.closest(".side-third-group");
  if (!group) return;
  const body = group.querySelector(".side-third-body");
  if (!body) return;
  body.classList.toggle("collapsed");
  const nowOpen = !body.classList.contains("collapsed");
  group.classList.toggle("open", nowOpen);
}

/* ---------- 同步当前视图状态到 window ---------- */
function syncViewState() {
  window.curModule = curModule;
  window.curView = curView;
  window.curSubSub = curSubSub;
}

/* ---------- 选择一级模块 ---------- */
function selectModule(k) {
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
  curSubSub = "";
  syncViewState();
  saveRoute();
  const sidebar = document.getElementById("sidebar");
  if (!m.subs || m.subs.length === 0) {
    sidebar.style.display = "none";
    renderTop();
    goHome();
  } else {
    sidebar.style.display = "flex";
    const first = m.subs.find((s) => hasRole(k, s.key)) || m.subs[0];
    curView = first.key;
    curSubSub = _getFirstAccessibleSubSub(k, first.key) || "";
    renderTop();
    renderSide();
    go(curView, false);
  }
}

/* ---------- 选择二级菜单 ---------- */
function selectSub(v) {
  const m = MODULES[curModule];
  const sub = (m.subs || []).find((s) => s.key === v);
  if (sub && sub.type === "external" && sub.url) {
    window.open(sub.url, "_blank");
    return;
  }
  curView = v;
  curSubSub = _getFirstAccessibleSubSub(curModule, v) || "";
  syncViewState();
  saveRoute();
  renderSide();
  go(v, false);
}

/* ---------- 选择三级菜单 ---------- */
function selectSubSub(subKey, subSubKey) {
  curView = subKey;
  curSubSub = subSubKey;
  syncViewState();
  saveRoute();
  renderSide();
  go(subKey, false);
}

/* ---------- 路由切换（go 内部处理三级路由） ---------- */
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
  curView = v;
  syncViewState();
  saveRoute();
  const m = MODULES[curModule];
  const curSub = m && m.subs ? m.subs.find((x) => x.key === v) : null;
  let html;
  // 三级路由优先：curSubSub 存在且有权限
  if (curSubSub && curSub && curSub.subs) {
    const curSS = curSub.subs.find((x) => x.key === curSubSub);
    if (curSS && hasRole(curModule, v, curSubSub)) {
      if (curSS.type === "external" && curSS.url) {
        html = renderPlaceholder();
      } else if (typeof VIEWS[curSubSub] === "function") {
        html = VIEWS[curSubSub]();
      } else {
        html = renderPlaceholder();
      }
    } else {
      curSubSub = "";
      html = _goInternal(m, curSub, v);
    }
  } else {
    html = _goInternal(m, curSub, v);
  }
  document.getElementById("content").innerHTML = html;
  const modName = m.name;
  let crumbText;
  if (curSubSub && curSub) {
    const curSS = curSub.subs.find((x) => x.key === curSubSub);
    const menuInfo = findMenuBySubKey(v, curSubSub);
    const subName = menuInfo ? menuInfo.subName : (curSub.name || "");
    const ssName = curSS ? curSS.name : "";
    crumbText = fromHome ? NAV.crumbHome : `${modName} / ${subName} <b>/ ${ssName}</b>`;
  } else {
    const menuInfo = findMenuBySubKey(v);
    const subName = menuInfo ? (menuInfo.subName || menuInfo.modName) : "";
    crumbText = fromHome ? NAV.crumbHome : `${modName} / <b>${subName}</b>`;
  }
  document.getElementById("crumb").innerHTML = crumbText;
  renderSide();
}

/* ---------- go() 内部辅助：处理非三级的普通路由 ---------- */
function _goInternal(m, curSub, v) {
  if (curSub && curSub.type === "external" && curSub.url) {
    return renderPlaceholder();
  }
  if (m && _allSubsExternal(curModule)) {
    return renderPlaceholder();
  }
  if (typeof VIEWS[v] === "function") {
    return VIEWS[v]();
  }
  return renderPlaceholder();
}

function goHome() {
  curModule = "home";
  curView = "";
  curSubSub = "";
  syncViewState();
  saveRoute();
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.display = "none";
  renderTop();
  document.getElementById("app").style.display = "flex";
  document.getElementById("view-login").style.display = "none";
  document.getElementById("content").innerHTML = VIEWS.home();
  document.getElementById("crumb").innerHTML = "首页 / <b>平台总览</b>";
}

/* ---------- 占位视图：区分三种场景 ---------- */
function renderPlaceholder() {
  const m = MODULES[curModule];
  const curSub = m && m.subs ? m.subs.find((x) => x.key === curView) : null;

  if (m && _allSubsExternal(curModule)) {
    const visibleSubs = m.subs.filter((s) => hasRole(curModule, s.key));
    const listHtml = visibleSubs
      .map(
        (s) => `
        <div class="menu-sub-row" style="cursor:pointer" onclick="window.open('${s.url}', '_blank')">
          <span class="ms-ic">${s.icon || "🔗"}</span>
          <span class="ms-name">${s.name}</span>
          <span class="tag ext">外链</span>
          <span class="ms-sub muted" style="flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.url || ""}</span>
          <span style="margin-left:8px">↗</span>
        </div>`,
      )
      .join("");
    const firstExt = _getFirstExternalSub(curModule);
    const jumpBtn = firstExt
      ? `<button class="btn" onclick="window.open('${firstExt.url}', '_blank')">跳转第一个系统：${firstExt.name}</button>
         <button class="btn gray" onclick="goHome()" style="margin-left:12px">返回首页</button>`
      : `<button class="btn gray" onclick="goHome()">返回首页</button>`;
    return `
    <div class="page-title">${m.name}（外部子系统聚合）</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin:16px 0">
      ${jumpBtn}
    </div>
    <div class="menu-card">
      <div class="menu-card-head">
        <span> ${m.icon || "📦"} ${m.name}</span>
        <span class="tag ext">${visibleSubs.length} 个外链</span>
      </div>
      <div class="menu-card-body">${listHtml}</div>
    </div>`;
  }

  if (curSub && curSub.type === "external" && curSub.url) {
    return `
    <div class="page-title">${curSub.name}（外部子系统入口）</div>
    <div class="page-desc">该子系统由第三方独立部署，点击按钮将在新窗口打开其原有系统页面，已打通 SSO 免二次登录。</div>
    <div class="empty">
      <div style="font-size:15px;color:var(--title);margin-bottom:8px">🔗 目标地址</div>
      <div style="background:#f7f9fc;border:1px solid #e8eaec;border-radius:var(--radius);padding:12px 16px;color:#1890ff;word-break:break-all;font-size:13px;margin-bottom:20px">${curSub.url}</div>
      <div style="display:flex;gap:12px">
        <button class="btn" onclick="window.open('${curSub.url}', '_blank')">在新窗口打开 ${curSub.name} ↗</button>
        <button class="btn gray" onclick="goHome()">返回首页</button>
      </div>
    </div>`;
  }

  let name = "功能入口";
  if (curSub) name = curSub.name;
  else if (m && m.subs && m.subs.length) {
    const s = m.subs.find((x) => x.key === curView);
    if (s) name = s.name;
  }
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
  const topKeys = Object.keys(MODULES).filter((k) => canAccessModule(k));
  if (!topKeys.includes(curModule)) {
    curModule = topKeys[0] || "home";
    curSubSub = "";
    syncViewState();
    if (curModule === "home") {
      selectModule("home");
      return;
    }
  }
  const currentModule = MODULES[curModule];
  const hasSubs = currentModule.subs && currentModule.subs.length > 0;
  if (hasSubs) {
    const visibleSubs = currentModule.subs.filter((s) => hasRole(curModule, s.key));
    if (visibleSubs.length === 0) {
      curModule = topKeys[0] || "home";
      curSubSub = "";
      syncViewState();
      if (curModule === "home") {
        selectModule("home");
        return;
      }
    } else if (!visibleSubs.find((s) => s.key === curView)) {
      curView = visibleSubs[0].key;
      curSubSub = _getFirstAccessibleSubSub(curModule, curView) || "";
      syncViewState();
    } else {
      // 当前二级还在，检查三级
      if (curSubSub && !hasRole(curModule, curView, curSubSub)) {
        curSubSub = _getFirstAccessibleSubSub(curModule, curView) || "";
        syncViewState();
      }
    }
  }
  renderTop();
  renderSide();
  if (curModule === "home" || !hasSubs) {
    goHome();
  } else {
    go(curView, false);
  }
}

document.addEventListener('permschange', refreshAfterPermChange);

/* ---------- 重新渲染当前视图 ---------- */
function renderCurView() {
  if (curModule === "home" || !MODULES[curModule].subs || MODULES[curModule].subs.length === 0) {
    goHome();
  } else {
    go(curView, false);
  }
}

/* ---------- 挂载到 window ---------- */
window.selectModule = selectModule;
window.selectSub = selectSub;
window.selectSubSub = selectSubSub;
window.selectActionSub = selectActionSub;
window.toggleSideGroup = toggleSideGroup;
window.go = go;
window.goHome = goHome;
window.renderCurView = renderCurView;
window.restoreRoute = restoreRoute;
window.clearRoute = clearRoute;
window.getFirstAccessibleModule = getFirstAccessibleModule;
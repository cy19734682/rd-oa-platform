/* ========== 子系统窗口启动引导 · subsystem-boot.js ==========
 * 仅在 subs/<key>.html 加载（window.__SUB_KEY 由页面内联脚本先行设置）。
 * 职责：
 *   1. 数据层初始化（菜单 / 角色 / 权限同步 / 账号 / 部门 / 业务数据 / 公告）
 *   2. 门控：未登录 → 引导回主系统登录；无权限 → 无权访问提示
 *   3. 落页：URL ?m=&v= 深链优先 → oa_route::<app> 恢复 → 子系统首页
 *   4. chrome 渲染（子系统身份顶栏）+ 时钟 + 铃铛角标
 * 本文件必须在全部业务模块之后加载（运行时调用其加载与路由函数）。
 */
(function bootSubsystem() {
  const appKey = window.__SUB_KEY;
  if (!appKey) return;

  /* ---------- 数据层初始化（与 app.js 主链路对齐的子系统子集） ---------- */
  if (typeof loadMenus === "function") loadMenus();
  if (typeof window.loadPortal === "function") window.loadPortal();
  if (typeof loadRoles === "function") loadRoles();
  if (typeof window.syncPermsWithMenus === "function") window.syncPermsWithMenus();
  if (typeof loadAccounts === "function") loadAccounts();
  if (typeof loadDepts === "function") loadDepts();
  if (typeof window.loadAllAssets === "function") window.loadAllAssets();
  if (typeof window.loadAllPa === "function") window.loadAllPa();
  if (typeof window.loadAllStd === "function") window.loadAllStd();
  if (typeof window.loadAllEc === "function") window.loadAllEc();
  if (typeof window.loadAllNotices === "function") window.loadAllNotices();

  /* ---------- 门控（未登录 / 无权限） ---------- */
  function showSubGate(kind) {
    const gate = document.getElementById("sub-gate");
    const box = document.getElementById("subGateBox");
    const app = document.getElementById("app");
    if (app) app.style.display = "none";
    if (gate) gate.style.display = "flex";
    if (!box) return;
    const name = (typeof _subsystemName === "function") ? _subsystemName(appKey) : appKey;
    const icon = (typeof _subsystemIcon === "function") ? _subsystemIcon(appKey) : "📦";
    if (kind === "login") {
      box.innerHTML = `
        <div class="sub-gate-icon">${icon}</div>
        <div class="sub-gate-title">${_escape(name)}</div>
        <div class="sub-gate-desc">登录会话已失效，请先登录主系统后再进入本子系统</div>
        <div class="sub-gate-actions">
          <button class="btn" onclick="window.open('../index.html','_blank')">前往主系统登录</button>
          <button class="btn gray" onclick="location.reload()">重新进入</button>
        </div>`;
    } else {
      box.innerHTML = `
        <div class="sub-gate-icon">🔒</div>
        <div class="sub-gate-title">无权访问「${_escape(name)}」</div>
        <div class="sub-gate-desc">当前角色没有该子系统的访问权限，请联系系统管理员开通</div>
        <div class="sub-gate-actions">
          <button class="btn" onclick="window.open('../index.html','_blank')">返回主系统门户</button>
          <button class="btn gray" onclick="location.reload()">重新进入</button>
        </div>`;
    }
  }
  window.showSubGate = showSubGate;

  /* ---------- 会话与权限校验 ---------- */
  const restored = (typeof loadSession === "function") ? loadSession() : false;
  if (!restored) {
    showSubGate("login");
    return;
  }
  if (typeof canAccessModule !== "function" || !canAccessModule(appKey)) {
    showSubGate("noperm");
    return;
  }

  /* ---------- 正常启动 ---------- */
  const gate = document.getElementById("sub-gate");
  const app = document.getElementById("app");
  if (gate) gate.style.display = "none";
  if (app) app.style.display = "flex";
  /* 主题配色：按门户配置（菜单管理 → 门户配置 → 主题配色）注入 CSS 变量，
   * 覆盖 subs css 的 :root 静态默认，使本窗口 chrome / 按钮 / 高亮跟随配置 */
  if (typeof applySubsystemTheme === "function") applySubsystemTheme(appKey);
  if (typeof window.renderSubsystemChrome === "function") window.renderSubsystemChrome(appKey);

  /* 顶部实时时钟（app.js 的 startClock 不随子系统页加载，此处本地实现） */
  const clockEl = document.getElementById("topClock");
  if (clockEl) {
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    const tick = () => {
      const now = new Date();
      const p = (n) => String(n).padStart(2, "0");
      clockEl.textContent = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} 周${weekDays[now.getDay()]} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }
  if (typeof window.updateBellBadge === "function") window.updateBellBadge();

  /* ---------- 落页：URL 深链参数优先，其次路由恢复，最后子系统首页 ---------- */
  curApp = appKey;
  curModule = appKey;
  let qView = "";
  try {
    const qs = new URLSearchParams(window.location.search || "");
    qView = qs.get("m") || "";
  } catch (e) {
    // 忽略
  }
  if (qView) {
    const sub = (typeof findMenuNode === "function") ? findMenuNode(appKey, qView) : null;
    if (sub && typeof hasRole === "function" && hasRole(appKey, qView)) {
      curView = qView;
      curSubSub = "";
      syncViewState();
      saveRoute();
      renderCurrent();
    } else {
      curView = "";
      curSubSub = "";
      syncViewState();
      saveRoute();
      renderModulePage();
    }
  } else if (typeof restoreRoute === "function") {
    restoreRoute();
  } else {
    renderModulePage();
  }
})();

/* ========== 研发OA综合平台 · 入口 ========== */

// 副作用导入：执行 views.js 中的 VIEWS 填充逻辑

/* ---------- 事件委托：统一处理内容区的交互，避免每次渲染后重新绑定 ---------- */
document.getElementById("content").addEventListener("input", (e) => {
  const inp = e.target;
  if (inp.classList.contains("pm") || inp.classList.contains("sup")) {
    const i = inp.dataset.i;
    const pm =
      Number(document.querySelector(`#content .pm[data-i="${i}"]`).value) || 0;
    const sup =
      Number(document.querySelector(`#content .sup[data-i="${i}"]`).value) || 0;
    const lead = document.querySelector(`#content .lead[data-i="${i}"]`);
    if (lead) lead.value = Math.max(pm, sup);
  }
});

/* ---------- 实时时钟 ---------- */
function startClock() {
  const el = document.getElementById("topClock");
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const tick = () => {
    if (!el) return;
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    el.textContent = `${y}-${mo}-${d} 周${weekDays[now.getDay()]} ${h}:${mi}:${s}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- 初始化 ---------- */
(function init() {
  // 加载菜单表（角色 perms 依赖 MENUS 结构，必须最先加载）
  loadMenus();
  // 加载角色列表（角色内嵌 perms，无则按 MENUS 默认值初始化并写回 sessionStorage）
  loadRoles();
  // 同步 perms：补齐菜单变更带来的新/缺失 key
  if (typeof window.syncPermsWithMenus === "function") window.syncPermsWithMenus();
  // 加载账号列表（持久化到 sessionStorage，支持账号管理页和登录鉴权）
  loadAccounts();
  // 加载部门列表（持久化到 sessionStorage，支持部门管理页）
  if (typeof loadDepts === "function") loadDepts();
  // 动态渲染登录页演示账号（依赖 ACCOUNTS 数据，必须在 loadAccounts 之后）
  if (typeof window.renderDemoAccounts === "function") window.renderDemoAccounts();
  // 加载过程资产模块数据（持久化到 localStorage，关闭浏览器不丢失）
  if (typeof window.loadAllAssets === "function") window.loadAllAssets();
  // 加载绩效管理模块数据（持久化到 sessionStorage）
  if (typeof window.loadAllPa === "function") window.loadAllPa();
  // 加载标准库模块数据（持久化到 sessionStorage）
  if (typeof window.loadAllStd === "function") window.loadAllStd();
  // 加载经验案例库模块数据（持久化到 sessionStorage）
  if (typeof window.loadAllEc === "function") window.loadAllEc();
  // 尝试从 sessionStorage 恢复登录会话，否则展示登录页
  const restored = loadSession();
  if (restored) {
    document.getElementById("view-login").style.display = "none";
    document.getElementById("app").style.display = "flex";
    // 恢复上次浏览的路由（带权限校验，无权限自动降级）
    restoreRoute();
    // 会话恢复后更新铃铛角标并弹窗提醒待办事项
    window.updateBellBadge && window.updateBellBadge();
    setTimeout(() => { window.showLoginTodoModal && window.showLoginTodoModal(); }, 300);
  } else {
    document.getElementById("app").style.display = "none";
    document.getElementById("view-login").style.display = "flex";
  }
  // 启动顶部实时时钟
  startClock();
})();
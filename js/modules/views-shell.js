/* ========== 子系统页 chrome · views-shell.js ==========
 * 职责（v2 窗口级分离）：子系统是独立 HTML 页面（subs/<key>.html），
 *   本文件负责把子系统页顶栏渲染为该子系统身份——
 *   ① Logo 区为主系统同款 SVG（静态写在各 subs/<key>.html 壳中），
 *      本文件仅把「子系统名称」填入 span#subLogoName（取自门户卡配置，回退 MODULES）；
 *   ② 「← 返回主系统」按钮已移除（v5.5），返回门户改为点击 Logo（backToPortal，
 *      opener 存活则聚焦原门户标签，否则新开主门户）。
 * 设计约束：
 *   - 子系统页为静态壳：chrome 只在启动时渲染一次，路由切换不重建
 *   - 顶栏右侧（时钟 / 铃铛 / 头像）为全平台常驻，与主系统一致；
 *     搜索框仅研发公共（dev）/ 过程资产（asset）子系统保留，且只搜本子系统内容
 *   - 主系统门户不再进壳（子系统全部走新窗口），v1 的 apply/exit/sync 三函数已移除
 * 本文件必须在 router.js 之后、subsystem-boot.js 之前加载。
 */

/** 顶栏 logo 元素（子系统页 .header > .logo） */
function _shellLogoEl() {
  if (typeof document === "undefined" || !document.querySelector) return null;
  return document.querySelector("#app .header .logo");
}

/** 子系统名 span（静态壳中已内置主系统同款 SVG，此处只填名称文本） */
function _shellLogoNameEl() {
  if (typeof document === "undefined" || !document.querySelector) return null;
  return document.querySelector("#app .header .logo #subLogoName");
}

/** 子系统名（门户卡配置优先，回退 MODULES 名称） */
function _subsystemName(appKey) {
  const app = typeof findPortalApp === "function" ? findPortalApp(appKey) : null;
  if (app && app.name) return app.name;
  if (typeof MODULES !== "undefined" && MODULES[appKey]) return MODULES[appKey].name;
  return appKey;
}

/** 子系统图标（门控页等场景使用；顶栏 Logo 已改主系统同款 SVG，不再用图标） */
function _subsystemIcon(appKey) {
  const app = typeof findPortalApp === "function" ? findPortalApp(appKey) : null;
  if (app && app.icon) return app.icon;
  if (typeof MODULES !== "undefined" && MODULES[appKey] && MODULES[appKey].icon) return MODULES[appKey].icon;
  return "📦";
}

/** 渲染子系统页 chrome：填充 Logo 区名称（SVG 图标为静态壳内置，不覆写） */
function renderSubsystemChrome(appKey) {
  const nameEl = _shellLogoNameEl();
  if (nameEl) nameEl.textContent = _subsystemName(appKey);
  if (typeof document !== "undefined" && document.body && document.body.classList) {
    document.body.classList.add("in-subsystem");
  }
}

/* ---------- 挂载到 window ---------- */
window.renderSubsystemChrome = renderSubsystemChrome;

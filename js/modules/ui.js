/* ========== 通用 UI 工具函数 ========== */


/** Toast 提示（底部居中，2.2 秒自动消失） */
function toast(m) {
  const t = document.getElementById("toast");
  t.innerText = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

/** 打开模态弹窗
 * @param {string} h - modalContent() 生成的 HTML
 * @param {string|number|object} [options] - 宽度字符串(如 "960px")或数字，也可传 { width: string|number, fullscreen: boolean }
 */
function openModal(h, options) {
  const m = document.getElementById("modal");
  const mask = document.getElementById("mask");
  m.innerHTML = h;

  let width, fullscreen;
  if (options && typeof options === "object") {
    width = options.width;
    fullscreen = !!options.fullscreen;
  } else {
    width = options;
    fullscreen = false;
  }

  if (width !== undefined && width !== null && width !== "") {
    m.style.width = typeof width === "number" ? `${width}px` : width;
  } else {
    m.style.width = "";
  }

  mask.classList.toggle("fullscreen", fullscreen);
  mask.style.display = "flex";
}

/** 关闭模态弹窗 */
function closeModal() {
  const mask = document.getElementById("mask");
  mask.style.display = "none";
  mask.classList.remove("fullscreen");
  const m = document.getElementById("modal");
  if (m) m.style.width = "";
}

/** 案例审核 - 退回弹窗（避免内联 onclick 多层转义） */
function showReturnModal() {
  openModal(
    modalContent(
      UI.returnTitle,
      formRow("退回原因", `<textarea id="returnReason" rows="3" placeholder="${UI.returnPlaceholder}"></textarea>`, true, "请如实填写退回原因，提交后通知提交人"),
      `${btn("取消", "gray", "closeModal()")} ${btn(BTN.confirmReturn, "", `closeModal();toast('${TOAST.ecReturnOk}')`)}`,
    ),
  );
}

/** 切换头像下拉菜单 */
function toggleAvatar(e) {
  e.stopPropagation();
  const m = document.getElementById("avatarMenu");
  if (m) {
    m.style.display = m.style.display === "block" ? "none" : "block";
  }
}

/** 关闭头像下拉菜单 */
function closeAvatarMenu() {
  const m = document.getElementById("avatarMenu");
  if (m) m.style.display = "none";
}

/** 切换左侧边栏收起/展开 */
function toggleSide() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

/* ---------- 全局事件绑定 ---------- */

// 点击页面关闭头像下拉菜单
document.addEventListener("click", closeAvatarMenu);

// ESC 键关闭弹窗
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const mask = document.getElementById("mask");
    if (mask && mask.style.display === "flex") closeModal();
  }
});

/* ---------- 挂载到 window（供 HTML 内联 onclick 调用） ---------- */
window.toast = toast;
window.closeModal = closeModal;
window.openModal = openModal;
window.toggleAvatar = toggleAvatar;
window.closeAvatarMenu = closeAvatarMenu;
window.toggleSide = toggleSide;
window.showReturnModal = showReturnModal;
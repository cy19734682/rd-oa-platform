/* ========== 绩效管理模块 · 打分流转（views-pa-flow.js） ========== */
/* 拆分自原 views-pa.js。包含打分 UI 同步（_syncPaTblFromUI / refreshPaTableModal）、
 * 自评→主管→PM→领导终评的提交与回退流转（confirmPaSelfFilled/submitPaTblSup/submitPaTblPM/
 * finalizePaTbl/confirmRollbackPaTbl/doRollbackPaTbl）与互评分数计算 calcPeerScores。 */

function _syncPaTblFromUI(tableId) {
  const t = window.findPaTable(tableId); if (!t) return false;
  const rows = document.querySelectorAll("#modal .tb tbody tr, #view .tb tbody tr");
  rows.forEach((tr) => {
    const i = Number(tr.querySelector(".t-pm")?.dataset.i);
    if (isNaN(i) || !t.items[i]) return;
    t.items[i].task = tr.querySelector(".t-task")?.value.trim() || t.items[i].task;
    t.items[i].pm = tr.querySelector(".t-pm").value.trim();
    t.items[i].sup = tr.querySelector(".t-sup").value.trim();
    t.items[i].leader = tr.querySelector(".t-leader").value.trim();
    t.items[i].pmComment = tr.querySelector(".t-pmc").value.trim();
    t.items[i].supComment = tr.querySelector(".t-supc").value.trim();
    t.items[i].leaderComment = tr.querySelector(".t-leadc").value.trim();
  });
  window.updatePaTable(tableId, { items: t.items });
  return true;
}

function refreshPaTableModal() {
  const modal = document.getElementById("modal");
  if (modal && modal.querySelector(".modal-body")) {
    modal.querySelector(".modal-body").innerHTML = _buildPaTableModalBody(__paType);
  }
  replaceView();
}

function confirmPaSelfFilled() {
  const t = window.findPaTableByPeriod(__paPeriod, __paOwnerId, __paType); if (!t) return;
  _syncPaTblFromUI(t.id);
  const ok = window.selfFillPaTable(t.id);
  if (!ok) { toast("确认失败"); return; }
  toast("任务项已确认，等待主管打分"); refreshPaTableModal();
}

function submitPaTblSup() {
  const t = window.findPaTableByPeriod(__paPeriod, __paOwnerId, __paType); if (!t) return;
  _syncPaTblFromUI(t.id);
  const ok = window.submitPaTableSup(t.id, "sup", "直接主管");
  if (!ok) { toast("还有未打分的项"); return; }
  toast("主管已提交，等待PM打分"); refreshPaTableModal();
}
function submitPaTblPM() {
  const t = window.findPaTableByPeriod(__paPeriod, __paOwnerId, __paType); if (!t) return;
  _syncPaTblFromUI(t.id);
  const ok = window.submitPaTablePM(t.id, "pm", "项目经理");
  if (!ok) { toast("还有未打分的项"); return; }
  toast("PM 已提交，等待领导归档"); refreshPaTableModal();
}
function finalizePaTbl() {
  const t = window.findPaTableByPeriod(__paPeriod, __paOwnerId, __paType); if (!t) return;
  _syncPaTblFromUI(t.id);
  const comment = document.getElementById("tbl_comment")?.value.trim() || "";
  const calc = window.finalizePaTableByLeader(t.id, "leader", "部门领导", comment);
  if (!calc) { toast("领导打分有未填项"); return; }
  toast(`完成！加权得分 ${calc.score} · 等级 ${calc.grade}`); refreshPaTableModal();
}
function restorePaTableModal() {
  const modal = document.getElementById("modal");
  if (modal && __paModalBackup) {
    modal.innerHTML = __paModalBackup;
  }
}
function confirmRollbackPaTbl(id, target) {
  const t = window.findPaTable(id); if (!t) return;
  const rollbackMap = {
    pending: "打回给被考核人（任务项重新编辑，打分清零）",
    selfFilled: "打回给主管（后续打分清零）",
    supDone: "打回给PM（PM/领导打分清零）",
    pmDone: "打回给领导（仅领导打分清零）",
  };
  const targetText = rollbackMap[target] || "打回考核表";
  __paModalBackup = document.getElementById("modal")?.innerHTML || "";
  openModal(modalContent("确认打回",
    `<p><b>${t.ownerName}</b> · ${t.period}</p><p>${targetText}</p>`,
    `${btn(BTN.cancel, "gray", "restorePaTableModal()")} ${btn("确认打回", "danger", `doRollbackPaTbl('${id}', '${target}')`)}`));
}
function doRollbackPaTbl(id, target) {
  window.rollbackPaTable(id, target);
  restorePaTableModal();
  toast("已打回");
  refreshPaTableModal();
}
function calcPeerScores(id) {
  window.autoCalcPeerScores(id); toast("已计算互评平均分"); refreshPaTableModal();
}


/* ---------- window 挂载 ---------- */
window._syncPaTblFromUI = _syncPaTblFromUI;
window.refreshPaTableModal = refreshPaTableModal;
window.confirmPaSelfFilled = confirmPaSelfFilled;
window.submitPaTblSup = submitPaTblSup;
window.submitPaTblPM = submitPaTblPM;
window.finalizePaTbl = finalizePaTbl;
window.restorePaTableModal = restorePaTableModal;
window.confirmRollbackPaTbl = confirmRollbackPaTbl;
window.doRollbackPaTbl = doRollbackPaTbl;
window.calcPeerScores = calcPeerScores;

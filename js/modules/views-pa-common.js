/* ========== 绩效管理模块 · 公共工具（views-pa-common.js） ========== */
/* 拆分自原 views-pa.js。包含：
 *   页面级状态变量（__paPeriod/__paOwnerId/__paType/__paView/__paTplType/__paTplRole 等，
 *     被 views.js 首页与其余 views-pa-*.js 共用，本文件必须首先加载）
 *   绩效模块格式化工具 _paTypeLabel / _paGroupRowspan
 *   已废弃的人员库入口（统一跳转系统账号管理）。
 * 注：_fmtDate / _foldText / _paStatusTag 已上提至 views.js 基座（旧副本已删除，避免同名声明相互覆盖）。 */

/* ---------- 绩效考核 ---------- */

/* 注：_fmtDate / _foldText / _paStatusTag 已上提至 views.js 基座，此处旧副本已移除 */

/* 页面级状态变量（与 views.js 首页及其余 views-pa-*.js 共用） */
let __paPeriod = null;
let __paOwnerId = null;
let __paType = "monthly";
let __paView = "list";
let __paTplType = "";
let __paTplRole = "";
let __paResultOwnerFilter = "";
let __paResultKeyword = "";
let __paResultStart = "";
let __paResultEnd = "";
let __paResultType = "";
let __paModalBackup = "";

/** 通用：根据考核表的 typeLabel / type 输出可读名称 */
function _paTypeLabel(type, typeLabel) {
  if (typeLabel) return typeLabel;
  const map = { monthly: "月度", yearly: "年终", quarterly: "季度", project: "项目", peer: "互评" };
  return map[type] || type || "";
}

/**
 * 通用：计算 items 中每个 item 的 group 合并行数（rowspan）
 * 返回与 items 等长的数组，每个元素：{ rowSpan: number, isFirst: boolean }
 * 同一 group（连续相同才算）第一行 rowSpan=总行数，其余 rowSpan=0（表示跳过该单元格）
 */
function _paGroupRowspan(items) {
  const result = [];
  let i = 0;
  while (i < items.length) {
    const curGroup = (items[i].group || "").trim();
    let j = i + 1;
    while (j < items.length && (items[j].group || "").trim() === curGroup) j++;
    const span = j - i;
    for (let k = i; k < j; k++) {
      result.push({ rowSpan: k === i ? span : 0, isFirst: k === i });
    }
    i = j;
  }
  return result;
}

/* ======== 人员库（已废弃：统一跳转系统账号管理） ======== */
function renderPaPeople() {
  // 人员管理已统一到系统管理-账号管理，旧路由自动跳转
  setTimeout(() => { window.go && window.go('sysAcct'); }, 50);
  return `<div class="empty">📌 人员管理已统一到「系统管理 → 账号管理」，正在跳转...</div>`;
}


/* ---------- VIEWS 注册 ---------- */
VIEWS.paPeople = renderPaPeople;

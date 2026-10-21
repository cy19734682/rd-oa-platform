/* ========== 绩效管理模块 · 互评管理（views-pa-peer.js） ========== */
/* 拆分自原 views-pa.js。包含互评人配置弹窗、互评管理页（renderPaPeerMgmt）、
 * 我的互评任务（renderPaPeerReview）与批量打分提交（saveAllPeerReviewScores）。 */


/* ======== 互评管理 - 全局变量 ======== */
var __paPeerYear = new Date().getFullYear();

/* ======== 互评管理 - 辅助函数 ======== */
function _formatPeerList(ids) {
  if (!ids || ids.length === 0) return "—";
  const people = window._paBuildPeople ? window._paBuildPeople() : [];
  return ids.map(function(id) {
    const p = people.find(function(x) { return x.id === id; });
    return p ? p.name + "(" + id + ")" : id;
  }).join("、");
}

function _ensurePeerYearlyTable(personId) {
  const tables = window.PA_TABLES || [];
  const t = window.findPaTableByPeriod ? window.findPaTableByPeriod(String(__paPeerYear), personId, "yearly") : null;
  if (t) return t;
  if (typeof window.createPaTable === "function") {
    return window.createPaTable({ type: "yearly", period: String(__paPeerYear), ownerId: personId });
  }
  return null;
}

/* ======== 互评管理页面 ======== */
function renderPaPeerMgmt() {
  const people = window._paBuildPeople ? window._paBuildPeople() : [];
  const curRole = window.CURR_ACCT_ROLE_KEY || "staff";
  const curDeptId = window.CURR_ACCT_DEPT_ID;
  // 编辑权限走平台权限体系（三级路径），自定义角色可在权限配置中授予
  const canEdit = window.currentCanAction("perf", "paYearlyMgmt", "paPeerMgmt", "edit");

  const allYearlyTables = (window.PA_TABLES || []).filter(function(t) { return t.type === "yearly"; });
  var allPeriods = [...new Set(allYearlyTables.map(function(t) { return t.period; }))].sort().reverse();
  if (allPeriods.indexOf(String(__paPeerYear)) === -1) {
    allPeriods.unshift(String(__paPeerYear));
  }
  if (typeof window.__peerMgmtPeriod === "undefined" || allPeriods.indexOf(window.__peerMgmtPeriod) === -1) {
    window.__peerMgmtPeriod = allPeriods[0] || String(new Date().getFullYear());
  }
  __paPeerYear = window.__peerMgmtPeriod;
  const curPeriod = String(__paPeerYear);

  const periodFilter = '<div class="card" style="margin-bottom:10px">'
    + filterGroup([
        { label: "考核周期", html: '<select class="ipt" onchange="window.__peerMgmtPeriod=this.value;replaceView()">'
          + allPeriods.map(function(p) { return '<option value="' + p + '" ' + (p === curPeriod ? "selected" : "") + '>' + p + "</option>"; }).join("")
          + "</select>" },
      ])
    + "</div>";

  var targets = people.filter(function(p) {
    if (p.roleKey !== "projManager" && p.roleKey !== "supervisor") return false;
    if (curRole === "deptLeader" && p.deptId !== curDeptId) return false;
    return true;
  }).sort(function(a, b) { return a.id.localeCompare(b.id); });

  var rows = targets.map(function(p) {
    var t = _ensurePeerYearlyTable(p.id);
    if (!t) return "";

    const peerIds = t.peerReviewers || [];
    const submitted = t.peerScores ? (t.peerScores.n || t.peerScores.submitted || 0) : 0;
    const total = peerIds.length;
    const avg = t.peerScores ? t.peerScores.avg : null;

    var statusTag;
    if (total === 0) {
      statusTag = '<span style="color:#999">未配置互评人</span>';
    } else if (submitted === total) {
      statusTag = '<span style="color:var(--ok)">已完成 (' + submitted + "/" + total + ")</span>";
    } else {
      statusTag = '<span style="color:#d48806">互评中 (' + submitted + "/" + total + ")</span>";
    }

    var ops = "";
    if (canEdit) {
      ops += btn("配置互评人", "sm", "openEditPeerReviewers('" + t.id + "')") + " ";
    }
    ops += btn("查看考核表", "ghost sm", "__paType='peer';openPaTableDetail('" + p.id + "', '" + t.period + "')");

    return "<tr>"
      + '<td style="white-space:nowrap"><b>' + _escape(p.name) + "</b>（" + _escape(p.id) + "）</td>"
      + "<td>" + _escape(p.role) + "</td>"
      + "<td>" + (p.dept ? _escape(p.dept) : "—") + "</td>"
      + "<td>" + (total > 0 ? _formatPeerList(peerIds) : '<span class="muted">未配置</span>') + "</td>"
      + "<td>" + statusTag + "</td>"
      + "<td>" + (avg != null ? '<b style="color:var(--ok)">' + avg + "</b>" : '<span class="muted">—</span>') + "</td>"
      + '<td>' + ops + "</td>"
      + "</tr>";
  }).join("");

  const needConfig = targets.filter(function(p) {
    const t = window.findPaTableByPeriod ? window.findPaTableByPeriod(curPeriod, p.id, "yearly") : null;
    return !t || !t.peerReviewers || t.peerReviewers.length === 0;
  }).length;

  return pageHeader(PAGES.paPeerMgmt.title, PAGES.paPeerMgmt.desc)
    + periodFilter
    + zone(
        '<div class="small muted" style="margin-bottom:12px">'
        + "📊 共 <b>" + targets.length + "</b> 人需互评"
        + (needConfig > 0 ? ' · <span style="color:#d48806">' + needConfig + " 人待配置互评人</span>" : "")
        + "</div>"
        + (targets.length > 0
          ? "<table class='tb'><thead><tr>"
            + TH.paPeerMgmt.map(function(h) { return "<th>" + h + "</th>"; }).join("")
            + "</tr></thead><tbody>" + rows + "</tbody></table>"
          : '<div class="empty" style="padding:40px">暂无需互评对象</div>'),
        "互评管理 · " + curPeriod + " 年度"
      );
}

/* ======== 编辑互评人弹窗 ======== */
function openEditPeerReviewers(tableId) {
  const tables = window.PA_TABLES || [];
  const t = tables.find(function(x) { return x.id === tableId; });
  if (!t) { toast("考核表不存在"); return; }

  const people = window._paBuildPeople ? window._paBuildPeople() : [];
  const curRole = window.CURR_ACCT_ROLE_KEY;

  const canBePeer = function(p) {
    if (p.id === t.ownerId) return false;
    if (p.roleKey !== "supervisor" && p.roleKey !== "projManager") return false;
    if (curRole === "deptLeader" && p.deptId !== window.CURR_ACCT_DEPT_ID) return false;
    return true;
  };

  const candidates = people.filter(canBePeer);
  const selected = t.peerReviewers || [];

  const checklist = candidates.map(function(p) {
    const checked = selected.indexOf(p.id) >= 0 ? " checked" : "";
    return '<label style="display:inline-flex;align-items:center;gap:4px;margin:3px 6px 3px 0;padding:3px 8px;border-radius:4px;'
      + (checked ? "background:#e6f7ff;border:1px solid #91d5ff;" : "background:#fafafa;border:1px solid #eee;")
      + 'cursor:pointer" onmouseover="this.style.background=\'#e6f7ff\'" onmouseout="this.style.background=\'' + (checked ? "#e6f7ff" : "#fafafa") + '\'">'
      + '<input type="checkbox" value="' + p.id + '"' + checked + ' onchange="this.parentElement.style.background=this.checked?\'#e6f7ff\':\'#fafafa\';this.parentElement.style.borderColor=this.checked?\'#91d5ff\':\'#eee\'" />'
      + p.name + "(" + p.id + ') <span class="muted small">' + p.role + "</span>"
      + "</label>";
  }).join("");

  const html = '<div style="padding:16px">'
    + '<h3 style="margin:0 0 8px 0">📝 为 ' + t.ownerName + "(" + t.ownerId + ") 指定互评人</h3>"
    + '<div class="small muted" style="margin-bottom:12px">仅可选择主管 / 项目经理作为互评人（已排除本人）</div>'
    + '<div id="peerCheckList" style="max-height:360px;overflow:auto;border:1px solid #eee;border-radius:4px;padding:8px">'
    + (candidates.length > 0 ? checklist : '<div class="muted">暂无可选候选人</div>')
    + "</div>"
    + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">'
    + btn("取消", "gray sm", "closeModal()")
    + btn("保存", "sm", "savePeerReviewers('" + tableId + "')")
    + "</div>"
    + "</div>";

  openModal(html, { width: 600 });
}

/* ======== 保存互评人 ======== */
function savePeerReviewers(tableId) {
  const tables = window.PA_TABLES || [];
  const t = tables.find(function(x) { return x.id === tableId; });
  if (!t) { toast("考核表不存在"); return; }

  const cks = document.querySelectorAll("#peerCheckList input[type=checkbox]:checked");
  const ids = Array.from(cks).map(function(c) { return c.value; });
  t.peerReviewers = ids;
  if (typeof t.peerScoreDetails !== "object") t.peerScoreDetails = {};

  if (typeof window.savePaTables === "function") window.savePaTables();
  closeModal();
  toast("已保存互评人");
  replaceView();
}

/* ======== 我的互评任务 ======== */
function renderPaPeerReview() {
  const curUserId = window.CURR_ACCT_ID || "";
  const allTables = (window.PA_TABLES || []).filter(function(t) {
    if (t.type !== "yearly") return false;
    if (!t.peerReviewers || t.peerReviewers.indexOf(curUserId) === -1) return false;
    return true;
  });

  const tpl = window.findActivePaTemplate ? window.findActivePaTemplate("peer") : null;

  if (allTables.length === 0) {
    return pageHeader(PAGES.paPeerReview.title, PAGES.paPeerReview.desc)
      + '<div class="empty" style="padding:40px">暂无需您评分的互评考核</div>';
  }

  if (!tpl) {
    return pageHeader(PAGES.paPeerReview.title, PAGES.paPeerReview.desc)
      + '<div class="empty" style="padding:40px">系统未找到互评考核模板</div>';
  }

  const allPeriods = [...new Set(allTables.map(function(t) { return t.period; }))].sort().reverse();
  if (typeof window.__peerPeriod === "undefined" || allPeriods.indexOf(window.__peerPeriod) === -1) {
    window.__peerPeriod = allPeriods[0];
  }
  const curPeriod = window.__peerPeriod;

  const tables = allTables.filter(function(t) { return String(t.period) === String(curPeriod); });

  const periodFilter = '<div class="card" style="margin-bottom:10px">'
    + filterGroup([
        { label: "考核周期", html: '<select class="ipt" onchange="window.__peerPeriod=this.value;replaceView()">'
          + allPeriods.map(function(p) { return '<option ' + (p === curPeriod ? "selected" : "") + '>' + p + "</option>"; }).join("")
          + "</select>" },
        { label: "待评分", html: '<span class="small muted">' + tables.filter(function(t) { return !t.peerScoreDetails || !t.peerScoreDetails[curUserId]; }).length + " / " + tables.length + " 人</span>" },
      ])
    + "</div>";

  const headerCols = tables.map(function(t) {
    return '<th style="width:140px;text-align:center"><b>' + _escape(t.ownerName) + "</b><br/><span class='small muted'>" + _escape(t.ownerId) + "</span></th>";
  }).join("");

  const itemRows = tpl.items.map(function(it, i) {
    const scoreCells = tables.map(function(t) {
      const details = t.peerScoreDetails || {};
      const myScore = details[curUserId];
      const alreadySubmitted = !!myScore;
      const prev = myScore && myScore.items ? myScore.items[i] : {};
      const val = prev.score !== undefined ? prev.score : "";
      return '<td style="text-align:center">'
        + '<input class="ipt peer-score" data-tid="' + t.id + '" data-i="' + i + '" value="' + val + '" '
        + (alreadySubmitted ? "disabled" : "") + ' style="width:70px;text-align:center" placeholder="0-100" />'
        + '</td>';
    }).join("");

    return "<tr>"
      + '<td style="white-space:nowrap" title="' + _escape(it.standard || "") + '">'
      + '<span style="font-weight:500">' + _escape(it.category) + '</span>'
      + '<div class="small muted">' + _escape(it.group || "") + ' · 权重 ' + (it.weight || 0) + "</div>"
      + "</td>"
      + scoreCells
      + "</tr>";
  }).join("");

  const statusRow = "<tr style='background:#f8f9fa'>"
    + '<td style="font-weight:500">提交状态</td>'
    + tables.map(function(t) {
        const details = t.peerScoreDetails || {};
        const myScore = details[curUserId];
        if (myScore) {
          return '<td style="text-align:center;color:var(--ok);font-weight:500">已提交<br/>' + (myScore.score || "—") + " 分</td>";
        }
        return '<td style="text-align:center;color:#d48806">待评分</td>';
      }).join("")
    + "</tr>";

  const pendingTables = tables.filter(function(t) {
    return !t.peerScoreDetails || !t.peerScoreDetails[curUserId];
  });

  var submitBtn = "";
  if (pendingTables.length > 0) {
    submitBtn = '<div style="margin-top:12px;display:flex;gap:8px;align-items:center">'
      + btn("✅ 批量提交打分", "", "saveAllPeerReviewScores()")
      + '<span class="small muted">共 ' + pendingTables.length + " 人待评分（仅打分，无需写评价文字）</span>"
      + "</div>";
  } else {
    submitBtn = '<div style="margin-top:12px">' + lockNote("✅ 您已完成 " + curPeriod + " 年度全部互评打分") + "</div>";
  }

  return pageHeader(PAGES.paPeerReview.title, PAGES.paPeerReview.desc)
    + periodFilter
    + zone(
        '<div style="margin-bottom:8px" class="muted small">💡 行：考核项 / 列：被考核人，交叉单元格填写 0-100 分"批量提交打分"一次性提交</div>'
        + "<table class='tb'><thead><tr>"
        + '<th style="width:200px">考核项</th>'
        + headerCols
        + "</tr></thead><tbody>" + itemRows + statusRow + "</tbody></table>"
        + submitBtn,
        "互评打分（" + curPeriod + "）"
      );
}

function saveAllPeerReviewScores() {
  const curId = window.CURR_ACCT_ID || "";
  const tpl = window.findActivePaTemplate ? window.findActivePaTemplate("peer") : null;
  if (!tpl) { toast("未找到互评模板"); return; }

  const inputs = document.querySelectorAll(".peer-score:not([disabled])");
  const byTable = {};
  inputs.forEach(function(el) {
    const tid = el.getAttribute("data-tid");
    const i = parseInt(el.getAttribute("data-i"), 10);
    if (!byTable[tid]) byTable[tid] = {};
    byTable[tid][i] = el;
  });

  const tableIds = Object.keys(byTable);
  if (tableIds.length === 0) { toast("没有需要提交的评分"); return; }

  const tables = window.PA_TABLES || [];
  var savedCount = 0;
  var errorMsgs = [];

  tableIds.forEach(function(tid) {
    const t = tables.find(function(x) { return x.id === tid; });
    if (!t) { errorMsgs.push("考核表不存在：" + tid); return; }

    const details = t.peerScoreDetails || {};
    if (details[curId]) return;

    var items = [];
    var totalScore = 0;
    var totalWeight = 0;
    var allFilled = true;

    tpl.items.forEach(function(it, i) {
      const el = byTable[tid][i];
      const score = el ? parseFloat(el.value) : NaN;
      if (isNaN(score) || score < 0 || score > 100) {
        allFilled = false;
        return;
      }
      items.push({ score: score, comment: "", weight: it.weight || 0 });
      totalScore += score * (it.weight || 0);
      totalWeight += (it.weight || 0);
    });

    if (!allFilled || items.length < tpl.items.length) {
      errorMsgs.push((t.ownerName || t.ownerId) + " 的打分不完整");
      return;
    }

    const weightedAvg = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
    if (typeof t.peerScoreDetails !== "object") t.peerScoreDetails = {};
    t.peerScoreDetails[curId] = {
      items: items,
      score: weightedAvg,
      overallComment: "",
      submittedAt: Date.now(),
    };

    if (typeof window.autoCalcPeerScores === "function") window.autoCalcPeerScores(t.id);
    savedCount++;
  });

  if (typeof window.savePaTables === "function") window.savePaTables();

  if (errorMsgs.length > 0) {
    toast("已提交 " + savedCount + " 人，" + errorMsgs.length + " 人有错误未提交");
  } else {
    toast("已批量提交 " + savedCount + " 人的互评打分");
  }
  replaceView();
}

/* ======== VIEWS 注册 ======== */
VIEWS.paPeerMgmt = renderPaPeerMgmt;
VIEWS.paPeerReview = renderPaPeerReview;

/* ======== Window 挂载 ======== */
window.renderPaPeerMgmt = renderPaPeerMgmt;
window.renderPaPeerReview = renderPaPeerReview;
window.openEditPeerReviewers = openEditPeerReviewers;
window.savePeerReviewers = savePeerReviewers;
window.savePeerReviewScore = savePeerReviewScore;
window.saveAllPeerReviewScores = saveAllPeerReviewScores;
window._formatPeerList = _formatPeerList;

/* ========== 绩效管理模块 · 考核表与打分（views-pa-table.js） ========== */
/* 拆分自原 views-pa.js。包含考核表列表与详情弹窗构建（任务项 + 自评/主管/PM/领导三栏打分）、
 * 表内互评打分（_buildPeerModalBody / savePeerReviewScore）与月度/年度入口渲染。 */

/* ======== 考核表与打分（列表+详情双层） ======== */

// 根据当前登录角色过滤可见人员列表
function _paGetVisiblePeople() {
  const people = window._paBuildPeople ? window._paBuildPeople() : [];
  const curId = window.CURR_ACCT_ID || "";
  const curName = window.CURR_ACCT_NAME || "";
  const curRoleKey = window.CURR_ACCT_ROLE_KEY || "staff";
  if (curRoleKey === "sysAdmin") return people;
  if (curRoleKey === "deptLeader") return people.filter(p => p.leader === curName || p.manager === curName || p.id === curId);
  if (curRoleKey === "supervisor") return people.filter(p => p.manager === curName || p.id === curId);
  return people.filter(p => p.id === curId);
}

/* 考核表 edit 权限的 subs 路径：年度绩效考核已并入「年度绩效管理」(paYearlyMgmt) 二级菜单下作为
 * 三级子项，月度绩效考核仍在二级。canAction/currentCanAction 支持任意深度路径，按类型返回完整路径。
 * 用 const 箭头函数而非 function 声明：顶层 function 会进 windowKeys 快照造成回归噪声。 */
const _paTablePermPath = (forceType) =>
  forceType === "yearly" ? ["paYearlyMgmt", "paTableYearly"] : ["paTableMonthly"];

// 判断当前用户对指定考核表的操作权限
function _paCanEditTable(table) {
  const curId = window.CURR_ACCT_ID || "";
  const curName = window.CURR_ACCT_NAME || "";
  const curRoleKey = window.CURR_ACCT_ROLE_KEY || "staff";
  if (curRoleKey === "sysAdmin") return true;
  if (table.ownerId === curId) return false;
  const owner = window.findPaPerson ? window.findPaPerson(table.ownerId) : null;
  if (curRoleKey === "deptLeader") {
    if (owner && (owner.leader === curName || owner.manager === curName)) return true;
  }
  if (curRoleKey === "supervisor") {
    if (owner && owner.manager === curName) return true;
  }
  return false;
}

function openPaTableDetail(ownerId, period) {
  __paOwnerId = ownerId;
  __paPeriod = period;
  const owner = window.findPaPerson ? window.findPaPerson(ownerId) : null;
  const title = `${owner?.name || ''}（${ownerId}）· ${period} ${_paTypeLabel(__paType)}考核表`;
  openModal(modalContent(title, _buildPaTableModalBody(__paType)), { fullscreen: true });
}

function backPaTableList() {
  closeModal();
}

// 列表视图：展示可见员工 + 考核表状态
function _renderPaTableList(forceType, pageKey) {
  const canEdit = window.currentCanAction("perf", ..._paTablePermPath(forceType), "edit");
  const people = _paGetVisiblePeople();
  const tablesAll = window.PA_TABLES || [];

  // 部门领导 + 系统管理员：右上角批量创建按钮
  const canBatchCreate = window.CURR_ACCT_ROLE_KEY === "deptLeader" || window.CURR_ACCT_ROLE_KEY === "sysAdmin";
  // 项目经理：月度考核可导入任务
  const canImportTask = forceType === "monthly" && window.CURR_ACCT_ROLE_KEY === "projManager";
  const batchActions = [
    canBatchCreate ? btn("➕ 批量创建考核表", "", `openBatchCreatePaTbl('${forceType}')`) : "",
    canImportTask ? btn("📥 导入月度任务", "ghost", `openImportMonthlyTask('${__paPeriod}')`) : "",
  ].filter(Boolean).join(" ");

  // 收集所有可见周期
  const myTables = tablesAll.filter(t => t.type === forceType && people.some(p => p.id === t.ownerId));
  const allPeriods = [...new Set(myTables.map(t => t.period))].sort().reverse();
  const defaultPeriod = allPeriods.length > 0 ? allPeriods[0] : (forceType === "yearly" ? new Date().getFullYear().toString() : `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2,'0')}`);
  if (!__paPeriod || !allPeriods.includes(__paPeriod)) __paPeriod = defaultPeriod;

  // 过滤当前周期的表
  const periodTables = myTables.filter(t => t.period === __paPeriod);
  const tableMap = {};
  periodTables.forEach(t => tableMap[t.ownerId] = t);

  // 月度考核：增加"月度计划任务"列
  const isMonthly = forceType === "monthly";
  const headers = isMonthly
    ? ["工号", "姓名", "角色", "部门小组", "考核状态", "加权得分", "等级", "月度计划任务", "操作"]
    : ["工号", "姓名", "角色", "部门小组", "考核状态", "加权得分", "等级", "操作"];

  return `
  ${pageHeader(PAGES[pageKey].title, PAGES[pageKey].desc, batchActions)}
  <div class="card" style="margin-bottom:10px">
    ${filterGroup([
      { label: "考核周期", html: `<select class="ipt" onchange="__paPeriod=this.value;replaceView()">
        ${allPeriods.length === 0 ? `<option>${defaultPeriod}</option>` : allPeriods.map(p => `<option ${p === __paPeriod ? 'selected' : ''}>${p}</option>`).join("")}
      </select>` },
      { label: "可见范围", html: `<span class="small muted">共 ${people.length} 人 · 已创建 ${periodTables.length} 张考核表</span>` },
    ])}
  </div>
  ${zone(
    table(headers, people, (p) => {
      const t = tableMap[p.id];
      if (t) {
        const finalScore = t.status === "finalized" ? `<span style="color:var(--ok);font-weight:600">${t.score}</span>` : '<span class="muted">-</span>';
        const grade = t.status === "finalized" ? `<span class="tag ok" style="font-size:11px">${t.grade}</span>` : '<span class="muted">-</span>';
        let taskCell = "";
        if (isMonthly) {
          const hasTask = (t.items || []).some(it => it.task && it.task.trim());
          taskCell = hasTask
            ? `<td style="white-space:nowrap">${btn("📋 查看", "ghost sm", `viewMonthlyTasks('${t.id}')`)}</td>`
            : `<td class="muted" style="white-space:nowrap">未导入</td>`;
        }
        return `<td>${p.id}</td><td>${_escape(p.name)}</td><td style="white-space:nowrap" title="${_escape(p.role || "")}">${_escape(p.role || "")}</td><td style="white-space:nowrap" title="${_escape(p.group || "")}">${_escape(p.group || "")}</td><td>${_paStatusTag(t.status)}</td><td>${finalScore}</td><td>${grade}</td>${taskCell}<td>${btn("考核表", "ghost sm", `openPaTableDetail('${p.id}', '${__paPeriod}')`)}</td>`;
      }
      const taskCellEmpty = isMonthly ? `<td class="muted">-</td>` : "";
      return `<td>${p.id}</td><td>${_escape(p.name)}</td><td style="white-space:nowrap" title="${_escape(p.role || "")}">${_escape(p.role || "")}</td><td style="white-space:nowrap" title="${_escape(p.group || "")}">${_escape(p.group || "")}</td><td><span class="muted">未创建</span></td><td class="muted">-</td><td class="muted">-</td>${taskCellEmpty}<td>${canEdit ? btn("创建考核表", "ghost sm", `createPaTblForOwner('${p.id}', '${__paPeriod}')`) : '<span class="muted">-</span>'}</td>`;
    }, "", isMonthly ? 260 : 220),
    isMonthly ? "月度绩效考核列表" : "年度绩效考核列表"
  )}`;
}

function _buildPaTableModalBody(forceType) {
  const curId = window.CURR_ACCT_ID || "";
  const owner = window.findPaPerson ? window.findPaPerson(__paOwnerId) : null;

  if (forceType === "peer") {
    return _buildPeerModalBody(__paOwnerId, __paPeriod, curId);
  }

  const canEditPerm = window.currentCanAction("perf", ..._paTablePermPath(forceType), "edit");

  let table = null;
  if (__paPeriod && __paOwnerId) {
    table = window.findPaTableByPeriod(__paPeriod, __paOwnerId, forceType);
  }

  const isSelf = __paOwnerId === curId;
  const canEdit = table && !isSelf && _paCanEditTable(table);

  let content = "";
  if (!table) {
    content = `<div class="empty">${__paPeriod || ''} · ${owner?.name || ''} 暂无考核表
      ${canEditPerm && !isSelf ? btn("＋ 创建考核表", "sm", `createPaTblForOwner('${__paOwnerId}', '${__paPeriod}')`) : ""}</div>`;
  } else {
    const isFinalized = table.status === "finalized";
    const isPmDone = table.status === "pmDone";
    const isSupDone = table.status === "supDone";
    const isSelfFilled = table.status === "selfFilled";
    const isPending = table.status === "pending";

    const canSelfEditTask = table.status === "pending" && isSelf;
    const canSupEdit = table.status === "selfFilled" && canEdit && !isFinalized;
    const canPmEdit = table.status === "supDone" && canEdit && !isFinalized;
    const canLeaderEdit = table.status === "pmDone" && canEdit && !isFinalized;

    let submitSection = "";
    if (isPending && isSelf) {
      submitSection = `<div style="margin-top:12px;display:flex;gap:8px">
        ${btn("✅ 确认我的任务项（锁定后无法修改）", "", "confirmPaSelfFilled()")}
      </div>`;
    } else if (isPending) {
      submitSection = `<div style="margin-top:12px">
        ${lockNote("⏳ 等待被考核人确认任务项，确认后主管开始打分")}
      </div>`;
    } else if (isSelfFilled) {
      submitSection = `<div style="margin-top:12px;display:flex;gap:8px">
        ${canSupEdit ? btn("📤 主管提交打分（锁定主管字段）", "", "submitPaTblSup()") : ""}
        ${canEdit ? btn("↩ 打回给被考核人", "gray", `confirmRollbackPaTbl('${table.id}', 'pending')`) : ""}
      </div>`;
    } else if (isSupDone) {
      submitSection = `<div style="margin-top:12px;display:flex;gap:8px">
        ${canPmEdit ? btn("📤 PM 提交打分（锁定 PM 字段）", "", "submitPaTblPM()") : ""}
        ${canEdit ? btn("↩ 打回给主管", "gray", `confirmRollbackPaTbl('${table.id}', 'selfFilled')`) : ""}
      </div>`;
    } else if (isPmDone) {
      submitSection = `<div style="margin-top:12px;display:flex;gap:8px">
        ${canLeaderEdit ? btn("✅ 领导完成打分 & 自动归档生成结果", "", "finalizePaTbl()") : ""}
        ${canEdit ? btn("↩ 打回给 PM", "gray", `confirmRollbackPaTbl('${table.id}', 'supDone')`) : ""}
      </div>`;
    } else if (isFinalized) {
      submitSection = `<div style="margin-top:12px">
        ${lockNote(`✅ 已完成 · 加权得分 <b>${table.score}</b> · 等级 <b>${table.grade}</b> · 由 ${table.gradedBy.leader} 于 ${_fmtDate(table.gradedAt)} 提交`)}
        ${canEdit ? `<div style="margin-top:8px">${btn("↩ 打回重新修改", "gray", `confirmRollbackPaTbl('${table.id}', 'pmDone')`)}</div>` : ""}
      </div>`;
    }

    const _rs = _paGroupRowspan(table.items);
    const itemsHtml = table.items.map((it, i) => {
      const g = _rs[i];
      const groupTd = g.isFirst
        ? `<td rowspan="${g.rowSpan}" style="vertical-align:middle;background:#f8f9fa;font-weight:500;white-space:nowrap" title="${_escape(it.group || '')}">${_escape(it.group || "—")}</td>`
        : "";
      const taskInput = `<input class="ipt t-task" data-i="${i}" value="${_escape(it.task || '')}" ${canSelfEditTask ? "" : "disabled"} style="width:100%" />`;
      return `<tr>
        ${groupTd}
        <td style="white-space:nowrap" title="${_escape(it.category || '')}">${it.category ? _escape(it.category) : '<span class="muted">—</span>'}</td>
        <td>${_foldText(it.standard || "")}</td>
        <td style="text-align:center">${it.weight || 0}</td>
        <td>${taskInput}</td>
        <td><input class="ipt t-sup" data-i="${i}" value="${it.sup !== undefined && it.sup !== null && it.sup !== '' ? it.sup : ''}" ${canSupEdit ? "" : "disabled"} style="width:60px;text-align:center" /></td>
        <td><input class="ipt t-pm" data-i="${i}" value="${it.pm !== undefined && it.pm !== null && it.pm !== '' ? it.pm : ''}" ${canPmEdit ? "" : "disabled"} style="width:60px;text-align:center" /></td>
        <td><input class="ipt t-leader" data-i="${i}" value="${it.leader !== undefined && it.leader !== null && it.leader !== '' ? it.leader : ''}" ${canLeaderEdit ? "" : "disabled"} style="width:60px;text-align:center;background:${canLeaderEdit ? '#fff9e6' : '#f5f5f5'}" /></td>
        <td><input class="ipt t-supc" data-i="${i}" value="${_escape(it.supComment || '')}" ${canSupEdit ? "" : "disabled"} style="width:100%" placeholder="主管评价" /></td>
        <td><input class="ipt t-pmc" data-i="${i}" value="${_escape(it.pmComment || '')}" ${canPmEdit ? "" : "disabled"} style="width:100%" placeholder="PM评价" /></td>
        <td><input class="ipt t-leadc" data-i="${i}" value="${_escape(it.leaderComment || '')}" ${canLeaderEdit ? "" : "disabled"} style="width:100%" placeholder="领导评价" /></td>
      </tr>`;
    }).join("");

    let commentField = "";
    if (isPmDone) {
      commentField = `<div style="margin-top:10px">
        ${formRow("总评价", `<textarea id="tbl_comment" class="ipt" rows="2" placeholder="部门领导对被考核人的总评价" ${canLeaderEdit ? "" : "disabled"}>${_escape(table.comment || "")}</textarea>`)}
      </div>`;
    }

    const readOnlyTip = isSelf && !isPending ? lockNote("💡 您已确认任务项，当前仅可查看不可编辑") : (isSelf && isPending ? lockNote("✏️ 请在任务项列编辑并确认内容，然后点击下方按钮提交") : "");

    content = `
      <div style="margin-bottom:4px">${_paStatusTag(table.status)} <span class="small muted" style="margin-left:8px">PM:${table.gradedBy.pm || '—'} / 主管:${table.gradedBy.sup || '—'} / 领导:${table.gradedBy.leader || '—'}</span></div>
      ${readOnlyTip}
      ${table.type === 'yearly' && table.peerReviewers && table.peerReviewers.length > 0
        ? `<div style="margin-bottom:8px" class="small">👥 互评人：${table.peerReviewers.join('、')}
           ${table.peerScores ? `· 互评平均分：${table.peerScores.avg}` : btn("计算互评平均分", "ghost sm", `calcPeerScores('${table.id}')`)}</div>`
        : ""}
      <table class="tb" style="table-layout:fixed">
        <thead><tr>
          <th style="width:80px">大类</th>
          <th style="width:80px">小类</th>
          <th style="width:180px">考核标准</th>
          <th style="width:60px">权重</th>
          <th style="width:160px">任务项</th>
          <th style="width:90px">主管打分</th>
          <th style="width:90px">PM打分</th>
          <th style="width:90px">领导打分</th>
          <th>主管评价</th>
          <th>PM评价</th>
          <th>领导评价</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${commentField}
      ${submitSection}
    `;
  }

  return content;
}

function _buildPeerModalBody(ownerId, period, curUserId) {
  const tables = window.PA_TABLES || [];
  const table = tables.find(function(t) {
    return t.type === "yearly" && t.ownerId === ownerId && String(t.period) === String(period);
  });

  if (!table) {
    return '<div class="empty">未找到被考核人的年终考核表</div>';
  }

  if (!table.peerReviewers || table.peerReviewers.length === 0) {
    return '<div class="empty">该被考核人尚未配置互评人<br/><span class="muted small">请先由分管领导或系统管理员配置互评人</span></div>';
  }

  if (table.peerReviewers.indexOf(curUserId) === -1) {
    return '<div class="empty">您不是该被考核人的互评人<br/><span class="muted small">互评人列表：' + _escape(table.peerReviewers.join("、")) + '</span></div>';
  }

  const tpl = window.findActivePaTemplate ? window.findActivePaTemplate("peer") : null;
  if (!tpl) {
    return '<div class="empty">系统未找到互评考核模板</div>';
  }

  const details = table.peerScoreDetails || {};
  const myScore = details[curUserId] || null;
  const owner = window.findPaPerson ? window.findPaPerson(ownerId) : null;
  const alreadySubmitted = !!myScore;

  const itemsHtml = tpl.items.map(function(it, i) {
    const prev = myScore && myScore.items ? myScore.items[i] : {};
    const score = prev.score !== undefined ? prev.score : "";
    const comment = prev.comment || "";
    return '<tr>'
      + '<td style="white-space:nowrap">' + _escape(it.group || "—") + '</td>'
      + '<td style="white-space:nowrap">' + _escape(it.category || "—") + '</td>'
      + '<td>' + _escape(it.standard || "") + '</td>'
      + '<td style="text-align:center">' + (it.weight || 0) + '</td>'
      + '<td><input class="ipt p-score" data-i="' + i + '" value="' + score + '" ' + (alreadySubmitted ? "disabled" : "") + ' style="width:70px;text-align:center" placeholder="0-100" /></td>'
      + '<td><input class="ipt p-comment" data-i="' + i + '" value="' + _escape(comment) + '" ' + (alreadySubmitted ? "disabled" : "") + ' style="width:100%" placeholder="评语（可选）" /></td>'
      + '</tr>';
  }).join("");

  var submitSection = "";
  if (alreadySubmitted) {
    submitSection = '<div style="margin-top:12px">'
      + lockNote("✅ 您已于 " + _fmtDate(myScore.submittedAt || Date.now()) + " 提交互评打分，共 " + tpl.items.length + " 项，加权得分 <b>" + (myScore.score || "—") + "</b>")
      + '</div>';
  } else {
    submitSection = '<div style="margin-top:12px;display:flex;gap:8px">'
      + btn("✅ 提交互评打分", "", "savePeerReviewScore('" + table.id + "')")
      + '</div>'
      + '<div class="small muted" style="margin-top:4px">💡 提交后不可修改，请仔细核对各项打分</div>';
  }

  return '<div style="margin-bottom:8px" class="small">'
    + '<span style="font-weight:500">📝 互评人打分</span>'
    + ' · 被考核人：<b>' + _escape(owner ? owner.name : ownerId) + '</b>（' + _escape(ownerId) + '）'
    + ' · 期次：' + _escape(period)
    + ' · 模板：' + _escape(tpl.name)
    + '</div>'
    + '<table class="tb">'
    + '<thead><tr>'
    + '<th style="width:80px">大类</th>'
    + '<th style="width:120px">小类</th>'
    + '<th>考核标准</th>'
    + '<th style="width:60px">权重</th>'
    + '<th style="width:100px">打分(0-100)</th>'
    + '<th style="width:200px">评语</th>'
    + '</tr></thead>'
    + '<tbody>' + itemsHtml + '</tbody>'
    + '</table>'
    + '<div style="margin-top:10px">'
    + '<textarea id="peerOverallComment" class="ipt" rows="2" placeholder="综合评价（可选）" ' + (alreadySubmitted ? "disabled" : "") + '>' + _escape(myScore ? (myScore.overallComment || "") : "") + '</textarea>'
    + '</div>'
    + submitSection;
}

function savePeerReviewScore(tableId) {
  const tables = window.PA_TABLES || [];
  const t = tables.find(function(x) { return x.id === tableId; });
  if (!t) { toast("考核表不存在"); return; }

  const tpl = window.findActivePaTemplate ? window.findActivePaTemplate("peer") : null;
  if (!tpl) { toast("未找到互评模板"); return; }

  const curId = window.CURR_ACCT_ID || "";
  if (!t.peerScoreDetails || typeof t.peerScoreDetails !== "object") t.peerScoreDetails = {};

  var items = [];
  var totalScore = 0;
  var totalWeight = 0;
  var allFilled = true;

  tpl.items.forEach(function(it, i) {
    const scoreEl = document.querySelector(".p-score[data-i='" + i + "']");
    const commentEl = document.querySelector(".p-comment[data-i='" + i + "']");
    const score = scoreEl ? parseFloat(scoreEl.value) : NaN;
    const comment = commentEl ? commentEl.value.trim() : "";

    if (isNaN(score) || score < 0 || score > 100) {
      allFilled = false;
      return;
    }

    items.push({ score: score, comment: comment, weight: it.weight || 0 });
    totalScore += score * (it.weight || 0);
    totalWeight += (it.weight || 0);
  });

  if (!allFilled || items.length < tpl.items.length) {
    toast("请完整填写所有项的打分（0-100）");
    return;
  }

  const weightedAvg = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
  const overallCommentEl = document.getElementById("peerOverallComment");

  t.peerScoreDetails[curId] = {
    items: items,
    score: weightedAvg,
    overallComment: overallCommentEl ? overallCommentEl.value.trim() : "",
    submittedAt: Date.now(),
  };

  if (typeof window.savePaTables === "function") window.savePaTables();
  if (typeof window.autoCalcPeerScores === "function") window.autoCalcPeerScores(tableId);

  toast("互评打分已提交");
  refreshPaTableModal();
}

// 详情视图：复用原来的打分逻辑 + 权限控制
function _renderPaTableDetail(forceType, pageKey) {
  const periodsAll = (window.PA_TABLES || []).filter(t => t.type === forceType);
  const periods = [...new Set(periodsAll.map(t => t.period))].sort().reverse();
  const periodOpts = periods.length > 0 ? periods : [__paPeriod || (forceType === "yearly" ? "2026" : "2026-03")];
  const owner = window.findPaPerson ? window.findPaPerson(__paOwnerId) : null;

  const table = window.findPaTableByPeriod(__paPeriod, __paOwnerId, forceType);
  const isSelf = __paOwnerId === (window.CURR_ACCT_ID || "");
  const grade = table && table.status === "finalized"
    ? `<span class="tag ok">${table.grade} · ${table.score}分</span>`
    : _paStatusTag(table ? table.status : "pending");

  return `
  ${pageHeader(PAGES[pageKey].title, PAGES[pageKey].desc)}
  <div class="card" style="margin-bottom:10px">
    ${filterGroup([
      { label: "考核周期", html: `<select class="ipt" onchange="__paPeriod=this.value;replaceView()">
        ${periodOpts.map(p => `<option ${p === __paPeriod ? 'selected' : ''}>${p}</option>`).join("")}
      </select>` },
      { label: "被考核人", html: `<span class="small muted">${owner ? owner.name + '（' + owner.id + '）' : ''}</span>` },
      { label: "状态", html: grade },
    ])}
  </div>
  ${card(_buildPaTableModalBody(forceType))}`;
}

function renderPaTable(forceType, pageKey) {
  if (forceType) __paType = forceType;
  if (typeof __routeQuery !== "undefined" && __routeQuery) {
    if (__routeQuery.period) __paPeriod = __routeQuery.period;
    if (__routeQuery.ownerId) __paOwnerId = __routeQuery.ownerId;
    if (__routeQuery.view === "detail" && __paOwnerId && __paPeriod) {
      setTimeout(() => openPaTableDetail(__paOwnerId, __paPeriod), 0);
    }
  }
  __paView = "list";
  return _renderPaTableList(forceType, pageKey);
}

function renderPaTableMonthly() { return renderPaTable("monthly", "paTableMonthly"); }
function renderPaTableYearly() { return renderPaTable("yearly", "paTableYearly"); }

/* ---------- VIEWS 注册 ---------- */
VIEWS.paTableMonthly = renderPaTableMonthly;
VIEWS.paTableYearly = renderPaTableYearly;

/* ---------- window 挂载 ---------- */
window.openPaTableDetail = openPaTableDetail;
window.backPaTableList = backPaTableList;
window.confirmDeletePaTbl = confirmDeletePaTbl;
window.doDeletePaTbl = doDeletePaTbl;
window.savePeerReviewScore = savePeerReviewScore;

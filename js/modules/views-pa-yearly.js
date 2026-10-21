/* ========== 绩效管理模块 · 年终汇总与结果查询（views-pa-yearly.js） ========== */
/* 拆分自原 views-pa.js。包含年终考核汇总（renderPaYearly / forceGenAllYearly / assignYearlyGrade）
 * 与考核结果查询检索（renderPaResult）。 */

/* ======== 年终考核汇总 ======== */
function renderPaYearly() {
  const canEdit = window.currentCanAction("perf", "paYearlyMgmt", "paYearly", "edit");
  const tables = (window.PA_TABLES || []).filter(t => t.type === "yearly").slice();

  // 计算每个人的当年月度平均分
  const monthlyByOwner = {};
  (window.PA_RESULTS || []).forEach(r => {
    if (r.type !== "monthly") return;
    if (!monthlyByOwner[r.ownerId]) monthlyByOwner[r.ownerId] = [];
    monthlyByOwner[r.ownerId].push(r.score);
  });
  Object.keys(monthlyByOwner).forEach(oid => {
    const arr = monthlyByOwner[oid];
    monthlyByOwner[oid] = Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*10)/10;
  });

  // 综合得分排序
  const rows = tables.map(t => {
    const monthlyAvg = monthlyByOwner[t.ownerId] || 0;
    let finalScore = t.score;
    let grade = t.grade;
    if (!finalScore) {
      const calc = window._calcPaTableScore(t);
      finalScore = calc.score; grade = calc.grade;
    }
    return { t, monthlyAvg, finalScore, grade };
  });
  rows.sort((a, b) => b.finalScore - a.finalScore);
  rows.forEach((r, i) => r.rank = i + 1);

  return `
  ${pageHeader(PAGES.paYearly.title, PAGES.paYearly.desc)}
  ${toolbar("", (tables.length > 0 ? btn("🔄 强制生成所有得分", "gray sm", "forceGenAllYearly()") : ""))}

  ${tables.length === 0 ? `<div class="empty">暂无年终考核表</div>` :
    zone(`
      <table class="tb">
        <thead><tr>${TH.paYearly.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `
          <tr>
            <td>${r.t.ownerId}</td>
            <td>${r.t.ownerName}</td>
            <td>${r.monthlyAvg || '—'}</td>
            <td>${r.t.peerScores ? r.t.peerScores.avg : '—'}</td>
            <td><b>${r.finalScore}</b></td>
            <td style="text-align:center">#${r.rank}</td>
            <td>
              ${canEdit && r.t.status !== "finalized"
                ? `<select class="ipt" onchange="assignYearlyGrade('${r.t.id}', this.value)" style="width:70px">
                  ${['S','A','B','C','D'].map(g => `<option value="${g}" ${g === r.grade ? 'selected' : ''}>${g}</option>`).join("")}
                </select>`
                : (r.grade || '—')}
            </td>
            <td>${btn("查看/编辑", "ghost sm", `__paType='yearly';openPaTableDetail('${r.t.ownerId}', '${r.t.period}')`)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      ${lockNote("⚠ 部门领导可在此表强制手动赋予每个人考核结果等级（S/A/B/C/D），提交后自动填充到年终考核表单中。")}
    `, "年终考核结果排序 & 手工赋等级")}`;
}

function forceGenAllYearly() {
  const tables = (window.PA_TABLES || []).filter(t => t.type === "yearly");
  let cnt = 0;
  tables.forEach(t => {
    if (!t.score) {
      const c = window._calcPaTableScore(t);
      t.score = c.score; t.grade = c.grade;
      if (typeof window.savePaTables === "function") window.savePaTables();
      cnt++;
    }
  });
  toast(`已强制生成 ${cnt} 张表的得分`); replaceView();
}

/* 视图层包装器：调数据层核心 + 提示 + 重渲染。
 * 本函数的同名顶层声明会覆盖 config-pa.js 的全局绑定，因此必须经由
 * window._assignYearlyGrade 调用核心实现，不可直接写 assignYearlyGrade(...)（会自递归）。 */
function assignYearlyGrade(tableId, grade) {
  window._assignYearlyGrade(tableId, grade);
  toast("已赋等级 " + grade); replaceView();
}

/* ======== 结果查询 / 检索 ======== */
function renderPaResult() {
  const people = window._paBuildPeople ? window._paBuildPeople() : [];

  if (!__paResultOwnerFilter && people.length > 0) __paResultOwnerFilter = people[0].id;

  const searchRes = __paResultOwnerFilter
    ? window.searchPaByOwnerAndPeriod(__paResultOwnerFilter, {
        type: __paResultType || undefined,
        startPeriod: __paResultStart || undefined,
        endPeriod: __paResultEnd || undefined,
        keyword: __paResultKeyword || undefined,
      })
    : { results: [], tables: [] };

  let resultsHtml = "";
  if (searchRes.results.length === 0) {
    resultsHtml = `<div class="empty">未找到匹配的考核结果</div>`;
  } else {
    resultsHtml = `<table class="tb">
      <thead><tr>${TH.paResult.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${searchRes.results
        .sort((a, b) => b.finalizedAt - a.finalizedAt)
        .map(r => `<tr>
          <td>${_paTypeLabel(r.type, r.typeLabel)}</td>
          <td>${r.period}</td>
          <td>${r.ownerName}</td>
          <td><b>${r.score}</b></td>
          <td>${tag(r.grade, r.grade === 'S' || r.grade === 'A' ? 'ok' : r.grade === 'B' ? 'g' : 'warn')}</td>
          <td class="muted">${_foldText(r.comment)}</td>
          <td>${_fmtDate(r.finalizedAt)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  }

  let tablesHtml = "";
  if (searchRes.tables.length > 0) {
    tablesHtml = searchRes.tables.sort((a, b) => b.period.localeCompare(a.period)).map(t => `
      <div class="card" style="margin-bottom:12px">
        <h3 style="margin:0 0 8px 0">${t.ownerName}（${t.ownerId}）· ${t.period} ${_paTypeLabel(t.type, t.typeLabel)}
          <span class="tag ok" style="margin-left:8px">得分 ${t.score || '—'} · ${t.grade || '—'}</span>
        </h3>
        <table class="tb">
          <thead><tr><th>大类</th><th>小类</th><th>考核标准</th><th>权重</th><th>任务项</th><th>最终得分</th></tr></thead>
          <tbody>${(() => {
            const rs = _paGroupRowspan(t.items);
            return t.items.map((it, i) => {
              const g = rs[i];
              const groupTd = g.isFirst
                ? `<td rowspan="${g.rowSpan}" style="vertical-align:middle;background:#f8f9fa;font-weight:500;white-space:nowrap" title="${_escape(it.group || '')}">${_escape(it.group || "—")}</td>`
                : "";
              return `<tr>${groupTd}
                <td style="white-space:nowrap" title="${_escape(it.category || '')}">${it.category ? _escape(it.category) : '<span class="muted">—</span>'}</td>
                <td>${_foldText(it.standard || '')}</td>
                <td style="text-align:center">${it.weight || 0}</td>
                <td>${_foldText(it.task || '')}</td>
                <td><b>${it.leader !== undefined && it.leader !== '' ? it.leader : (it.sup || it.pm || '—')}</b></td>
              </tr>`;
            }).join("");
          })()}</tbody>
        </table>
        ${t.comment ? `<div class="small muted" style="margin-top:6px">💬 总评价：${_foldText(t.comment)}</div>` : ""}
      </div>
    `).join("");
  }

  return `
  ${pageHeader(PAGES.paResult.title, PAGES.paResult.desc)}
  <div class="card" style="margin-bottom:10px">
    ${filterGroup([
      { label: "被考核人工号", html: `<select id="r_owner" class="ipt" onchange="__paResultOwnerFilter=this.value;replaceView()">
        ${people.map(p => `<option value="${p.id}" ${p.id===__paResultOwnerFilter?'selected':''}>${p.name}（${p.id}）</option>`).join("")}
      </select>` },
      { label: "考核类型", html: `<select id="r_type" class="ipt" onchange="__paResultType=this.value;replaceView()">
        <option value=""></option>
        <option value="monthly" ${__paResultType==='monthly'?'selected':''}>月度</option>
        <option value="yearly" ${__paResultType==='yearly'?'selected':''}>年终</option>
      </select>` },
      { label: "开始期次", html: `<input class="ipt" value="${__paResultStart}" placeholder="如：2026-01" onchange="__paResultStart=this.value;replaceView()" />` },
      { label: "结束期次", html: `<input class="ipt" value="${__paResultEnd}" placeholder="如：2026-03" onchange="__paResultEnd=this.value;replaceView()" />` },
      { label: "关键字", html: `<input class="ipt" value="${__paResultKeyword}" placeholder="搜索：等级/评价/得分/任务项" onchange="__paResultKeyword=this.value;replaceView()" />` },
      { label: "", html: btn("🔍 检索", "sm", "replaceView()") },
    ])}
    ${lockNote("⚠ 考核数据永久保存；员工仅可查询本人数据；部门领导完成后方可见最终结果。")}
  </div>

  ${zone(resultsHtml, "📊 汇总结果")}
  ${zone(tablesHtml || '<div class="empty">无匹配的考核表详情</div>', "📝 考核表详情（仅显示每项最终得分）")}`;
}


/* ---------- VIEWS 注册 ---------- */
VIEWS.paYearly = renderPaYearly;
VIEWS.paResult = renderPaResult;

/* ---------- window 挂载（供内联 onclick 调用） ---------- */
window.forceGenAllYearly = forceGenAllYearly;
window.assignYearlyGrade = assignYearlyGrade;

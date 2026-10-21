/* ========== 绩效管理模块 · 任务导入与建表（views-pa-task.js） ========== */
/* 拆分自原 views-pa.js。包含月度任务 Excel 导入（SheetJS 解析、模板下载、确认导入）、
 * 单人/批量创建考核表、按周期批量删除考核表。 */

/* ======== 月度任务导入 ======== */
var __importMonthlyTaskData = null;

function openImportMonthlyTask(period) {
  if (window.CURR_ACCT_ROLE_KEY !== "projManager") { toast("仅项目经理可导入月度任务"); return; }
  if (!period) period = __paPeriod;
  const html = '<div style="margin-bottom:12px">'
    + '<div class="small muted" style="margin-bottom:8px">📋 Excel 格式要求：</div>'
    + '<ul class="small muted" style="margin:0 0 12px 18px;padding:0;line-height:1.8">'
    + "<li>第 1 列：<b>工号</b>（表头可为「工号」「员工号」「账号」）</li>"
    + "<li>第 2 列起：各考核项的<b>月度任务内容</b>（列标题建议与考核项「小类」一致，如「工作质量」「工作效率」「任务完成情况」）</li>"
    + "<li>若列标题不匹配考核项，则按列顺序依次写入各项的「任务项」</li>"
    + "</ul>"
    + '<input type="file" id="importTaskFile" accept=".xlsx,.xls" class="ipt" style="padding:6px" onchange="handleImportMonthlyTaskFile(this.files[0], \'' + period + '\')" />'
    + '<div id="importTaskPreview" style="margin-top:12px"></div>'
    + "</div>"
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + btn("取消", "gray sm", "closeModal()")
    + btn("📥 下载模板", "ghost sm", "downloadMonthlyTaskTemplate()")
    + '<span id="importTaskConfirmBtn"></span>'
    + "</div>";
  openModal(modalContent("导入月度计划任务（" + period + "）", html), 640);
}

function downloadMonthlyTaskTemplate() {
  if (typeof XLSX === "undefined") { toast("Excel 库未加载，无法下载模板"); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["工号", "工作质量", "工作效率", "任务完成情况", "团队协作", "学习成长"],
    ["8001", "完成XX模块代码评审，Bug率<5%", "按时提交周报和进度", "完成需求A、B、C的开发", "配合测试组完成联调", "学习XX框架并分享"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "月度任务");
  XLSX.writeFile(wb, "月度计划任务模板.xlsx");
}

function handleImportMonthlyTaskFile(file, period) {
  if (!file) return;
  if (typeof XLSX === "undefined") { toast("Excel 解析库未加载，请检查网络连接"); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) { toast("Excel 至少需要表头行 + 1 行数据"); return; }

      const header = rows[0].map(function(h) { return String(h || "").trim(); });
      const idColIdx = header.findIndex(function(h) {
        return h === "工号" || h === "员工号" || h === "账号" || h === "id" || h === "工号(ID)";
      });
      if (idColIdx === -1) { toast("未找到「工号」列，请检查表头"); return; }

      const taskCols = header.map(function(h, i) {
        return i === idColIdx ? null : { idx: i, label: h || ("任务" + i) };
      }).filter(Boolean);

      const byId = {};
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const id = String(row[idColIdx] || "").trim();
        if (!id) continue;
        if (!byId[id]) byId[id] = {};
        taskCols.forEach(function(tc) {
          const val = String(row[tc.idx] || "").trim();
          if (!val) return;
          if (byId[id][tc.label]) {
            byId[id][tc.label] = byId[id][tc.label] + "；" + val;
          } else {
            byId[id][tc.label] = val;
          }
        });
      }

      const ids = Object.keys(byId);
      if (ids.length === 0) { toast("未解析到有效数据行"); return; }

      const people = window._paBuildPeople ? window._paBuildPeople() : [];
      const previewRows = ids.map(function(id) {
        const p = people.find(function(x) { return x.id === id; });
        const name = p ? p.name : "（未找到该员工）";
        const t = window.findPaTableByPeriod ? window.findPaTableByPeriod(period, id, "monthly") : null;
        const tblStatus = t ? "✓ 已有考核表" : "⚠ 未创建考核表";
        const tasks = byId[id];
        const taskSummary = Object.keys(tasks).map(function(k) {
          return "<b>" + _escape(k) + "：</b>" + _escape(tasks[k]);
        }).join("<br/>");
        return "<tr><td>" + _escape(id) + "</td><td>" + _escape(name) + "</td>"
          + "<td style='color:" + (t ? "var(--ok)" : "var(--warn)") + "'>" + tblStatus + "</td>"
          + "<td style='max-width:320px'>" + taskSummary + "</td></tr>";
      }).join("");

      const previewHtml = '<div style="border:1px solid var(--border);border-radius:6px;max-height:260px;overflow:auto">'
        + "<table class='tb'><thead><tr><th>工号</th><th>姓名</th><th>考核表</th><th>导入任务预览</th></tr></thead>"
        + "<tbody>" + previewRows + "</tbody></table></div>";

      document.getElementById("importTaskPreview").innerHTML = previewHtml;
      __importMonthlyTaskData = { period: period, byId: byId, taskCols: taskCols };
      document.getElementById("importTaskConfirmBtn").innerHTML = btn("✅ 确认导入", "", "confirmImportMonthlyTask()");
    } catch (err) {
      toast("Excel 解析失败：" + (err && err.message ? err.message : err));
    }
  };
  reader.readAsArrayBuffer(file);
}

function confirmImportMonthlyTask() {
  const data = __importMonthlyTaskData;
  if (!data) { toast("请先选择并解析 Excel 文件"); return; }
  const byId = data.byId;
  const period = data.period;
  const ids = Object.keys(byId);

  var successCount = 0;
  var skipMsgs = [];

  ids.forEach(function(id) {
    const t = window.findPaTableByPeriod ? window.findPaTableByPeriod(period, id, "monthly") : null;
    if (!t) { skipMsgs.push(id + "：未创建月度考核表"); return; }

    const items = t.items || [];
    const tasks = byId[id];
    const labels = Object.keys(tasks);

    labels.forEach(function(label, li) {
      let idx = items.findIndex(function(it) { return it.category === label; });
      if (idx === -1) {
        idx = items.findIndex(function(it) { return !it.task; });
      }
      if (idx === -1 && li < items.length) {
        idx = li;
      }
      if (idx >= 0) {
        items[idx].task = tasks[label];
      }
    });

    window.updatePaTable(t.id, { items: items });
    successCount++;
  });

  __importMonthlyTaskData = null;
  closeModal();
  if (skipMsgs.length > 0) {
    openModal(modalContent("导入结果",
      '<div class="card" style="padding:14px">'
      + '<p><b style="color:var(--ok)">✅ 成功导入 ' + successCount + " 人</b></p>"
      + '<p><b style="color:var(--warn)">⚠ 跳过 ' + skipMsgs.length + " 人</b></p>"
      + '<div class="small muted" style="margin-top:10px;line-height:1.8">' + skipMsgs.join("<br/>") + "</div>"
      + "</div>"
      + '<div style="text-align:right;margin-top:10px">' + btn("知道了", "", "closeModal();replaceView()") + "</div>"
    ), 420);
  } else {
    toast("✅ 已成功导入 " + successCount + " 人的月度计划任务");
  }
  replaceView();
}

function viewMonthlyTasks(tableId) {
  const t = window.findPaTable ? window.findPaTable(tableId) : null;
  if (!t) { toast("考核表不存在"); return; }
  const items = t.items || [];
  const rows = items.map(function(it, i) {
    const hasTask = it.task && it.task.trim();
    return "<tr>"
      + "<td style='text-align:center'>" + (i + 1) + "</td>"
      + "<td style='white-space:nowrap'>" + _escape(it.group || "—") + "</td>"
      + "<td style='white-space:nowrap'>" + _escape(it.category || "—") + "</td>"
      + "<td style='text-align:center'>" + (it.weight || 0) + "</td>"
      + "<td>" + (hasTask ? _escape(it.task) : '<span class="muted">— 无任务内容 —</span>') + "</td>"
      + "</tr>";
  }).join("");

  const html = '<div class="small" style="margin-bottom:8px">'
    + "被考核人：<b>" + _escape(t.ownerName || t.ownerId) + "</b>（" + _escape(t.ownerId) + "）"
    + " · 期次：" + _escape(t.period)
    + "</div>"
    + "<table class='tb'><thead><tr>"
    + "<th style='width:50px'>#</th><th style='width:100px'>大类</th><th style='width:110px'>小类</th><th style='width:60px'>权重</th><th>月度计划任务</th>"
    + "</tr></thead><tbody>" + rows + "</tbody></table>";

  openModal(modalContent("月度计划任务 · " + (t.ownerName || t.ownerId), html), 720);
}

function createPaTblForCurrent() {
  const owner = window.findPaPerson(__paOwnerId); if (!owner) return;
  const tpl = window.findActivePaTemplate(__paType, owner.role);
  const tplItems = tpl ? tpl.items.map((it) => ({ ...it, pm: "", sup: "", leader: "", pmComment: "", supComment: "", leaderComment: "" })) : [];
  window.createPaTable({
    type: __paType, period: __paPeriod, ownerId: __paOwnerId,
    items: tplItems,
  });
  toast("已创建考核表（匹配模板：" + (tpl ? tpl.name : "无") + "）"); replaceView();
}

// 列表页创建指定人员的考核表（接收 ownerId + period）
function createPaTblForOwner(ownerId, period) {
  const owner = window.findPaPerson(ownerId); if (!owner) { toast("人员不存在"); return; }
  const tpl = window.findActivePaTemplate(__paType, owner.role);
  const tplItems = tpl ? tpl.items.map((it) => ({ ...it, pm: "", sup: "", leader: "", pmComment: "", supComment: "", leaderComment: "" })) : [];
  window.createPaTable({
    type: __paType, period: period || __paPeriod, ownerId: ownerId,
    items: tplItems,
  });
  toast("已创建考核表（匹配模板：" + (tpl ? tpl.name : "无") + "）");
  // 创建后自动跳转详情
  openPaTableDetail(ownerId, period || __paPeriod);
}

/** 部门领导 + 系统管理员：打开批量创建考核表弹窗
 * 数据源：账号管理 ACCOUNTS，排除分管领导、系统管理员、停用账号
 */
function openBatchCreatePaTbl(forceType) {
  if (window.CURR_ACCT_ROLE_KEY !== "deptLeader" && window.CURR_ACCT_ROLE_KEY !== "sysAdmin") { toast("仅部门领导或系统管理员可批量创建"); return; }
  const allAccts = window.getAccounts ? window.getAccounts() : [];
  const tablesAll = window.PA_TABLES || [];
  const depts = window.DEPTS || [];
  const deptMap = Object.fromEntries(depts.map(d => [d.id, d]));

  // 角色 key → 中文角色名
  const _rk2label = { staff: "员工", projManager: "项目经理", supervisor: "主管", deptLeader: "部门领导", sysAdmin: "系统管理员" };

  // 从账号管理取人员，排除分管领导、系统管理员、停用账号
  const accts = allAccts.filter(a =>
    a.st === "启用" && a.key !== "deptLeader" && a.key !== "sysAdmin"
  );

  // 生成考核周期选项（月度：近12个月；年度：近3年）
  const now = new Date();
  let periodOpts = [];
  if (forceType === "yearly") {
    const y = now.getFullYear();
    for (let i = 0; i < 3; i++) periodOpts.unshift(y - i);
  } else {
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periodOpts.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  }
  const defaultPeriod = periodOpts.includes(__paPeriod) ? __paPeriod : periodOpts[periodOpts.length - 1];
  const periodSel = periodOpts.map(p => `<option value="${p}" ${p === defaultPeriod ? "selected" : ""}>${p}</option>`).join("");

  // 可用模板：同 type + active
  const availableTpls = (window.PA_TEMPLATES || []).filter(t => t.type === forceType && t.active);
  const defaultTpl = availableTpls.find(t => (t.targetRoles || []).includes("部门领导")) || availableTpls[0];
  const tplOptions = availableTpls.length === 0
    ? '<option value="">⚠ 暂无匹配模板</option>'
    : availableTpls.map(t => `<option value="${t.id}" ${defaultTpl && t.id === defaultTpl.id ? 'selected' : ''}>${_escape(t.name)} · ${t.targetRoles && t.targetRoles[0] ? t.targetRoles[0] : ''} · v${t.version}</option>`).join("");

  // 每行：人员 + 复选框
  const typeLabel = forceType === "yearly" ? "年度" : "月度";
  const rows = accts.map(a => {
    const roleLabel = _rk2label[a.key] || a.key || "员工";
    const deptName = deptMap[a.deptId] ? deptMap[a.deptId].name : (a.deptId || "");
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border-light);cursor:pointer">
      <input type="checkbox" class="batch-owner-cb" value="${a.id}" checked />
      <span style="width:60px;color:var(--sub)">${a.id}</span>
      <span><b>${_escape(a.n)}</b> ${roleLabel}</span>
      <span style="color:var(--sub);margin-left:auto">${_escape(deptName)}</span>
    </label>`;
  }).join("");

  const modalHtml = `
    <div class="card" style="margin-bottom:12px;padding:10px 14px">
      <div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <label style="font-size:12px;color:var(--sub);display:block;margin-bottom:6px">📅 考核周期</label>
          <select class="ipt" id="batch_period_sel">${periodSel}</select>
        </div>
        <div style="flex:1;min-width:200px">
          <label style="font-size:12px;color:var(--sub);display:block;margin-bottom:6px">📋 统一使用的考核模板</label>
          <select class="ipt" id="batch_tpl_sel">${tplOptions}</select>
        </div>
      </div>
      <div class="small muted" style="margin-top:8px">💡 所有人共用所选模板，已存在的考核表自动跳过</div>
    </div>
    <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:6px 12px">
      ${rows || '<div class="empty">暂无可用人员</div>'}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
      ${btn("全选", "ghost sm", "document.querySelectorAll('.batch-owner-cb').forEach(cb=>cb.checked=true)")}
      ${btn("全不选", "ghost sm", "document.querySelectorAll('.batch-owner-cb').forEach(cb=>cb.checked=false)")}
      ${btn("取消", "gray sm", "closeModal()")}
      ${btn("✅ 确认批量创建", "", `confirmBatchCreatePaTbl('${forceType}')`)}
    </div>
  `;
  openModal(modalContent(`➕ 批量创建${typeLabel}考核表`, modalHtml), 560);
}

/** 批量创建确认 */
function confirmBatchCreatePaTbl(forceType) {
  const periodEl = document.getElementById("batch_period_sel");
  const tplEl = document.getElementById("batch_tpl_sel");
  const period = periodEl ? periodEl.value : __paPeriod;
  const templateId = tplEl ? tplEl.value : "";
  if (!period) { toast("请选择考核周期"); return; }
  if (!templateId) { toast("请选择考核模板"); return; }
  const cbs = document.querySelectorAll(".batch-owner-cb:checked");
  if (cbs.length === 0) { toast("请先勾选需要创建的人员"); return; }
  const ownerIds = Array.from(cbs).map(cb => cb.value);
  const created = window.batchCreatePaTables({ type: forceType, period, ownerIds, templateId });
  const skipped = created._skipped || [];
  const tpl = window.findPaTemplate(templateId);
  closeModal();

  if (created.length > 0 && skipped.length === 0) {
    toast(`✅ 批量创建成功：${created.length} 张 · 周期 ${period}`);
  } else if (created.length > 0 && skipped.length > 0) {
    const skipReasons = skipped.map(s => `${s.oid}(${s.reason})`).join("、");
    openModal(modalContent("📋 批量创建结果", `
      <div class="card" style="padding:14px">
        <p><b style="color:var(--ok)">✅ 成功创建 ${created.length} 张</b></p>
        <p><b style="color:var(--warn)">⚠ 跳过 ${skipped.length} 人</b></p>
        <div class="small muted" style="margin-top:10px;line-height:1.8">${skipReasons}</div>
      </div>
      <div style="text-align:right;margin-top:10px">${btn("知道了", "", "closeModal();replaceView()")}</div>
    `), 420);
  } else {
    const skipReasons = skipped.map(s => `${s.oid}(${s.reason})`).join("、");
    openModal(modalContent("⚠ 未创建任何考核表", `
      <div class="card" style="padding:14px">
        <p>本次勾选的 ${ownerIds.length} 人全部被跳过，原因如下：</p>
        <div class="small muted" style="margin-top:10px;line-height:1.8">${skipReasons}</div>
        <div style="margin-top:12px" class="small">💡 常见原因：同周期考核表已存在、模板未激活等</div>
      </div>
      <div style="text-align:right;margin-top:10px">${btn("知道了", "", "closeModal()")}</div>
    `), 420);
  }
  replaceView();
}


/* ---------- window 挂载（供内联 onclick/onchange 调用） ---------- */
window.openImportMonthlyTask = openImportMonthlyTask;
window.downloadMonthlyTaskTemplate = downloadMonthlyTaskTemplate;
window.handleImportMonthlyTaskFile = handleImportMonthlyTaskFile;
window.confirmImportMonthlyTask = confirmImportMonthlyTask;
window.viewMonthlyTasks = viewMonthlyTasks;
window.createPaTblForCurrent = createPaTblForCurrent;
window.createPaTblForOwner = createPaTblForOwner;
window.openBatchCreatePaTbl = openBatchCreatePaTbl;
window.confirmBatchCreatePaTbl = confirmBatchCreatePaTbl;
window.confirmDeleteAllPaByPeriod = confirmDeleteAllPaByPeriod;
window.doDeleteAllPaByPeriod = doDeleteAllPaByPeriod;

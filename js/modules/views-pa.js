/* ========== 绩效管理模块视图 · views-pa.js ========== */
/* 包含：首页 / 人员库 / 模板 / 考核表 / 年终 / 结果查询 */
/* 通用工具函数 (_fmtDate/_foldText/_paStatusTag) 已上提至 views.js 基座 */

/* ---------- 绩效考核 ---------- */

/** 通用：格式化时间戳为 YYYY-MM-DD */
function _fmtDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 通用：超长文本折叠（>10 字截断 + 点击展开详情） */
function _foldText(text, cls) {
  if (!text) return '<span class="muted">—</span>';
  if (text.length <= 10) return `<span class="${cls || ""}">${_escape(text)}</span>`;
  const short = text.slice(0, 10) + "…";
  return `<span class="fold-text" data-short="${_escape(short)}" data-full="${_escape(text)}" onclick="this.classList.toggle('expanded');this.textContent=this.classList.contains('expanded')?this.dataset.full:this.dataset.short">${_escape(short)}</span>`;
}

let __paPeriod = null;
let __paOwnerId = null;
let __paType = "monthly";
let __paView = "list";
let __paTplType = "all";
let __paTplRole = "";
let __paResultOwnerFilter = "";
let __paResultKeyword = "";
let __paResultStart = "";
let __paResultEnd = "";
let __paResultType = "";
let __paModalBackup = "";

/** 通用：考核状态标签 */
function _paStatusTag(s) {
  const map = {
    pending: ['tag muted', '考核表已创建'],
    selfFilled: ['tag', '待主管打分'],
    supDone: ['tag', '主管已打分，待PM打分'],
    pmDone: ['tag', 'PM已打分，待领导归档'],
    finalized: ['tag ok', '已完成'],
    rolledBack: ['tag warn', '已打回'],
  };
  const [cls, text] = map[s] || ['tag', s];
  return `<span class="${cls}">${text}</span>`;
}

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

function resetAllPaConfirm() {
  openModal(modalContent("恢复默认数据",
    `<p>将重置绩效管理全部数据为种子数据，当前所有修改将丢失。确认继续？</p>`,
    `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认恢复", "danger", "doResetAllPa()")}`));
}
function doResetAllPa() { window.resetAllPa(); closeModal(); toast("已恢复默认"); replaceView(); }

/* ======== 考核模板管理 ======== */
function renderPaTemplate() {
  const canAdd = window.currentCanAction("perf", "paTemplate", "add");
  const canEdit = window.currentCanAction("perf", "paTemplate", "edit");
  const canDel = window.currentCanAction("perf", "paTemplate", "delete");
  const allTpls = window.PA_TEMPLATES || [];
  const typeOpts = window.listPaTemplateTypes ? window.listPaTemplateTypes() : [
    { key: "monthly", label: "月度考核" }, { key: "yearly", label: "年终考核" }
  ];
  const roleOpts = ["员工", "主管", "项目经理", "部门领导"];

  let list = allTpls.filter(t => t.active);
  if (__paTplType && __paTplType !== "all") list = list.filter(t => t.type === __paTplType);
  if (__paTplRole) list = list.filter(t => (t.targetRoles || []).includes(__paTplRole));
  list.sort((a, b) => {
    if (a.type !== b.type) return (a.type || "").localeCompare(b.type || "");
    return (a.targetRoles || []).join().localeCompare((b.targetRoles || []).join());
  });

  const typeLabel = (t) => (t.type === "monthly" ? "月度考核" : t.type === "yearly" ? "年终考核" : (t.typeLabel || t.type));
  const roleTag = (t) => `<span class="tag" style="margin:0 1px">${_escape((t.targetRoles || [])[0] || "—")}</span>`;

  // 历史版本计数（每个 type + subType 家族中 active=false 的数量）
  const histCount = (t) => allTpls.filter(x => x.type === t.type && (x.subType || "") === (t.subType || "") && !x.active).length;

  return `
  ${pageHeader(PAGES.paTemplate.title, PAGES.paTemplate.desc)}
  ${filterGroup([
    { label: "考核类型", html: `<select class="ipt" onchange="__paTplType=this.value;replaceView()">
      <option value="all" ${__paTplType === "all" ? "selected" : ""}>全部</option>
      ${typeOpts.map((o) => `<option value="${o.key}" ${__paTplType === o.key ? "selected" : ""}>${_escape(o.label)}</option>`).join("")}
    </select>` },
    { label: "适用角色", html: `<select class="ipt" onchange="__paTplRole=this.value;replaceView()">
      <option value="">全部</option>
      ${roleOpts.map((r) => `<option value="${_escape(r)}" ${__paTplRole === r ? "selected" : ""}>${_escape(r)}</option>`).join("")}
    </select>` },
    { label: "统计", html: `<span class="small muted">共 ${list.length} 个激活模板 · 总版本 ${allTpls.length}</span>` },
  ])}
  ${toolbar(
    `模板管理 · 每个考核类型+角色只有一个激活版本`,
    `${canAdd ? btn("➕ 新建模板", "blue sm", "openCreatePaTpl()") : ""} ${btn("↻ 恢复默认", "gray sm", "resetPaTpls()")}`,
  )}
  ${zone(
    list.length === 0
      ? `<div class="empty">暂无模板 —— 点击"➕ 新建模板"创建第一个模板</div>`
      : table(
          ["考核类型", "适用角色", "模板名称", "考核项", "权重合计", "状态", "操作"],
          list,
          (t) => {
            const wSum = (t.items || []).reduce((s, it) => s + (Number(it.weight) || 0), 0);
            const hc = histCount(t);
            return `<td>${typeLabel(t)}</td>
              <td>${roleTag(t)}</td>
              <td style="white-space:nowrap" title="${_escape(t.name)}">${_escape(t.name)}${t.deletable === false ? '<span class="tag muted" style="margin-left:4px">内置</span>' : ''}</td>
              <td>${(t.items || []).length}</td>
              <td style="color:${wSum === 100 ? 'var(--ok)' : 'var(--warn)'}">${wSum}</td>
              <td><span class="tag ok">● v${t.version} 激活</span></td>
              <td>
                ${btn("查看", "ghost sm", `viewPaTplDetail('${t.id}')`)}
                ${canEdit ? btn("编辑", "ghost sm", `openEditPaTpl('${t.id}')`) : ""}
                ${hc > 0 ? btn(`历史版本(${hc})`, "ghost sm", `viewTplHistory('${t.id}')`) : ""}
              </td>`;
          },
          "",
          260
        ),
    "考核模板列表"
  )}`;
}

/** 重置所有模板 */
function resetPaTpls() {
  openModal(modalContent("↻ 恢复默认模板",
    `<p>确定要恢复为系统默认的 ${(window.DEFAULT_PA_TEMPLATES || []).length || 5} 个内置模板？</p>
     <p class="small muted">自定义创建的模板将丢失，内置的月度/年终考核模板将被重置。</p>`,
    `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认恢复", "danger", "doResetPaTpls()")}`));
}
function doResetPaTpls() {
  window.resetPaTemplates();
  closeModal(); toast("已恢复默认模板"); replaceView();
}

/** 查看模板详情弹窗（只读，参考考核表单样式） */
function viewPaTplDetail(id) {
  const t = window.findPaTemplate(id); if (!t) return;
  const wSum = (t.items || []).reduce((s, it) => s + (Number(it.weight) || 0), 0);
  const groupCount = new Set((t.items || []).map(it => it.group)).size;
  const typeLabel = t.type === "monthly" ? "月度考核" : t.type === "yearly" ? "年终考核" : (t.typeLabel || t.type);
  const roleHtml = (t.targetRoles || []).map(r => `<span class="tag" style="margin:0 2px">${_escape(r)}</span>`).join("");

  // 构建合并大类行（参考考核表单的 rowspan 合并）
  const rs = _paGroupRowspan(t.items || []);
  const rows = (t.items || []).map((it, i) => {
    const g = rs[i];
    let groupTd = "";
    if (g.isFirst) {
      groupTd = `<td rowspan="${g.rowSpan}" style="vertical-align:middle;background:#f8f9fa;font-weight:500;white-space:nowrap" title="${_escape(it.group || '')}">${_escape(it.group || "—")}</td>`;
    }
    return `<tr>${groupTd}
      <td style="white-space:nowrap" title="${_escape(it.category || '')}">${it.category ? _escape(it.category) : '<span class="muted">—</span>'}</td>
      <td>${_escape(it.standard)}</td>
      <td style="text-align:center">${it.weight || 0}</td>
    </tr>`;
  }).join("");

  openModal(modalContent(`📋 ${_escape(t.name)}`, `
    <div style="margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap" class="small">
      <span><b>类型：</b>${typeLabel}</span>
      <span><b>版本：</b>v${t.version}${t.active ? '<span class="tag ok" style="margin-left:4px">激活中</span>' : '<span class="tag muted" style="margin-left:4px">历史版本</span>'}</span>
      <span><b>小类：</b>${_escape(t.subType || "—")}</span>
      <span><b>适用角色：</b>${roleHtml || '<span class="muted">—</span>'}</span>
      <span><b>更新时间：</b>${_fmtDate(t.updatedAt)}</span>
    </div>
    <table class="tb" style="table-layout:fixed;width:100%">
      <colgroup>
        <col style="width:18%">
        <col style="width:18%">
        <col style="width:auto">
        <col style="width:80px">
      </colgroup>
      <thead><tr>
        <th>大类（组）</th>
        <th>小类（分类）</th>
        <th>考核标准</th>
        <th style="text-align:center">权重</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="muted" style="text-align:center;padding:16px">暂无考核项</td></tr>'}</tbody>
      <tfoot><tr style="background:#fafafa;font-weight:500">
        <td colspan="3" style="text-align:right;padding:6px 12px">合计</td>
        <td style="text-align:center;color:${wSum === 100 ? 'var(--ok)' : 'var(--warn)'}">${wSum}${wSum !== 100 ? ' ⚠' : ''}</td>
      </tr></tfoot>
    </table>
    <div class="small muted" style="margin-top:8px">共 ${(t.items || []).length} 个考核项 · ${groupCount} 个大类 · 权重合计 ${wSum}${wSum !== 100 ? '（建议调整为 100）' : ''}</div>
  `,
    `${btn(BTN.cancel, "gray", "closeModal()")}
     ${window.currentCanAction("perf", "paTemplate", "edit") ? btn("✏ 编辑模板", "ghost", `closeModal();openEditPaTpl('${t.id}')`) : ""}
     ${!t.active && window.currentCanAction("perf", "paTemplate", "edit") ? btn("⚡ 激活此版本", "", `closeModal();activatePaTpl('${t.id}')`) : ""}
     ${t.deletable !== false && !t.active && window.currentCanAction("perf", "paTemplate", "delete") ? btn("🗑 删除", "danger ghost", `closeModal();confirmDeletePaTpl('${t.id}')`) : ""}`), "760px");
}

/* ---------- 模板操作辅助函数 ---------- */

/** 编辑器临时存储：当前正在编辑的模板考核项数组 */
let __tplEditingItems = null;

/** 渲染模板考核项编辑器 tbody（支持合并展示） */
function _tplRenderEditor() {
  const rs = _paGroupRowspan(__tplEditingItems || []);
  const rows = (__tplEditingItems || []).map((it, i) => {
    const g = rs[i];
    const sync = `onchange="_tplSyncFromRow(${i})"`;
    let groupTd = "";
    if (g.isFirst) {
      groupTd = `<td rowspan="${g.rowSpan}" class="tpl-group-td">
        <input class="ipt" data-field="group" value="${_escape(it.group || "")}" placeholder="大类名称" ${sync} />
        <div class="tpl-group-actions">
          <button type="button" class="btn sm ghost" onclick="_tplAddItemToGroup(${i})">＋ 加子项</button>
        </div>
      </td>`;
    }
    return `<tr data-i="${i}">
      ${groupTd}
      <td><input class="ipt" data-field="category" value="${_escape(it.category || "")}" placeholder="小类（可留空）" ${sync} /></td>
      <td><textarea class="ipt" data-field="standard" placeholder="考核标准" rows="2" ${sync}>${_escape(it.standard || "")}</textarea></td>
      <td class="tpl-weight-td"><input class="ipt" data-field="weight" type="number" min="0" max="100" value="${it.weight || 0}" ${sync} /></td>
      <td class="tpl-op-td">
        <button type="button" class="btn sm danger ghost" onclick="_tplRemoveItem(${i})">删除</button>
      </td>
    </tr>`;
  }).join("");
  document.getElementById("tpl_editor_body").innerHTML = rows || `<tr><td colspan="5" class="muted" style="text-align:center;padding:16px">暂无考核项 —— 点击「＋ 新增大类」开始</td></tr>`;
  _tplRefreshWeight();
}

/** 同步指定行的输入值到内存数组（使用 data-field 精确匹配） */
function _tplSyncFromRow(idx) {
  const tr = document.querySelector(`#tpl_editor_body tr[data-i="${idx}"]`);
  if (!tr || !__tplEditingItems[idx]) return;
  const getVal = (field) => {
    const el = tr.querySelector(`[data-field="${field}"]`);
    if (!el) return "";
    return field === "weight" ? (Number(el.value) || 0) : el.value.trim();
  };
  __tplEditingItems[idx].group = getVal("group");
  __tplEditingItems[idx].category = getVal("category");
  __tplEditingItems[idx].standard = getVal("standard");
  __tplEditingItems[idx].weight = getVal("weight");
  _tplRefreshWeight();
}

/** 刷新权重合计显示 */
function _tplRefreshWeight() {
  const wSum = (__tplEditingItems || []).reduce((s, it) => s + (Number(it.weight) || 0), 0);
  const el = document.getElementById("tpl_weight_sum");
  if (el) {
    el.textContent = wSum;
    el.style.color = wSum === 100 ? "var(--ok)" : "var(--warn)";
    el.style.fontWeight = "600";
  }
}

/** 在末尾添加一个新大类（含一个空子项） */
function _tplAddItemGroup() {
  if (!__tplEditingItems) __tplEditingItems = [];
  __tplEditingItems.push({ id: "it_new_" + Date.now(), group: "", category: "", standard: "", weight: 0 });
  _tplRenderEditor();
}

/** 在指定 groupKey 行所在的 group 末尾添加子项 */
function _tplAddItemToGroup(groupKeyIdx) {
  if (!__tplEditingItems || __tplEditingItems.length === 0) { _tplAddItemGroup(); return; }
  const targetGroup = (__tplEditingItems[groupKeyIdx]?.group || "").trim();
  let insertIdx = __tplEditingItems.length;
  for (let i = groupKeyIdx + 1; i < __tplEditingItems.length; i++) {
    if ((__tplEditingItems[i].group || "").trim() !== targetGroup) { insertIdx = i; break; }
  }
  const newItem = { id: "it_new_" + Date.now(), group: targetGroup, category: "", standard: "", weight: 0 };
  __tplEditingItems.splice(insertIdx, 0, newItem);
  _tplRenderEditor();
}

/** 删除指定行 */
function _tplRemoveItem(idx) {
  if (!__tplEditingItems) return;
  __tplEditingItems.splice(idx, 1);
  if (__tplEditingItems.length === 0) {
    _tplEditingItems = [{ id: "it_new_" + Date.now(), group: "", category: "", standard: "", weight: 0 }];
  }
  _tplRenderEditor();
}

/** 从 DOM 同步所有编辑值到 __tplEditingItems（保存前调用） */
function _tplCollectAllFromDom() {
  const trs = document.querySelectorAll("#tpl_editor_body tr[data-i]");
  trs.forEach((tr) => {
    const idx = Number(tr.dataset.i);
    if (!__tplEditingItems[idx]) return;
    const getVal = (field) => {
      const el = tr.querySelector(`[data-field="${field}"]`);
      if (!el) return "";
      return field === "weight" ? (Number(el.value) || 0) : el.value.trim();
    };
    __tplEditingItems[idx].group = getVal("group");
    __tplEditingItems[idx].category = getVal("category");
    __tplEditingItems[idx].standard = getVal("standard");
    __tplEditingItems[idx].weight = getVal("weight");
  });
}

/** 切换类型卡片选中态（CSS class 方式） */
function _tplCardToggle(el) {
  const parent = el.parentElement;
  parent.querySelectorAll(".tpl-card").forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
  el.querySelector("input").checked = true;
}
/** 适用角色单选（互斥） */
function _tplRoleRadio(el) {
  const parent = el.parentElement;
  parent.querySelectorAll(".tpl-role-pill").forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
  el.querySelector("input").checked = true;
}

/** 新建模板弹窗（含考核项编辑器） */
function openCreatePaTpl() {
  const roles = ["员工", "主管", "项目经理", "部门领导"];
  openModal(modalContent("➕ 新建模板", `
    <div class="fm">
      ${formRow("考核类型", `
        <div style="display:flex;gap:16px">
          <label class="tpl-card active" onclick="_tplCardToggle(this)">
            <input type="radio" name="nt_type" value="monthly" checked style="accent-color:var(--btBlue)">
            <b>📅 月度考核</b>
          </label>
          <label class="tpl-card" onclick="_tplCardToggle(this)">
            <input type="radio" name="nt_type" value="yearly" style="accent-color:var(--btBlue)">
            <b>🎯 年终考核</b>
          </label>
        </div>`, true)}
      ${formRow("模板名称", `<input id="nt_name" class="ipt" placeholder="如：月度考核 · 高级工程师版" />`, true)}
      ${formRow("适用角色", `<div id="nt_role_box" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
        ${roles.map((r, i) => `<label class="tpl-role-pill ${i === 0 ? 'active' : ''}" onclick="event.preventDefault();_tplRoleRadio(this)">
          <input type="radio" name="nt_role" value="${_escape(r)}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--btBlue)">${_escape(r)}
        </label>`).join("")}
      </div>`, true)}
    </div>
    <div class="tpl-editor-wrap">
      <div class="tpl-editor-head">
        <b>📋 考核模板表单（默认复制当前激活模板，可自由编辑）</b>
        <button type="button" class="btn sm ghost" onclick="_tplAddItemGroup()">＋ 新增大类</button>
      </div>
      <div class="tpl-editor-scroll">
        <table class="tb tpl-editor-table" style="table-layout:fixed;width:100%">
          <colgroup>
            <col style="width:160px">
            <col style="width:140px">
            <col>
            <col style="width:80px">
            <col style="width:80px">
          </colgroup>
          <thead><tr>
            <th>大类（组）</th>
            <th>小类（分类）</th>
            <th>考核标准</th>
            <th style="text-align:center">权重</th>
            <th style="text-align:center">操作</th>
          </tr></thead>
          <tbody id="tpl_editor_body"></tbody>
          <tfoot><tr>
            <td colspan="3" style="text-align:right">合计</td>
            <td style="text-align:center"><span id="tpl_weight_sum">0</span></td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
      <div class="tpl-editor-hint">提示：大类相同的行会自动合并展示；可添加/删除大类和子项；权重合计建议为 100</div>
    </div>
  `,
  `${btn(BTN.cancel, "gray", "closeModal()")} ${btn(BTN.submit, "", "submitCreatePaTpl()")}`), "960px");
  const defaultType = "monthly";
  const cur = window.findActivePaTemplate ? window.findActivePaTemplate(defaultType) : null;
  __tplEditingItems = cur ? cur.items.map(it => ({ ...it, id: "it_new_" + Date.now() + "_" + Math.random() })) : [
    { id: "it_new_" + Date.now(), group: "", category: "", standard: "", weight: 0 },
  ];
  _tplRenderEditor();
}

/** 验证考核项的权重合法性，返回 { ok, msg } */
function _tplValidateItems(items) {
  if (!items || items.length === 0) return { ok: false, msg: "请至少添加一个考核项" };
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if ((it.group || "").trim() === "") {
      return { ok: false, msg: `第 ${i + 1} 行：大类不能为空` };
    }
    if ((it.standard || "").trim() === "") {
      return { ok: false, msg: `第 ${i + 1} 行「${(it.group || "未命名").slice(0, 12)}」考核标准不能为空` };
    }
    if (!it.weight || it.weight <= 0) {
      return { ok: false, msg: `第 ${i + 1} 行「${(it.standard || it.group || "未命名").slice(0, 12)}」权重必须大于 0` };
    }
  }
  const wSum = items.reduce((s, it) => s + (Number(it.weight) || 0), 0);
  if (wSum !== 100) {
    return { ok: false, msg: `权重合计必须为 100，当前为 ${wSum}` };
  }
  return { ok: true };
}

function submitCreatePaTpl() {
  const typeEl = document.querySelector('input[name="nt_type"]:checked');
  const type = typeEl ? typeEl.value : "monthly";
  const typeLabel = type === "monthly" ? "月度考核" : "年终考核";
  const name = document.getElementById("nt_name").value.trim();
  const roleEl = document.querySelector('input[name="nt_role"]:checked');
  const firstRole = roleEl ? roleEl.value : "员工";
  if (!name) { toast("请填写模板名称"); return; }
  _tplCollectAllFromDom();
  if (!__tplEditingItems || __tplEditingItems.length === 0) { toast("请至少添加一个考核项"); return; }
  const items = __tplEditingItems.map((it, idx) => ({
    id: "it_" + (idx + 1),
    group: (it.group || "").trim(),
    category: (it.category || "").trim(),
    standard: (it.standard || "").trim(),
    weight: Number(it.weight) || 0,
  }));
  const v = _tplValidateItems(items);
  if (!v.ok) { toast(v.msg); return; }
  const tpl = window.createPaTemplate({ type, typeLabel, name, targetRoles: [firstRole], items });
  if (!tpl) { toast("创建失败，可能已有同类型同名模板"); return; }
  __tplEditingItems = null;
  closeModal(); toast(`已创建新模板「${name}」`); replaceView();
}

/** 编辑模板（元信息 + 考核项） */
function openEditPaTpl(id) {
  const t = window.findPaTemplate(id); if (!t) return;
  const firstRole = (t.targetRoles || [])[0] || "";
  __tplEditingItems = (t.items || []).map(it => ({ ...it }));
  openModal(modalContent("📝 编辑模板", `
    <div class="fm">
      ${formRow("模板大类", `<input class="ipt" value="${_escape(t.typeLabel || t.type)}" disabled style="background:#f5f5f5" />`)}
      ${formRow("适用角色", `<input class="ipt" value="${_escape(firstRole)}" disabled style="background:#f5f5f5" />`, true, "创建后不可修改")}
      ${formRow("模板名称", `<input id="em_name" class="ipt" value="${_escape(t.name)}" />`, true)}
    </div>
    <div class="tpl-editor-wrap">
      <div class="tpl-editor-head">
        <b>📋 考核模板表单</b>
        <button type="button" class="btn sm ghost" onclick="_tplAddItemGroup()">＋ 新增大类</button>
      </div>
      <div class="tpl-editor-scroll">
        <table class="tb tpl-editor-table" style="table-layout:fixed;width:100%">
          <colgroup>
            <col style="width:160px">
            <col style="width:140px">
            <col>
            <col style="width:80px">
            <col style="width:80px">
          </colgroup>
          <thead><tr>
            <th>大类（组）</th>
            <th>小类（分类）</th>
            <th>考核标准</th>
            <th style="text-align:center">权重</th>
            <th style="text-align:center">操作</th>
          </tr></thead>
          <tbody id="tpl_editor_body"></tbody>
          <tfoot><tr>
            <td colspan="3" style="text-align:right">合计</td>
            <td style="text-align:center"><span id="tpl_weight_sum">0</span></td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
      <div class="tpl-editor-hint">提示：大类相同的行会自动合并展示；可添加/删除大类和子项；权重合计建议为 100</div>
    </div>
  `,
  `${btn(BTN.cancel, "gray", "closeModal()")} ${btn(BTN.submit, "", `submitEditPaTpl('${id}')`)}`), "960px");
  _tplRenderEditor();
}

function submitEditPaTpl(id) {
  const t = window.findPaTemplate(id); if (!t) return;
  const name = document.getElementById("em_name").value.trim();
  if (!name) { toast("请填写模板名称"); return; }
  _tplCollectAllFromDom();
  if (!__tplEditingItems || __tplEditingItems.length === 0) { toast("请至少添加一个考核项"); return; }
  const items = __tplEditingItems.map((it, idx) => ({
    id: "it_" + (idx + 1),
    group: (it.group || "").trim(),
    category: (it.category || "").trim(),
    standard: (it.standard || "").trim(),
    weight: Number(it.weight) || 0,
  }));
  const v = _tplValidateItems(items);
  if (!v.ok) { toast(v.msg); return; }
  window.updatePaTemplateMeta(id, { name });
  window.updatePaTemplateItems(id, items);
  __tplEditingItems = null;
  closeModal(); toast("已更新模板"); replaceView();
}

/** 历史版本列表弹窗（同 type + subType 家族的所有版本） */
function viewTplHistory(activeId) {
  const cur = window.findPaTemplate(activeId); if (!cur) return;
  const canEdit = window.currentCanAction("perf", "paTemplate", "edit");
  const canDel = window.currentCanAction("perf", "paTemplate", "delete");
  const all = window.listPaTemplateVersions
    ? window.listPaTemplateVersions(cur.type, cur.subType)
    : (window.PA_TEMPLATES || []).filter(x => x.type === cur.type && (x.subType || "") === (cur.subType || ""));
  const typeLabel = cur.type === "monthly" ? "月度考核" : cur.type === "yearly" ? "年终考核" : (cur.typeLabel || cur.type);
  const roleLabel = (cur.targetRoles || [])[0] || "—";
  openModal(modalContent(`📚 历史版本 · ${typeLabel} · ${roleLabel}`,
    `<div class="small muted" style="margin-bottom:12px">共 ${all.length} 个版本 · 点击「激活」切换到指定版本</div>
     ${table(
       ["版本", "模板名称", "考核项", "权重合计", "更新时间", "状态", "操作"],
       all,
       (t) => {
         const wSum = (t.items || []).reduce((s, it) => s + (Number(it.weight) || 0), 0);
         return `<td style="text-align:center">v${t.version}</td>
           <td style="white-space:nowrap" title="${_escape(t.name)}">${_escape(t.name)}${t.deletable === false ? '<span class="tag muted" style="margin-left:4px">内置</span>' : ''}</td>
           <td style="text-align:center">${(t.items || []).length}</td>
           <td style="text-align:center;color:${wSum === 100 ? 'var(--ok)' : 'var(--warn)'}">${wSum}</td>
           <td>${_fmtDate(t.updatedAt)}</td>
           <td style="text-align:center">${t.active ? '<span class="tag ok">● 激活</span>' : '<span class="tag muted">历史</span>'}</td>
           <td style="text-align:center;white-space:nowrap">
             ${btn("查看", "ghost sm", `closeModal();viewPaTplDetail('${t.id}')`)}
             ${!t.active && canEdit ? btn("激活", "ghost sm", `closeModal();activatePaTplDirect('${t.id}')`) : ""}
             ${canDel && t.deletable !== false && !t.active ? btn("删除", "danger ghost sm", `closeModal();confirmDeletePaTpl('${t.id}')`) : ""}
           </td>`;
       },
       "",
       200
     )}`,
    `${btn("关闭", "gray", "closeModal()")}`), "780px");
}

function activatePaTplDirect(id) {
  const r = window.activatePaTemplate(id);
  toast(r ? "已切换激活版本" : "切换失败");
  replaceView();
}

function confirmDeletePaTpl(id) {
  const t = window.findPaTemplate(id); if (!t) return;
  openModal(modalContent("🗑 删除模板版本",
    `<p>确定要删除模板 <b>${_escape(t.name)} · v${t.version}</b>？</p>
     <p class="small muted">${t.deletable ? "仅当前版本被删除；同类型其他版本不受影响。" : "系统内置模板不可删除。"}</p>`,
    `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认删除", "danger", `doDeletePaTpl('${id}')`)}`));
}
function doDeletePaTpl(id) {
  const r = window.deletePaTemplate(id);
  closeModal();
  if (r && r.ok) { toast("已删除"); replaceView(); }
  else { toast((r && r.msg) || "删除失败"); }
}

function activatePaTpl(id) { window.activatePaTemplate(id); toast("已激活"); replaceView(); }

function confirmDeletePaTbl(id) {
  const t = window.findPaTable(id); if (!t) return;
  openModal(modalContent("确认删除",
    `<p>确定删除 <b>${t.ownerName} · ${t.period} ${_paTypeLabel(t.type, t.typeLabel)}考核表</b>？</p>`,
    `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认删除", "danger", `doDeletePaTbl('${id}')`)}`));
}
function doDeletePaTbl(id) { window.deletePaTable(id); closeModal(); toast("已删除"); replaceView(); }

function confirmDeleteAllPaByPeriod(period, type) {
  const typeText = _paTypeLabel(type);
  openModal(modalContent("撤销全部考核表",
    `<p>确定撤销 <b>${period} ${typeText}考核</b> 的所有未完成考核表？</p>`,
    `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认撤销", "danger", `doDeleteAllPaByPeriod('${period}', '${type || ""}')`)}`));
}
function doDeleteAllPaByPeriod(period, type) {
  const cnt = window.deletePaTablesByPeriod(period, type || undefined);
  closeModal(); toast("已撤销 " + cnt + " 张"); replaceView();
}

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
function _renderPaTableList(forceType, pageKey, permKey) {
  const canEdit = window.currentCanAction("perf", permKey, "edit");
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
  ${table(headers, people, (p) => {
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
  }, "", isMonthly ? 260 : 220)}`;
}

function _buildPaTableModalBody(forceType) {
  const curId = window.CURR_ACCT_ID || "";
  const owner = window.findPaPerson ? window.findPaPerson(__paOwnerId) : null;

  if (forceType === "peer") {
    return _buildPeerModalBody(__paOwnerId, __paPeriod, curId);
  }

  const canEditPerm = window.currentCanAction("perf", forceType === "yearly" ? "paTableYearly" : "paTableMonthly", "edit");

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
function _renderPaTableDetail(forceType, pageKey, permKey) {
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

function renderPaTable(forceType, pageKey, permKey) {
  if (forceType) __paType = forceType;
  if (typeof __routeQuery !== "undefined" && __routeQuery) {
    if (__routeQuery.period) __paPeriod = __routeQuery.period;
    if (__routeQuery.ownerId) __paOwnerId = __routeQuery.ownerId;
    if (__routeQuery.view === "detail" && __paOwnerId && __paPeriod) {
      setTimeout(() => openPaTableDetail(__paOwnerId, __paPeriod), 0);
    }
  }
  __paView = "list";
  return _renderPaTableList(forceType, pageKey, permKey);
}

function renderPaTableMonthly() { return renderPaTable("monthly", "paTableMonthly", "paTableMonthly"); }
function renderPaTableYearly() { return renderPaTable("yearly", "paTableYearly", "paTableYearly"); }

function renderPaTableMonthly() { return renderPaTable("monthly", "paTableMonthly", "paTableMonthly"); }
function renderPaTableYearly() { return renderPaTable("yearly", "paTableYearly", "paTableYearly"); }

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
      <div class="small muted" style="margin-top:8px">💡 本次批量创建的所有人共用选中的模板，数据层会自动跳过已存在的考核表</div>
    </div>
    <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:6px 12px">
      ${rows || '<div class="empty">当前无可用人员（系统中暂无启用的非管理员账号）</div>'}
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
    pending: "打回给被考核人（任务项重新编辑，所有打分清零）",
    selfFilled: "打回给主管（主管/PM/领导打分清零）",
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

/* ======== 年终考核汇总 ======== */
function renderPaYearly() {
  const canEdit = window.currentCanAction("perf", "paYearly", "edit");
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

  ${tables.length === 0 ? `<div class="empty">暂无年终考核表，请先创建年终考核表</div>` :
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

function assignYearlyGrade(tableId, grade) {
  window.assignYearlyGrade(tableId, grade);
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
        <option value="">全部</option>
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

/* ---------- 绩效管理 VIEWS 填充 ---------- */
VIEWS.paPeople = renderPaPeople;
VIEWS.paTemplate = renderPaTemplate;
VIEWS.paTableMonthly = renderPaTableMonthly;
VIEWS.paTableYearly = renderPaTableYearly;
VIEWS.paYearly = renderPaYearly;
VIEWS.paResult = renderPaResult;

/* ---------- 绩效管理 window 挂载 ---------- */
window.resetAllPaConfirm = resetAllPaConfirm;
window.doResetAllPa = doResetAllPa;
window.resetPaTpls = resetPaTpls;
window.doResetPaTpls = doResetPaTpls;
window.confirmDeletePaTpl = confirmDeletePaTpl;
window.doDeletePaTpl = doDeletePaTpl;
window.activatePaTpl = activatePaTpl;
window.viewPaTplDetail = viewPaTplDetail;
window.viewTplHistory = viewTplHistory;
window.activatePaTplDirect = activatePaTplDirect;
window.openCreatePaTpl = openCreatePaTpl;
window.submitCreatePaTpl = submitCreatePaTpl;
window.openEditPaTpl = openEditPaTpl;
window.submitEditPaTpl = submitEditPaTpl;
window._tplAddItemGroup = _tplAddItemGroup;
window._tplAddItemToGroup = _tplAddItemToGroup;
window._tplRemoveItem = _tplRemoveItem;
window._tplSyncFromRow = _tplSyncFromRow;
window._tplCardToggle = _tplCardToggle;
window._tplRoleRadio = _tplRoleRadio;
window.confirmDeletePaTbl = confirmDeletePaTbl;
window.doDeletePaTbl = doDeletePaTbl;
window.confirmDeleteAllPaByPeriod = confirmDeleteAllPaByPeriod;
window.doDeleteAllPaByPeriod = doDeleteAllPaByPeriod;
window.openPaTableDetail = openPaTableDetail;
window.backPaTableList = backPaTableList;
window.createPaTblForOwner = createPaTblForOwner;
window.createPaTblForCurrent = createPaTblForCurrent;
window.openBatchCreatePaTbl = openBatchCreatePaTbl;
window.confirmBatchCreatePaTbl = confirmBatchCreatePaTbl;
window.submitPaTblPM = submitPaTblPM;
window.submitPaTblSup = submitPaTblSup;
window.finalizePaTbl = finalizePaTbl;
window.confirmPaSelfFilled = confirmPaSelfFilled;
window.restorePaTableModal = restorePaTableModal;
window.confirmRollbackPaTbl = confirmRollbackPaTbl;
window.doRollbackPaTbl = doRollbackPaTbl;
window.restorePaTableModal = restorePaTableModal;
window.calcPeerScores = calcPeerScores;

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
  const canEdit = curRole === "deptLeader" || curRole === "sysAdmin";

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
          : '<div class="empty" style="padding:40px">暂无需互评的主管 / 项目经理</div>'),
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
      + '<div class="empty" style="padding:40px">暂无需您评分的互评考核<br/><span class="muted small">由分管领导或系统管理员指定后，将在此显示</span></div>';
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
        '<div style="margin-bottom:8px" class="muted small">💡 行：考核项 / 列：被考核人。请在交叉单元格填写 0-100 分，完成后点击"批量提交打分"一次性提交</div>'
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
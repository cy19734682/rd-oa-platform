/* ========== 绩效管理模块 · 考核模板管理（views-pa-template.js） ========== */
/* 拆分自原 views-pa.js。包含模板列表/详情弹窗、考核项编辑器（_tpl* 系列）、
 * 新建/编辑/历史版本/激活/删除/重置。依赖 views-pa-common.js 的共享工具（运行时调用）。 */

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
  if (__paTplType) list = list.filter(t => t.type === __paTplType);
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
      <option value="" ${__paTplType === "" ? "selected" : ""}></option>
      ${typeOpts.map((o) => `<option value="${o.key}" ${__paTplType === o.key ? "selected" : ""}>${_escape(o.label)}</option>`).join("")}
    </select>` },
    { label: "适用角色", html: `<select class="ipt" onchange="__paTplRole=this.value;replaceView()">
      <option value=""></option>
      ${roleOpts.map((r) => `<option value="${_escape(r)}" ${__paTplRole === r ? "selected" : ""}>${_escape(r)}</option>`).join("")}
    </select>` },
    { label: "统计", html: `<span class="small muted">共 ${list.length} 个激活模板 · 总版本 ${allTpls.length}</span>` },
  ])}
  ${toolbar(
    ``,
    `${canAdd ? btn("➕ 新建模板", "blue sm", "openCreatePaTpl()") : ""}`,
  )}
  ${zone(
    list.length === 0
      ? `<div class="empty">暂无模板，点击「➕ 新建模板」创建</div>`
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
  document.getElementById("tpl_editor_body").innerHTML = rows || `<tr><td colspan="5" class="muted" style="text-align:center;padding:16px">暂无考核项，点击「＋ 新增大类」开始</td></tr>`;
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


/* ---------- VIEWS 注册 ---------- */
VIEWS.paTemplate = renderPaTemplate;

/* ---------- window 挂载 ---------- */
window.viewPaTplDetail = viewPaTplDetail;
window.viewTplHistory = viewTplHistory;
window.activatePaTplDirect = activatePaTplDirect;
window.activatePaTpl = activatePaTpl;
window.openCreatePaTpl = openCreatePaTpl;
window.submitCreatePaTpl = submitCreatePaTpl;
window.openEditPaTpl = openEditPaTpl;
window.submitEditPaTpl = submitEditPaTpl;
window.confirmDeletePaTpl = confirmDeletePaTpl;
window.doDeletePaTpl = doDeletePaTpl;
window._tplAddItemGroup = _tplAddItemGroup;
window._tplAddItemToGroup = _tplAddItemToGroup;
window._tplRemoveItem = _tplRemoveItem;
window._tplSyncFromRow = _tplSyncFromRow;
window._tplCardToggle = _tplCardToggle;
window._tplRoleRadio = _tplRoleRadio;

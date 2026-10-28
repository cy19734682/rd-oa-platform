/* ========== 系统管理模块视图 · views-sys.js ========== */
/* 包含：账号 / 角色 / 日志 / 字典 / 菜单管理 */

/* ---------- 系统：账号管理 ---------- */

/** 角色 key → 中文角色名下拉选项（用于新增/编辑账号弹窗） */
function _roleOptions(selectedKey = "") {
  return Object.entries(ROLES)
    .map(
      ([k, v]) =>
        `<option value="${k}" ${k === selectedKey ? "selected" : ""}>${v.name}</option>`,
    )
    .join("");
}

/** 部门树形下拉选项（从 DEPTS 生成，带缩进层级显示） */
function _deptOptions(selectedId = "") {
  const depts = (typeof window.DEPTS !== "undefined" ? window.DEPTS : DEPTS) || [];
  const out = [];
  const walk = (parentId, depth) => {
    depts.filter(d => d.parentId === parentId).sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .forEach(d => {
        const indent = "　".repeat(depth);
        const prefix = depth > 0 ? "├─ " : "";
        out.push(`<option value="${d.id}" ${d.id === selectedId ? "selected" : ""}>${indent}${prefix}${d.name}</option>`);
        walk(d.id, depth + 1);
      });
  };
  walk("", 0);
  return `<option value="">— 未分配 —</option>` + out.join("");
}

/** 渲染账号管理页面——直接读取 ACCOUNTS，操作后通过 replaceView 刷新 */
function renderSysAcct() {
  const canAdd = window.currentCanAction("sys", "sysAcct", "add");
  const canEdit = window.currentCanAction("sys", "sysAcct", "edit");
  const canDel = window.currentCanAction("sys", "sysAcct", "delete");
  const depts = (typeof window.DEPTS !== "undefined" ? window.DEPTS : DEPTS) || [];
  const deptMap = Object.fromEntries(depts.map(d => [d.id, d]));
  return `
  ${pageHeader(PAGES.sysAcct.title, PAGES.sysAcct.desc)}
  ${toolbar(
    `共 ${ACCOUNTS.length} 个账号 · 启用 ${ACCOUNTS.filter((a) => a.st === "启用").length} · 停用 ${ACCOUNTS.filter((a) => a.st === "停用").length}`,
    `${canAdd ? btn(BTN.addAcct, "sm", "openAddAcct()") : ""}`,
  )}
  ${zone(
    table(
      TH.sysAcct,
      ACCOUNTS,
      (a) => `<td><code>${a.id}</code></td>
        <td>${a.n}</td>
        <td>${a.deptId ? (deptMap[a.deptId]?.name || `<span style="color:#999">未知(${a.deptId})</span>`) : `<span style="color:#bbb">— 未分配 —</span>`}</td>
        <td>${a.phone || `<span style="color:#bbb">—</span>`}</td>
        <td>${tag(ROLES[a.key]?.name || `未知(${a.key})`, ROLES[a.key] ? "g" : "danger")}</td>
        <td>${a.st === "启用" ? tag(STATUS.enabled, STATUS_CLS.enabled) : tag(STATUS.disabled, STATUS_CLS.disabled)}</td>
        <td>${canEdit ? btn("编辑", "ghost sm", `openEditAcct('${a.id}')`) : ""}
          ${canEdit ? btn(BTN.resetPwd, "ghost sm", `resetPwd('${a.id}')`) : ""}
          ${canEdit ? btn(a.st === "启用" ? BTN.disable : BTN.enable, a.st === "启用" ? "danger sm" : "ok sm", `toggleAcct('${a.id}')`) : ""}
          ${canDel ? (a.id === "admin" ? btn("删除", "gray sm", `toast('内置管理员账号不可删除')`) : btn("删除", "ghost sm", `delAcct('${a.id}')`)) : ""}</td>`,
      "",
      290,
    ),
  )}`;
}

/* 注：replaceView 由 views.js 基座统一提供（原同名副本已移除） */

/** 新增账号弹窗 */
function openAddAcct() {
  if (!window.currentCanAction("sys", "sysAcct", "add")) { toast("您没有新增账号的权限"); return; }
  openModal(
    modalContent(
      BTN.addAcct,
      `${formRow("工号/账号", `<input id="acctNewId" placeholder="如 8020">`, true)}
       ${formRow("姓名", `<input id="acctNewName" placeholder="如 周工">`, true)}
       ${formRow("部门小组", `<select id="acctNewDept">${_deptOptions("")}</select>`, true)}
       ${formRow("手机号码", `<input id="acctNewPhone" placeholder="如 13800001234" maxlength="11">`, true)}
       ${formRow("角色", `<select id="acctNewRole">${_roleOptions("staff")}</select>`, true)}
       ${formRow("初始密码", `<input id="acctNewPwd" value="${DEFAULT_PWD}">`, false, "新账号默认密码为 123456，首次登录后请尽快修改")}
       ${formRow("状态", `<select><option selected>启用</option><option>停用</option></select>`, false, "新账号默认启用，保存后可在列表中随时调整")}`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认新增", "", "submitAddAcct()")}`,
    ),
  );
}

/** 提交新增账号表单 */
function submitAddAcct() {
  if (!window.currentCanAction("sys", "sysAcct", "add")) { toast("您没有新增账号的权限"); closeModal(); return; }
  const id = document.getElementById("acctNewId").value.trim();
  const n = document.getElementById("acctNewName").value.trim();
  const key = document.getElementById("acctNewRole").value;
  const deptId = document.getElementById("acctNewDept").value;
  const phone = document.getElementById("acctNewPhone").value.trim();
  if (!id || !n) {
    window.toast("请填写工号和姓名");
    return;
  }
  if (!deptId) { window.toast("请选择部门小组"); return; }
  if (!phone) { window.toast("请填写手机号码"); return; }
  if (!/^1[3-9]\d{9}$/.test(phone)) { window.toast("请填写正确的 11 位手机号码"); return; }
  if (window.findAccount(id)) {
    window.toast(`账号「${id}」已存在`);
    return;
  }
  const acct = window.addAccount(id, n, key, deptId, phone);
  if (!acct) {
    window.toast("新增失败，请检查输入");
    return;
  }
  closeModal();
  window.toast(`已新增账号「${n}（${id}）」角色：${ROLES[key].name}`);
  replaceView();
}

/** 编辑账号弹窗——可改姓名、部门小组、手机号码、角色、状态 */
function openEditAcct(id) {
  if (!window.currentCanAction("sys", "sysAcct", "edit")) { toast("您没有编辑账号的权限"); return; }
  const a = window.findAccount(id);
  if (!a) return;
  openModal(
    modalContent(
      `编辑账号 · ${a.n}`,
      `${formRow("工号", `<code style="font-size:13px;color:var(--title)">${a.id}</code>`, false, "工号创建后不可修改")}
       ${formRow("姓名", `<input id="acctEditName" value="${a.n}">`, true)}
       ${formRow("部门小组", `<select id="acctEditDept">${_deptOptions(a.deptId || "")}</select>`, true, "账号归属的部门或小组")}
       ${formRow("手机号码", `<input id="acctEditPhone" value="${a.phone || ""}" maxlength="11">`, true)}
       ${formRow("角色", `<select id="acctEditRole">${_roleOptions(a.key)}</select>`, true, "编辑后立即生效，该账号下一次登录将按新角色权限展示")}
       ${formRow("状态", `<select id="acctEditSt"><option ${a.st === "启用" ? "selected" : ""}>启用</option><option ${a.st === "停用" ? "selected" : ""}>停用</option></select>`, true)}`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditAcct('${id}')`)}`,
    ),
  );
}

/** 提交编辑表单 */
function submitEditAcct(id) {
  if (!window.currentCanAction("sys", "sysAcct", "edit")) { toast("您没有编辑账号的权限"); closeModal(); return; }
  const a = window.findAccount(id);
  if (!a) return;
  const n = document.getElementById("acctEditName").value.trim();
  const deptId = document.getElementById("acctEditDept").value;
  const phone = document.getElementById("acctEditPhone").value.trim();
  const key = document.getElementById("acctEditRole").value;
  const st = document.getElementById("acctEditSt").value;
  if (!n) { window.toast("姓名不能为空"); return; }
  if (!deptId) { window.toast("请选择部门小组"); return; }
  if (!phone) { window.toast("请填写手机号码"); return; }
  if (!/^1[3-9]\d{9}$/.test(phone)) { window.toast("请填写正确的 11 位手机号码"); return; }
  const oldDept = a.deptId;
  const oldPhone = a.phone;
  const oldKey = a.key;
  const oldSt = a.st;
  window.updateAccount(id, { n, deptId, phone, key, st });
  closeModal();
  let tip = `已保存「${a.n}」的修改`;
  if (oldDept !== deptId) tip += `，部门变更为「${deptId}」`;
  if (oldPhone !== phone) tip += `，手机号已更新`;
  if (oldKey !== key) tip += `，角色变更为「${ROLES[key].name}」`;
  if (oldSt !== st) tip += `，状态变更为「${st}」`;
  window.toast(tip);
  replaceView();
}

/** 切换启用/停用 */
function toggleAcct(id) {
  if (!window.currentCanAction("sys", "sysAcct", "edit")) { toast("您没有启用/停用账号的权限"); return; }
  const a = window.toggleAccount(id);
  if (!a) return;
  window.toast(`账号「${a.n}」已${a.st === "启用" ? "启用" : "停用"}`);
  replaceView();
}

/** 重置密码 */
function resetPwd(id) {
  if (!window.currentCanAction("sys", "sysAcct", "edit")) { toast("您没有重置密码的权限"); return; }
  const a = window.resetAccountPwd(id);
  if (!a) return;
  openModal(
    modalContent(
      "密码重置成功",
      `<p>账号「<b>${a.n}（${a.id}）</b>」的密码已重置为：</p>
       <div style="font-size:28px;font-family:monospace;text-align:center;margin:16px 0;color:var(--primary);font-weight:700">${a.pwd}</div>
       <div class="small muted">请通知本人尽快修改密码。</div>`,
      btn("知道了", "", "closeModal()"),
    ),
  );
}

/** 删除账号 */
function delAcct(id) {
  if (!window.currentCanAction("sys", "sysAcct", "delete")) { toast("您没有删除账号的权限"); return; }
  const a = window.findAccount(id);
  if (!a) return;
  openModal(
    modalContent(
      "确认删除账号",
      `<p>确定要删除账号「<b>${a.n}（${a.id}）</b>」吗？此操作不可恢复。</p>
       <div class="small muted">⚠ 建议先将该账号关联的项目/任务重新分配。</div>`,
      `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认删除", "danger", `closeModal();doDelAcct('${id}')`)}`,
    ),
  );
}
function doDelAcct(id) {
  if (!window.currentCanAction("sys", "sysAcct", "delete")) { toast("您没有删除账号的权限"); closeModal(); return; }
  if (window.deleteAccount(id)) {
    window.toast("账号已删除");
    replaceView();
  } else {
    window.toast("删除失败");
  }
}

/* ---------- 系统：部门管理 ---------- */

/** 将扁平部门数组转为按层级排序的树序数组 + 每个节点的 depth */
function _buildDeptTree(depts) {
  const map = {};
  depts.forEach(d => { map[d.id] = { ...d, children: [] }; });
  const roots = [];
  depts.forEach(d => {
    if (d.parentId && map[d.parentId]) {
      map[d.parentId].children.push(map[d.id]);
    } else {
      roots.push(map[d.id]);
    }
  });
  // 按 sort 排序
  const sortTree = (arr) => {
    arr.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    arr.forEach(n => sortTree(n.children));
  };
  sortTree(roots);
  // 展开为有序扁平数组 + depth
  const result = [];
  const walk = (nodes, depth) => {
    nodes.forEach(n => {
      result.push({ ...n, depth });
      walk(n.children, depth + 1);
    });
  };
  walk(roots, 0);
  return result;
}

function renderSysDept() {
  const canAdd = window.currentCanAction("sys", "sysDept", "add");
  const canEdit = window.currentCanAction("sys", "sysDept", "edit");
  const canDel = window.currentCanAction("sys", "sysDept", "delete");
  const depts = (typeof window.DEPTS !== "undefined" ? window.DEPTS : DEPTS) || [];
  const hasChild = {};
  depts.forEach(d => { if (d.parentId) hasChild[d.parentId] = true; });
  const topCount = depts.filter(d => !d.parentId).length;

  // 树序展开
  const treeList = _buildDeptTree(depts);

  const rows = treeList.map(d => {
    const isParent = hasChild[d.id];
    const indent = "　".repeat(d.depth);
    const prefix = d.depth > 0 ? (isParent ? "├─ " : "└─ ") : "";
    return `<tr>
      <td style="white-space:nowrap">${indent}<code>${d.id}</code></td>
      <td style="white-space:nowrap">${indent}${prefix}<b>${_escape(d.name)}</b>
      </td>
      <td style="white-space:nowrap">
        ${canAdd ? btn("＋ 子部门", "ghost sm", `openAddChildDept('${d.id}')`) : ""}
        ${canEdit ? btn("编辑", "ghost sm", `openEditDept('${d.id}')`) : ""}
        ${canDel ? (isParent ? btn("删除", "gray sm", `toast('存在子部门，无法删除')`) : btn("删除", "danger ghost sm", `confirmDelDept('${d.id}')`)) : ""}
      </td>
    </tr>`;
  }).join("");

  return `
  ${pageHeader(PAGES.sysDept.title, PAGES.sysDept.desc)}
  ${toolbar(
    `共 ${depts.length} 个部门 · 顶层 ${topCount} 个 · 子部门 ${depts.length - topCount} 个`,
    '',
  )}
  ${zone(`
    <table class="tbl">
      <thead><tr>${TH.sysDept.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows || `<tr><td colspan="3" class="empty">暂无部门数据</td></tr>`}</tbody>
    </table>
  `)}`;
}

/** 生成部门编码：基于父部门名称拼音首字母 + 同层序号（在弹窗中由用户输入名称后自动填充） */
function _nextDeptCode(parentId, hintName) {
  const depts = (typeof window.DEPTS !== "undefined" ? window.DEPTS : DEPTS) || [];
  // 如果有 hintName，用其拼音首字母
  if (hintName && window._pinyinInitials) {
    const py = window._pinyinInitials(hintName);
    if (py) {
      const siblings = depts.filter(d => d.parentId === parentId && d.id.startsWith(py));
      if (siblings.length === 0) return py;
      return py + (siblings.length + 1);
    }
  }
  // 回退：父级拼音 + 序号
  const parent = depts.find(d => d.id === parentId);
  const base = (parent && window._pinyinInitials) ? window._pinyinInitials(parent.name) : "DEP";
  const siblings = depts.filter(d => d.parentId === parentId && d.id.startsWith(base));
  return base + (siblings.length + 1);
}


/** 弹窗内名称输入时自动用拼音首字母填充编码 */
function _autoFillDeptCode(parentId) {
  const nameEl = document.getElementById("deptNewName");
  const idEl = document.getElementById("deptNewId");
  if (!nameEl || !idEl) return;
  const name = nameEl.value.trim();
  if (!name || !window._pinyinInitials) return;
  idEl.value = _nextDeptCode(parentId || "", name);
}/** 新增顶层部门弹窗 */
function openAddDept() {
  if (!window.currentCanAction("sys", "sysDept", "add")) { toast("您没有新增部门的权限"); return; }
  const nextCode = _nextDeptCode("");
  openModal(modalContent("➕ 新增顶层部门",
    `<div class="fm">
      ${formRow("部门编码", `<input id="deptNewId" value="${nextCode}" placeholder="如 D007">`, true)}
      ${formRow("部门名称", `<input id="deptNewName" placeholder="如 数据部" oninput="_autoFillDeptCode('')">`, true)}
    </div>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认新增", "", `submitAddDept('', '${nextCode}')`)}`));
}
/** 在指定 parentId 下新增子部门（行内"＋ 子部门"按钮调用） */
function openAddChildDept(parentId) {
  if (!window.currentCanAction("sys", "sysDept", "add")) { toast("您没有新增部门的权限"); return; }
  const depts = (typeof window.DEPTS !== "undefined" ? window.DEPTS : DEPTS) || [];
  const parent = depts.find(d => d.id === parentId);
  if (!parent) return;
  const nextCode = _nextDeptCode(parentId);
  openModal(modalContent(`➕ 新增子部门 · 父级：${_escape(parent.name)}`,
    `<div class="fm">
      ${formRow("父级部门", `<code style="font-size:13px">${_escape(parent.name)}（${parent.id}）</code>`, false, "已锁定，行内添加自动归属")}
      ${formRow("部门编码", `<input id="deptNewId" value="${nextCode}">`, true)}
      ${formRow("部门名称", `<input id="deptNewName" placeholder="如 前端组" oninput="_autoFillDeptCode('${parentId}')">`, true)}
    </div>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认新增", "", `submitAddDept('${parentId}', '${nextCode}')`)}`));
}
function submitAddDept(parentId, hintCode) {
  if (!window.currentCanAction("sys", "sysDept", "add")) { toast("您没有新增部门的权限"); closeModal(); return; }
  const id = (document.getElementById("deptNewId").value || hintCode || "").trim();
  const name = document.getElementById("deptNewName").value.trim();
  if (!id || !name) { toast("请填写部门编码和名称"); return; }
  if (window.findDept(id)) { toast(`部门编码「${id}」已存在`); return; }
  const d = window.addDept(id, name, parentId || "");
  if (!d) { toast("新增失败"); return; }
  closeModal(); toast(`已新增部门「${name}」`); replaceView();
}

/** 编辑部门弹窗 */
function openEditDept(id) {
  if (!window.currentCanAction("sys", "sysDept", "edit")) { toast("您没有编辑部门的权限"); return; }
  const d = window.findDept(id); if (!d) return;
  const depts = (typeof window.DEPTS !== "undefined" ? window.DEPTS : DEPTS) || [];
  // 父级部门统一只读展示，不允许通过编辑移动层级
  const parentDisplay = d.parentId
    ? (() => { const p = depts.find(x => x.id === d.parentId); return p ? `${_escape(p.name)}（${p.id}）` : d.parentId; })()
    : "（顶层部门，不可变更）";
  const parentRow = formRow("父级部门", `<code style="font-size:13px;color:#666">${parentDisplay}</code>`, false, "父级部门不可修改，如需调整层级请删除后重建");
  openModal(modalContent(`📝 编辑部门 · ${_escape(d.name)}`,
    `<div class="fm">
      ${parentRow}
      ${formRow("部门编码", `<code style="font-size:13px;color:var(--title)">${d.id}</code>`, false, "编码创建后不可修改")}
      ${formRow("部门名称", `<input id="deptEditName" value="${_escape(d.name)}">`, true)}
    </div>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditDept('${id}')`)}`));
}
function submitEditDept(id) {
  if (!window.currentCanAction("sys", "sysDept", "edit")) { toast("您没有编辑部门的权限"); closeModal(); return; }
  const d = window.findDept(id); if (!d) return;
  const name = document.getElementById("deptEditName").value.trim();
  if (!name) { toast("部门名称不能为空"); return; }
  window.updateDept(id, { name });
  closeModal(); toast("已保存部门修改"); replaceView();
}

/** 删除部门确认 */
function confirmDelDept(id) {
  if (!window.currentCanAction("sys", "sysDept", "delete")) { toast("您没有删除部门的权限"); return; }
  const d = window.findDept(id); if (!d) return;
  openModal(modalContent("确认删除部门",
    `<p>确定删除部门 <b>${_escape(d.name)}（${d.id}）</b>？此操作不可恢复。</p>
     <div class="small muted">⚠ 有子部门的部门不允许删除，请先处理子部门。</div>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `closeModal();doDelDept('${id}')`)}`));
}
function doDelDept(id) {
  if (!window.currentCanAction("sys", "sysDept", "delete")) { toast("您没有删除部门的权限"); closeModal(); return; }
  if (window.deleteDept(id)) { toast("部门已删除"); replaceView(); }
  else { toast("删除失败：请检查是否存在子部门"); }
}

/* ---------- 系统：角色管理 ---------- */
/** 指定角色是否可见某模块（镜像 canAccessModule 逻辑，但按传入角色而非当前角色计算） */
function _roleCanSeeModule(roleKey, moduleKey) {
  if (roleKey === "sysAdmin") return true;
  const perms = ROLES[roleKey] && ROLES[roleKey].perms;
  if (!perms) return false;
  const mod = perms[moduleKey];
  if (!mod) return false;
  if (mod.enabled === true) return true;
  if (!mod.subs) return false;
  for (const sk in mod.subs) {
    if (_hasAnyPerm(mod.subs[sk])) return true;
  }
  return false;
}

/** 指定角色在门户可见的卡片列表（门户卡 roles 过滤 + 内部卡模块授权 + 上架状态）
 *  sysAdmin 为超级用户，不受 roles 白名单约束 */
function _rolePortalApps(roleKey) {
  const apps = typeof getPortalApps === "function" ? getPortalApps() : [];
  return apps.filter((a) => {
    if (a.enabled === false) return false;
    if (roleKey !== "sysAdmin" && a.roles && a.roles.length && a.roles.indexOf(roleKey) < 0) return false;
    if (a.kind === "internal") return !!a.mod && _roleCanSeeModule(roleKey, a.mod);
    return true;
  });
}

function renderSysRole() {
  const canAdd = window.currentCanAction("sys", "sysRole", "add");
  const canEdit = window.currentCanAction("sys", "sysRole", "edit");
  const canDel = window.currentCanAction("sys", "sysRole", "delete");
  // 从 ROLES 构建角色列表
  const roles = Object.entries(ROLES).map(([k, v]) => ({
    key: k,
    name: v.name,
    builtin: !!v.builtin,
  }));
  return `
  ${pageHeader(PAGES.sysRole.title, PAGES.sysRole.desc)}
  ${toolbar(
    `共 ${roles.length} 个角色`,
    `${canAdd ? btn("+ 新增角色", "sm", "openAddRole()") : ""}`,
  )}
  ${zone(
    table(
      TH.sysRole,
      roles,
      (r) => {
        const portalApps = _rolePortalApps(r.key);
        const portalCell = portalApps.length
          ? portalApps.map((a) => `<span class="tag g">${_escape(a.name)}</span>`).join(" ")
          : '<span class="muted">无（门户不可见任何卡片）</span>';
        return `
        <td><code>${r.key}</code></td>
        <td>${r.name}</td>
        <td>${portalCell}</td>
        <td>
          ${canEdit ? btn("权限配置", "ghost sm", `openPermConfigFor('${r.key}')`) : ""}
          ${canEdit ? btn("编辑", "ghost sm", `openEditRole('${r.key}')`) : ""}
          ${canDel ? (r.builtin ? btn("删除", "gray sm", `toast('内置角色不可删除')`) : btn("删除", "danger sm", `delRole('${r.key}')`)) : ""}
        </td>`;
      },
    ),
  )}`;
}

/** 打开权限配置弹窗并自动选中指定角色（角色管理页"权限配置"按钮入口） */
function openPermConfigFor(roleKey) {
  if (!window.currentCanAction("sys", "sysRole", "edit")) { toast("您没有权限配置的权限"); return; }
  if (typeof window.openPermConfig !== "function") return;
  // 临时设置目标角色，让 openPermConfig 打开时直接定位
  window._permConfigTarget = roleKey;
  window.openPermConfig();
  window._permConfigTarget = null;
}

/** 新增角色弹窗 */
function openAddRole() {
  if (!window.currentCanAction("sys", "sysRole", "add")) { toast("您没有新增角色的权限"); return; }
  openModal(
    modalContent(
      "新增角色",
      `${formRow("角色编码", `<input id="roleNewKey" placeholder="字母开头，如 deptLead">`, true, "作为角色唯一标识，字母数字下划线，创建后不可修改")}
       ${formRow("角色名称", `<input id="roleNewName" placeholder="如 部门负责人">`, true)}
       ${formRow("角色描述", `<textarea id="roleNewDesc" rows="3" placeholder="简要说明该角色的工作职责或权限范围"></textarea>`, false)}
       ${formRow("复制权限自", `<select id="roleNewFrom">${_roleOptions("staff")}</select>`, false, "新角色将继承所选角色的菜单权限，可在权限配置中调整")}`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认新增", "", "submitAddRole()")}`,
    ),
  );
}

/** 提交新增角色表单 */
function submitAddRole() {
  if (!window.currentCanAction("sys", "sysRole", "add")) { toast("您没有新增角色的权限"); closeModal(); return; }
  const key = document.getElementById("roleNewKey").value.trim();
  const name = document.getElementById("roleNewName").value.trim();
  const desc = document.getElementById("roleNewDesc").value.trim();
  if (!key || !name) {
    window.toast("请填写角色编码和名称");
    return;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,20}$/.test(key)) {
    window.toast("角色编码需字母开头，字母数字下划线，2-21 位");
    return;
  }
  if (ROLES[key]) {
    window.toast(`角色编码「${key}」已存在`);
    return;
  }
  const r = window.addRole(key, name, desc);
  if (!r) {
    window.toast("新增失败");
    return;
  }
  // addRole 已默认生成 MODULES 权限模板，这里根据用户选择做覆盖
  const fromKey = document.getElementById("roleNewFrom").value;
  if (fromKey && ROLES[fromKey] && ROLES[fromKey].perms) {
    _copyPermsForRole(fromKey, key);
  } else {
    // 无模板时给新角色全部授权（保留默认的 MODULES 模板即可）
    _grantAllPermsForRole(key);
  }
  closeModal();
  window.toast(`已新增角色「${name}」（${key}）`);
  replaceView();
}

/** 从源角色深拷贝 perms 到目标角色 */
function _copyPermsForRole(fromKey, toKey) {
  if (!ROLES[fromKey] || !ROLES[fromKey].perms || !ROLES[toKey]) return;
  ROLES[toKey].perms = JSON.parse(JSON.stringify(ROLES[fromKey].perms));
  saveRoles();
}

/** 给角色开放所有模块权限（全部授权） */
function _grantAllPermsForRole(key) {
  if (!ROLES[key]) return;
  ROLES[key].perms = window.buildFullRolePerms();
  saveRoles();
}

/** 编辑角色弹窗 */
function openEditRole(key) {
  if (!window.currentCanAction("sys", "sysRole", "edit")) { toast("您没有编辑角色的权限"); return; }
  const r = ROLES[key];
  if (!r) return;
  openModal(
    modalContent(
      `编辑角色 · ${r.name}`,
      `${formRow("角色编码", `<code style="font-size:13px;color:var(--title)">${key}</code>`, false, "角色编码创建后不可修改")}
       ${formRow("角色名称", `<input id="roleEditName" value="${r.name}">`, true)}
       ${formRow("角色描述", `<textarea id="roleEditDesc" rows="3">${r.desc || ""}</textarea>`, false)}`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditRole('${key}')`)}`,
    ),
  );
}

/** 提交编辑角色表单 */
function submitEditRole(key) {
  if (!window.currentCanAction("sys", "sysRole", "edit")) { toast("您没有编辑角色的权限"); closeModal(); return; }
  const r = ROLES[key];
  if (!r) return;
  const name = document.getElementById("roleEditName").value.trim();
  const desc = document.getElementById("roleEditDesc").value.trim();
  if (!name) {
    window.toast("角色名称不能为空");
    return;
  }
  window.updateRole(key, { name, desc });
  closeModal();
  window.toast(`已保存角色「${name}」的修改`);
  replaceView();
}

/** 删除角色——关联账号降级为 staff */
function delRole(key) {
  if (!window.currentCanAction("sys", "sysRole", "delete")) { toast("您没有删除角色的权限"); return; }
  const r = ROLES[key];
  if (!r) return;
  const acctCount = ACCOUNTS.filter((a) => a.key === key).length;
  openModal(
    modalContent(
      "确认删除角色",
      `<p>确定要删除角色「<b>${r.name}</b>（${key}）」吗？</p>
       ${
         acctCount > 0
           ? `<div style="background:#fff4f4;border:1px solid #ffd6d6;border-radius:6px;padding:10px 12px;margin:8px 0;font-size:13px;color:var(--error)">⚠ 该角色下有 <b>${acctCount}</b> 个账号，删除后相关账号将降级为「一般人员」</div>`
           : `<div class="small muted">当前无账号使用此角色，可安全删除。</div>`
       }
       <div class="small muted">删除后，该角色的菜单权限配置将一并清除。</div>`,
      `${btn(BTN.cancel, "gray", "closeModal()")} ${btn("确认删除", "danger", `closeModal();doDelRole('${key}')`)}`,
    ),
  );
}
function doDelRole(key) {
  if (!window.currentCanAction("sys", "sysRole", "delete")) { toast("您没有删除角色的权限"); closeModal(); return; }
  const ok = window.deleteRole(key);
  if (!ok) {
    window.toast("删除失败：内置角色不可删");
    return;
  }
  // 关联账号降级为 staff
  let downgraded = 0;
  ACCOUNTS.forEach((a) => {
    if (a.key === key) {
      a.key = "staff";
      downgraded++;
    }
  });
  if (downgraded > 0) saveAccounts();
  // 权限已内嵌到 ROLES，删除角色时 deleteRole 已自动清除
  let tip = `已删除角色「${key}」`;
  if (downgraded > 0) tip += `，${downgraded} 个账号已降级为 staff`;
  window.toast(tip);
  replaceView();
}

/* ---------- 系统：日志与审计 ---------- */
function renderSysLog() {
  return `
  ${pageHeader(PAGES.sysLog.title, PAGES.sysLog.desc)}
  ${card(
    `${filterGroup([
      {
        label: "日志类型",
        html: select(["", UI.logType.platform, UI.logType.subsystem]),
      },
      { label: "人员", html: select(["", "张工", "李工", "赵工", "刘工", "admin"]) },
      { label: "日期", html: `<input placeholder="${UI.datePlaceholder}">` },
    ])}
    ${btn(BTN.query, "sm")}`,
  )}
  ${zone(
    table(
      TH.sysLog,
      MOCK.sysLogs,
      (l) =>
        `<td>${l.time}</td><td>${l.who}</td><td>${tag(l.type, l.typeCls)}</td><td>${l.action}</td><td>${l.target}</td>`,
    ),
    "",
  )}`;
}

/* ---------- 系统：数据字典管理 ---------- */
﻿function renderSysDict() {
  const canAdd = window.currentCanAction('sys', 'sysDict', 'add');
  const canEdit = window.currentCanAction('sys', 'sysDict', 'edit');
  const canDel = window.currentCanAction('sys', 'sysDict', 'delete');
  const meta = window.DICT_META || {};
  const dictKeys = Object.keys(meta);
  const rows = dictKeys.map((key) => {
    const info = meta[key];
    const items = window.getDict ? window.getDict(key) : [];
    const preview = items.slice(0, 5).map((d) => tag(_escape(d), 'g')).join(' ')
      + (items.length > 5 ? `<span class="muted small">…+${items.length - 5}</span>` : '');
    return `<tr>
      <td><code>${_escape(key)}</code></td>
      <td><b>${_escape(info.label)}</b></td>
      <td><span class="small muted">${_escape(info.desc)}</span></td>
      <td>${tag(items.length + ' 项', items.length > 0 ? 'ok' : 'muted')}</td>
      <td style="max-width:300px">${preview || '<span class="muted small">暂无</span>'}</td>
      <td style="white-space:nowrap">
        ${btn('查看子项', 'sm', `openSysDictView('${key}')`)}
        ${canEdit ? btn('编辑', 'ghost sm', `openSysDictEditGroup('${key}')`) : ''}
        ${canDel ? btn('删除', 'danger sm', `openSysDictDelGroup('${key}')`) : ''}
      </td>
    </tr>`;
  }).join('');
  return `
  ${pageHeader(PAGES.sysDict.title, PAGES.sysDict.desc)}
  ${toolbar(
    btn('+ 新增字典组', 'blue sm', 'openSysDictAddGroup()'),
    '',
  )}
  ${zone(
    `<table class="tb">
      <thead><tr>
        <th>字典键</th><th>字典名称</th><th>描述</th><th>子项数</th><th>子项预览</th><th>操作</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    '',
  )}`;
}

function openSysDictAddGroup() {
  openModal(
    modalContent(
      '+ 新增字典组',
      formRow('字典键', '<input id="sd_key" class="ipt" placeholder="英文标识，如 productType" />', true)
        + formRow('字典名称', '<input id="sd_label" class="ipt" placeholder="如 产品类型" />', true)
        + formRow('描述', '<input id="sd_desc" class="ipt" placeholder="字典用途说明" />'),
      `${btn('取消', 'gray', 'closeModal()')} ${btn('保存', '', 'doSysDictAddGroup()')}`,
    ),
  );
}
function doSysDictAddGroup() {
  const k = document.getElementById('sd_key')?.value.trim();
  const l = document.getElementById('sd_label')?.value.trim();
  const d = document.getElementById('sd_desc')?.value.trim();
  if (!k || !l) { toast('字典键和字典名称必填'); return; }
  // 确保 window.DICT_META 存在（防止 loadDictMeta 还没执行）
  if (!window.DICT_META || typeof window.DICT_META !== 'object') {
    window.DICT_META = {};
  }
  if (window.DICT_META[k]) { toast('字典键已存在'); return; }
  // 优先使用 config-std.js 提供的 updateDictMeta（它会自动持久化）
  if (typeof window.updateDictMeta === 'function') {
    window.updateDictMeta(k, l, d || '');
  } else {
    window.DICT_META[k] = { label: l, desc: d || '' };
    if (typeof window.saveDictMeta === 'function') window.saveDictMeta();
  }
  // 同时确保字典项存储里也有这个 key（空数组）
  const cur = localStorage.getItem('oa_sys_dict');
  let all = cur ? JSON.parse(cur) : {};
  if (!all[k]) all[k] = [];
  localStorage.setItem('oa_sys_dict', JSON.stringify(all));
  toast('已新增字典组'); closeModal(); replaceView();
}

function openSysDictEditGroup(key) {
  const info = window.DICT_META[key] || { label: key, desc: '' };
  openModal(
    modalContent(
      '编辑字典组',
      formRow('字典键', `<input class="ipt" value="${_escape(key)}" disabled style="background:#f5f5f5" />`)
        + formRow('字典名称', `<input id="sd_label" class="ipt" value="${_escape(info.label)}" />`, true)
        + formRow('描述', `<input id="sd_desc" class="ipt" value="${_escape(info.desc || '')}" />`),
      `${btn('取消', 'gray', 'closeModal()')} ${btn('保存', '', `doSysDictEditGroup('${key}')`)}`,
    ),
  );
}
function doSysDictEditGroup(key) {
  const l = document.getElementById('sd_label')?.value.trim();
  const d = document.getElementById('sd_desc')?.value.trim();
  if (!l) { toast('字典名称必填'); return; }
  // 优先使用 config-std.js 提供的 updateDictMeta（它会自动持久化）
  if (typeof window.updateDictMeta === 'function') {
    window.updateDictMeta(key, l, d || '');
  } else {
    if (!window.DICT_META || typeof window.DICT_META !== 'object') window.DICT_META = {};
    window.DICT_META[key] = { label: l, desc: d || '' };
    if (typeof window.saveDictMeta === 'function') window.saveDictMeta();
  }
  toast('已更新'); closeModal(); replaceView();
}

function openSysDictDelGroup(key) {
  const info = window.DICT_META[key] || { label: key };
  openModal(
    modalContent(
      '删除字典组',
      `<p>确定要删除字典组 <b>「${_escape(info.label)}」</b> 吗？</p>
       <p class="small muted">该组下所有字典子项将一并删除。</p>`,
      `${btn('取消', 'gray', 'closeModal()')} ${btn('确认删除', 'danger', `doSysDictDelGroup('${key}')`)}`,
    ),
  );
}
function doSysDictDelGroup(key) {
  // 优先使用 config-std.js 提供的 deleteDictMeta（它会自动持久化）
  if (typeof window.deleteDictMeta === 'function') {
    window.deleteDictMeta(key);
  } else {
    if (window.DICT_META && window.DICT_META[key]) delete window.DICT_META[key];
    if (typeof window.saveDictMeta === 'function') window.saveDictMeta();
  }
  // 同步删除字典项存储中的对应 key
  const cur = localStorage.getItem('oa_sys_dict');
  if (cur) {
    let all = JSON.parse(cur);
    delete all[key];
    localStorage.setItem('oa_sys_dict', JSON.stringify(all));
  }
  closeModal(); toast('已删除'); replaceView();
}

function openSysDictView(key) {
  const info = window.DICT_META[key] || { label: key };
  const items = window.getDict ? window.getDict(key) : [];
  openModal(
    modalContent(
      `字典子项：${info.label}`,
      `<div style="font-size:12px;color:#999;margin-bottom:8px">共 ${items.length} 项</div>
       <div style="max-height:400px;overflow-y:auto;border:1px solid #eee;padding:8px;border-radius:4px">
         ${items.length > 0
           ? items.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 2px;border-bottom:1px solid #f5f5f5">
               <span style="color:#999;width:28px;font-size:12px">${i + 1}</span>
               <span style="flex:1">${tag(_escape(d), 'g')}</span>
               ${btn('编辑', 'ghost sm', `openSysDictEditItem('${key}', '${_escape(d)}')`)}
               ${btn('删除', 'danger sm', `doSysDictDelItem('${key}', '${_escape(d)}')`)}
             </div>`).join('')
           : '<span class="muted small">暂无字典子项</span>'}
       </div>
       <div style="margin-top:12px;display:flex;gap:8px">
         <input id="sd_new_item" class="ipt" placeholder="新增子项名称" />
         ${btn('+ 添加', 'sm', `doSysDictAddItem('${key}')`, 'width:70px')}
       </div>`,
      `${btn('关闭', 'gray', 'closeModal()')}`,
    ),
  );
}

function doSysDictAddItem(key) {
  const v = (document.getElementById('sd_new_item')?.value || '').trim();
  if (!v) { toast('请填写子项名称'); return; }
  if (window.addDictItem(key, v)) { toast('已添加'); openSysDictView(key); }
  else { toast('已存在相同项'); }
}

function openSysDictEditItem(key, oldVal) {
  openModal(
    modalContent(
      '编辑字典子项',
      formRow('原名称', `<input class="ipt" value="${_escape(oldVal)}" disabled style="background:#f5f5f5" />`),
      formRow('新名称', `<input id="sd_new_val" class="ipt" value="${_escape(oldVal)}" />`, true),
      `${btn('取消', 'gray', `openSysDictView('${key}')`)} ${btn('保存', '', `doSysDictEditItem('${key}', '${_escape(oldVal)}')`)}`,
    ),
  );
}
function doSysDictEditItem(key, oldVal) {
  const newVal = (document.getElementById('sd_new_val')?.value || '').trim();
  if (!newVal) { toast('请填写名称'); return; }
  if (newVal === oldVal) { closeModal(); openSysDictView(key); return; }
  const cur = localStorage.getItem('oa_sys_dict');
  let all = cur ? JSON.parse(cur) : {};
  let arr = all[key] || [];
  if (arr.includes(newVal)) { toast('新名称已存在'); return; }
  arr = arr.map((x) => x === oldVal ? newVal : x);
  arr = [...new Set(arr)];
  all[key] = arr;
  localStorage.setItem('oa_sys_dict', JSON.stringify(all));
  closeModal(); toast('已更新'); openSysDictView(key);
}

function doSysDictDelItem(key, val) {
  if (window.removeDictItem(key, val)) { toast('已删除'); openSysDictView(key); }
}

/* ---------- 占位视图（外部子系统） ---------- */
/* renderPlaceholder 统一定义在 router.js 中，负责区分三种场景（外部聚合页 / 外链引导页 / 内部未实现） */

/* ---------- 菜单管理 ---------- */

/** 递归渲染某层 subs 列表行，支持任意深度嵌套 */
function _renderSubRows(subsArr, path, depth) {
  if (!subsArr || subsArr.length === 0) return "";
  const canAdd = window.currentCanAction("sys", "sysMenu", "add");
  const canEdit = window.currentCanAction("sys", "sysMenu", "edit");
  const canDel = window.currentCanAction("sys", "sysMenu", "delete");
  return subsArr
    .map((s) => {
      const curPath = [...path, s.key];
      const hasChildren = Array.isArray(s.subs) && s.subs.length > 0;
      const childDepth = depth + 1;
      const childBadge = hasChildren
        ? `<span class="badge" style="background:#f9f0ff;color:#722ed1;border-color:#d3adf7">${s.subs.length} 项</span>`
        : "";
      const iconBadge = s.type === "external"
        ? `<span class="badge" style="background:#e6f7ff;color:#1890ff;border-color:#91d5ff">外链</span>`
        : `<span class="badge" style="background:#f6ffed;color:#52c41a;border-color:#b7eb8f">内部</span>`;
      const urlCell = s.type === "external" && s.url
        ? `<span class="ms-url muted" title="${s.url}" style="max-width:${depth === 0 ? 180 : 160}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle">${s.url}</span>`
        : "";
      const childRows = _renderSubRows(s.subs, curPath, childDepth);
      // JSON.stringify 生成的双引号在 onclick 双引号属性中会截断，换为单引号
      const pathArg = JSON.stringify(path).replace(/"/g, "'");
      const curPathArg = JSON.stringify(curPath).replace(/"/g, "'");
      return `
        <div class="${depth === 0 ? "menu-sub-row" : "menu-sub-subrow"}" style="${depth > 0 ? "padding-left:" + (depth * 20) + "px" : ""}">
          <span class="ms-ic">${s.icon || "📄"}</span>
          <span class="ms-name">${s.name}</span>
          <span class="ms-key"><code>${s.key}</code></span>
          <span class="ms-order">#${s.order || "-"}</span>
          ${iconBadge}
          ${childBadge}
          ${urlCell}
          <span class="ms-actions">
            ${canAdd && s.type !== "external" ? btn("+ 子项", "ghost sm", `openAddMenuAt(${curPathArg})`) : ""}
            ${canEdit ? btn("编辑", "ghost sm", `openEditMenuAt(${pathArg}, '${s.key}')`) : ""}
            ${canDel ? btn("删除", "danger sm", `delMenuAt(${pathArg}, '${s.key}')`) : ""}
          </span>
        </div>
        ${childRows ? `<div class="menu-sub-sub-list">${childRows}</div>` : ""}`;
    })
    .join("");
}

function renderSysMenu() {
  const canAdd = window.currentCanAction("sys", "sysMenu", "add");
  const canEdit = window.currentCanAction("sys", "sysMenu", "edit");
  const canDel = window.currentCanAction("sys", "sysMenu", "delete");
  const header = pageHeader(PAGES.sysMenu ? PAGES.sysMenu.title : "菜单管理", PAGES.sysMenu ? PAGES.sysMenu.desc : "管理系统的菜单模块和子菜单，修改后角色权限配置将自动同步");
  const tabs = _sysMenuTabs();
  /* 门户配置 tab：子系统上架 / 排序 / 元数据 / 主题配色 / 可见角色 / 新增外部系统 */
  if ((window.__sysMenuTab || "portal") !== "subs") {
    return `${header}${tabs}${_renderPortalConfigTab(canEdit, canAdd)}`;
  }
  /* 子系统菜单 tab：既有三级菜单树原样保留 */
  const menus = _sortedMenus();
  // 构建模块卡片列表
  const cards = menus
    .map(([mk, m]) => {
      const subsSorted = _sortedSubs(mk);
      const subsRows = subsSorted.length
        ? _renderSubRows(subsSorted, [mk], 0)
        : `<div class="menu-sub-empty">无子菜单</div>`;
      return `
        <div class="menu-card" data-mk="${mk}">
          <div class="menu-card-head">
            <div class="menu-card-head-left" onclick="toggleMenuCard('${mk}')">
              <span class="menu-card-toggle">▼</span>
              <span class="menu-card-ic">${m.icon || "📦"}</span>
              <span class="menu-card-name">${m.name}</span>
              <span class="menu-card-key"><code>${mk}</code></span>
              ${m.type === "external" ? `<span class="badge" style="background:#e6f7ff;color:#1890ff;border-color:#91d5ff">外链</span>` : `<span class="badge" style="background:#f6ffed;color:#52c41a;border-color:#b7eb8f">内部</span>`}
              <span class="muted">· 排序 #${m.order || "-"} · ${subsSorted.length} 个子菜单</span>
              ${m.type === "external" && m.url ? `<span class="muted" style="margin-left:8px;color:#1890ff">${m.url}</span>` : ""}
            </div>
            <div class="menu-card-actions">
              ${canAdd && m.type !== "external" ? btn("+ 子菜单", "ghost sm", `openAddMenuAt(['${mk}'])`) : ""}
              ${canEdit ? btn("编辑模块", "ghost sm", `openEditMenuModule('${mk}')`) : ""}
              ${canDel ? btn("删除模块", "danger sm", `delMenuModule('${mk}')`) : ""}
            </div>
          </div>
          <div class="menu-card-body">
            ${subsRows}
          </div>
        </div>`;
    })
    .join("");
  return `
  ${header}${tabs}
  ${toolbar(
    `共 ${menus.length} 个模块 · ${menus.reduce((t, [, m]) => t + (m.subs ? m.subs.length : 0), 0)} 个子菜单`,
    `${canAdd ? btn("+ 新增模块", "sm", "openAddMenuModule()") : ""}`,
  )}
  ${zone(`<div class="menu-list">${cards}</div>`, "🧭 菜单结构", "")}`;
}

/** 菜单管理页 tab 栏（门户配置 / 子系统菜单） */
function _sysMenuTabs() {
  const cur = (window.__sysMenuTab || "portal") === "subs" ? "subs" : "portal";
  const tab = (k, label, hint) =>
    `<span class="sys-menu-tab${cur === k ? " on" : ""}" onclick="switchSysMenuTab('${k}')" title="${hint}">${label}</span>`;
  return `<div class="sys-menu-tabs">` +
    tab("portal", "🗂 门户配置", "门户卡片：上架 / 排序 / 主题 / 角色，可新增外部系统") +
    tab("subs", "🧭 子系统菜单", "各子系统内部的三级菜单树") +
    `</div>`;
}

/** 切换菜单管理页 tab 并刷新 */
function switchSysMenuTab(tab) {
  window.__sysMenuTab = tab === "subs" ? "subs" : "portal";
  if (typeof replaceView === "function") replaceView();
  else if (typeof window.renderCurView === "function") window.renderCurView();
}

/** 门户配置 tab：门户卡列表（排序 / 上下架 / 编辑 / 新增外部系统） */
function _renderPortalConfigTab(canEdit, canAdd) {
  const apps = typeof getPortalApps === "function" ? getPortalApps() : [];
  const internalCount = apps.filter((a) => a.kind !== "external").length;
  const tableHtml = apps.length
    ? table(TH.portalCfg, apps, (app, i) => {
        const isExt = app.kind === "external";
        const typeBadge = isExt
          ? `<span class="badge" style="background:#e6f7ff;color:#1890ff;border-color:#91d5ff">外部系统</span>`
          : `<span class="badge" style="background:#f6ffed;color:#52c41a;border-color:#b7eb8f">内部系统</span>`;
        const target = isExt
          ? `<span class="ms-url muted" title="${app.url || ""}" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle">${app.url || "-"}</span>`
          : `<code>${app.mod || "-"}</code>`;
        const enabled = app.enabled !== false;
        const statusCell = `<div style="display:flex;gap:6px;flex-wrap:wrap">` +
          (enabled
            ? `<span class="badge" style="background:#f6ffed;color:#52c41a;border-color:#b7eb8f">已上架</span>`
            : `<span class="badge" style="background:#fff1f0;color:#cf1322;border-color:#ffa39e">已下架</span>`) +
          (app.status === "maintenance"
            ? `<span class="badge" style="background:#fff7e6;color:#d46b08;border-color:#ffd591">维护中</span>`
            : `<span class="badge" style="background:#f6ffed;color:#52c41a;border-color:#b7eb8f">正常</span>`) +
          `</div>`;
        const rolesCell = app.roles && app.roles.length
          ? app.roles.map((rk) => `<span class="tag g">${_escape(ROLES[rk] ? ROLES[rk].name : rk)}</span>`).join(" ")
          : '<span class="muted">全部角色</span>';
        /* 主题圆点：提示文案区分「已单独指定」与「跟随板块默认」 */
        const ptTheme = !isExt && typeof getPortalTheme === "function" ? getPortalTheme(app) : null;
        const themeDot = ptTheme
          ? `<span class="pt-dot" style="background:${ptTheme.base}" title="主题配色：${ptTheme.name}${app.theme ? "" : "（跟随板块默认）"}"></span>`
          : "";
        const actions = [
          i > 0 && canEdit ? btn("↑", "ghost sm", `movePortalAppBtn('${app.key}', -1)`) : "",
          i < apps.length - 1 && canEdit ? btn("↓", "ghost sm", `movePortalAppBtn('${app.key}', 1)`) : "",
          canEdit ? btn(enabled ? "下架" : "上架", "ghost sm", `togglePortalApp('${app.key}')`) : "",
          canEdit ? btn("编辑", "ghost sm", `openEditPortalApp('${app.key}')`) : "",
        ].filter(Boolean).join(" ");
        return `
          <td><span class="menu-card-key"><code>#${app.order || "-"}</code></span></td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="menu-card-ic">${app.icon || "📦"}</span>
              ${themeDot}
              <div>
                <div style="font-weight:600;color:var(--title)">${_escape(app.name)}</div>
                <div><code>${app.key}</code></div>
              </div>
            </div>
          </td>
          <td>${typeBadge}<div style="margin-top:4px">${target}</div></td>
          <td>${statusCell}</td>
          <td>${rolesCell}</td>
          <td><span class="muted" style="display:inline-block;max-width:220px">${_escape(app.desc || "-")}</span></td>
          <td><span class="ms-actions">${actions}</span></td>`;
      }, "", 300)
    : '<div class="empty">暂无门户卡（种子为空）</div>';
  return `
  ${toolbar(
    `共 ${apps.length} 张门户卡 · 内部 ${internalCount} · 外部 ${apps.length - internalCount} · 下架后门户不再展示`,
    canAdd ? btn("+ 新增外部系统", "sm", "openAddPortalApp()") : "",
  )}
  ${zone(tableHtml, "🗂 门户卡片配置", "")}`;
}

/** 门户卡角色多选 HTML（编辑 / 新增弹窗共用；整齐两列网格 + 主题色复选框） */
function _portalRoleCbs(selected) {
  const sel = selected || [];
  return Object.entries(ROLES).map(([k, v]) =>
    `<label class="fav-manage-item"><input type="checkbox" class="portal-role-cb" value="${k}" ${sel.indexOf(k) >= 0 ? "checked" : ""}> ${_escape(v.name)}</label>`,
  ).join("");
}

/** 门户卡主题色板（仅内部卡；默认 + 8 预设 + 自定义）
 *  radio 隐藏于 label 内，选中态由 ptThemePick() 实时切换 .on；
 *  「自定义」格内置取色器（v5.8）：格里的色点本身就是 input[type=color]，点格子即进入
 *  自定义并就地唤起取色盘，标签实时显示色值（#RRGGBB），不再另起一行取色器；
 *  首次取色从当前生效色起步，同一弹窗内切到预设再点回来会恢复上次选的自定义色。
 *  打开弹窗按「当前生效主题」预选中（v5.7）：已存 theme 优先；未存 theme 时回落到
 *  getPortalTheme() 解析出的板块默认色，与门户卡上的主题圆点保持一致——旧版数据
 *  （卡片无 theme 字段）此前会落在灰色「默认」上，看起来像主题没选中。
 *  未改动色板就保存时不改写主题，保留「跟随板块默认」语义，不会被动钉成某个预设。 */
function _portalThemeCells(curKey, effective) {
  const themes = (typeof PORTAL_THEMES !== "undefined" && PORTAL_THEMES) || [];
  const stored = String(curKey == null ? "" : curKey).trim();
  const eff = effective || null;
  const isPreset = (v) => !!v && themes.some((t) => t.key === v);
  const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ""));
  /* 已存值：预设 key 或自定义 #hex；无法识别的脏值按「未设置」处理 */
  const storedPreset = isPreset(stored) ? stored : "";
  const storedCustom = !storedPreset && isHex(stored) ? stored.toLowerCase() : "";
  const hasStored = !!(storedPreset || storedCustom);
  /* 未设置：跟随板块默认色（可能是预设，也可能是旧版色值） */
  const inheritPreset = !hasStored && eff && isPreset(eff.key) ? eff.key : "";
  const inheritCustom = !hasStored && eff && !isPreset(eff.key) && isHex(eff.base) ? eff.base.toLowerCase() : "";
  const selKey = storedPreset || inheritPreset;
  const customHex = storedCustom || inheritCustom;
  /* 记住自定义色 / 当前生效色：切到预设再点回来可恢复，首次取色从当前生效色起步 */
  if (customHex) __paCustomHex = customHex;
  __paBaseHex = eff && isHex(eff.base) ? eff.base.toLowerCase() : "";
  const cell = (val, name, dotStyle, on, extraCls, dotId, tip) => `
    <label class="pt-cell${on ? " on" : ""}${extraCls ? " " + extraCls : ""}" title="${tip || name}">
      <input type="radio" name="paTheme" value="${val}"${on ? " checked" : ""} onchange="ptThemePick(this)">
      <span class="pt-dot"${dotId ? ` id="${dotId}"` : ""} style="${dotStyle}"></span>
      <span class="pt-name">${name}</span>
    </label>`;
  const defTip = "跟随板块默认色" + (eff && eff.name ? "（当前：" + eff.name + "）" : "");
  const defCell = cell("", "默认", "background:#c9cdd4", !selKey && !customHex, "", "", defTip);
  const presetCells = themes
    .map((t) => cell(t.key, t.name, `background:${t.base}`, t.key === selKey, "", "", ""))
    .join("");
  /* 自定义格：有色值时色点直接是取色器；没有色值时是彩虹色点，点格子后原生替换为取色器 */
  const customDotHtml = customHex
    ? `<input type="color" class="pt-dot pt-color" id="paThemeColor" value="${customHex}" oninput="ptThemeColor(this)" title="点此选择自定义主题色">`
    : `<span class="pt-dot" id="paCustomDot" style="background:conic-gradient(from 210deg,#f5222d,#fa8c16,#fadb14,#52c41a,#13c2c2,#1677ff,#722ed1,#f5222d)"></span>`;
  const customCell = `
    <div class="pt-cell pt-custom${customHex ? " on" : ""}" title="自定义主题色：点格子直接取色" onclick="ptThemePickCustom(event)">
      <input type="radio" name="paTheme" value="__custom__"${customHex ? " checked" : ""} onchange="ptThemePick(this)">
      ${customDotHtml}
      <span class="pt-name" id="paCustomName">${customHex || "自定义"}</span>
    </div>`;
  return `${defCell}${presetCells}${customCell}`;
}

/** 主题色板是否被用户手动改过（未改过则保存时不写 theme，保留“跟随板块默认”） */
let __paThemeTouched = false;
/** 上一次使用的自定义色（同一弹窗内切预设后保留，便于再次恢复） */
let __paCustomHex = "";
/** 当前生效色的 hex（首次进入自定义时的取色起点） */
let __paBaseHex = "";

/** 主题色板选中态实时同步（radio 视觉隐藏，靠 .on 反馈） */
function ptThemePick(input) {
  __paThemeTouched = true;
  const grid = input.closest ? input.closest(".pt-grid") : null;
  if (!grid) return;
  const cells = grid.querySelectorAll(".pt-cell");
  for (let i = 0; i < cells.length; i++) cells[i].classList.remove("on");
  const cell = input.closest ? input.closest(".pt-cell") : null;
  if (cell) cell.classList.add("on");
}

/** 把「自定义」格的彩虹色点就地换成原生取色器（不新增任何行外元素） */
function ptThemeEnsureColorInput() {
  const exist = document.getElementById("paThemeColor");
  if (exist && String(exist.tagName).toUpperCase() === "INPUT") return exist;
  const dot = document.getElementById("paCustomDot");
  if (!dot || !dot.parentNode) return exist || null;
  const el = document.createElement("input");
  el.type = "color";
  el.id = "paThemeColor";
  el.className = "pt-dot pt-color";
  el.value = __paCustomHex || __paBaseHex || "#7c5cff";
  el.title = "点此选择自定义主题色";
  el.setAttribute("oninput", "ptThemeColor(this)");
  dot.parentNode.replaceChild(el, dot);
  return el;
}

/** 点「自定义」格：进入自定义选中态并就地唤起取色盘（点色点本身不拦截，交给取色器） */
function ptThemePickCustom(ev) {
  const t = ev && ev.target;
  if (t && String(t.tagName).toUpperCase() === "INPUT" && String(t.type).toLowerCase() === "color") return;
  const radio = document.querySelector('input[name="paTheme"][value="__custom__"]');
  if (!radio) return;
  radio.checked = true;
  ptThemePick(radio);
  const el = ptThemeEnsureColorInput();
  if (el) {
    __paCustomHex = String(el.value || "").toLowerCase();
    const nameEl = document.getElementById("paCustomName");
    if (nameEl) nameEl.textContent = __paCustomHex;
    el.click();
  }
}

/** 取色器变色：标签显示色值 + 联动勾选「自定义」（色点即取色器本身，无需另刷） */
function ptThemeColor(input) {
  const v = String(input.value || "").toLowerCase();
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
  __paCustomHex = v;
  __paThemeTouched = true;
  const nameEl = document.getElementById("paCustomName");
  if (nameEl) nameEl.textContent = v;
  const radio = document.querySelector('input[name="paTheme"][value="__custom__"]');
  if (radio && !radio.checked) {
    radio.checked = true;
    ptThemePick(radio);
  }
}

/** 打开门户卡编辑弹窗（名称 / 图标 / 描述 / 状态 / 可见角色 / 外链地址 / 主题配色） */
function openEditPortalApp(appKey) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有编辑门户卡的权限"); return; }
  const app = typeof findPortalApp === "function" ? findPortalApp(appKey) : null;
  if (!app) { toast("门户卡不存在"); return; }
  const isExt = app.kind === "external";
  const selected = app.roles || [];
  const roleCbs = _portalRoleCbs(selected);
  /* 主题色板按「当前生效主题」预选中：已存 theme 优先，缺省回落板块默认（见 _portalThemeCells） */
  const effTheme = !isExt && typeof getPortalTheme === "function" ? getPortalTheme(app) : null;
  __paThemeTouched = false;
  __paCustomHex = "";
  const themeRow = (!isExt && typeof PORTAL_THEMES !== "undefined")
    ? formRow("主题配色", `<div class="pt-grid">${_portalThemeCells(app.theme || "", effTheme)}</div>`, false, "首页卡片与对应子系统窗口的主题色；点「自定义」格里的色点即可直接取色，选「默认」按板块默认色（当前卡片未单独指定时即跟随板块）")
    : "";
  const targetRow = isExt
    ? formRow("跳转链接", `<input id="paUrl" value="${(app.url || "").replace(/"/g, "&quot;")}" placeholder="https://example.com">`, true, "必须以 http:// 或 https:// 开头")
    : formRow("指向板块", `<code>${app.mod || "-"}</code>${MODULES[app.mod] ? "（" + MODULES[app.mod].name + "）" : ""}`, false, "内部子系统的菜单结构在「子系统菜单」tab 中维护");
  openModal(
    modalContent(
      `编辑门户卡 · ${_escape(app.name)}`,
      `${formRow("名称", `<input id="paName" value="${_escape(app.name)}" maxlength="20">`, true)}
       ${formRow("图标", `<input id="paIcon" value="${_escape(app.icon || "")}" maxlength="4">`, false, "一个 Emoji 字符")}
       ${formRow("描述", `<textarea id="paDesc" rows="2" maxlength="80">${_escape(app.desc || "")}</textarea>`, false, "展示在门户卡片描述行，最长 80 字")}
       ${formRow("运行状态", `<select id="paStatus"><option value="active"${app.status !== "maintenance" ? " selected" : ""}>正常</option><option value="maintenance"${app.status === "maintenance" ? " selected" : ""}>维护中</option></select>`, false)}
       ${targetRow}
       ${themeRow}
       ${formRow("可见角色", `<div class="fav-manage-items">${roleCbs}</div>`, false, "不勾选 = 全部角色可见；内部卡还受角色权限配置中的模块授权约束")}`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditPortalApp('${appKey}')`)}`,
    ),
    "600px",
  );
}

/** 提交门户卡编辑 */
function submitEditPortalApp(appKey) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有编辑门户卡的权限"); closeModal(); return; }
  const name = document.getElementById("paName").value.trim();
  if (!name) { toast("门户卡名称不能为空"); return; }
  const roles = Array.from(document.querySelectorAll(".portal-role-cb:checked")).map((cb) => cb.value);
  const patch = {
    name,
    icon: document.getElementById("paIcon").value.trim(),
    desc: document.getElementById("paDesc").value,
    status: document.getElementById("paStatus").value,
    roles,
  };
  const urlEl = document.getElementById("paUrl");
  if (urlEl) patch.url = urlEl.value.trim();
  /* 主题配色：仅在用户动过色板时写入——未改动则保留原值（含「跟随板块默认」的空值），
     避免只改名 / 改描述就顺手把主题钉成某个预设。写入时：「自定义」取格内取色器色值，
     「默认」= 清除 theme 回落板块默认 */
  if (__paThemeTouched) {
    const themeEl = document.querySelector('input[name="paTheme"]:checked');
    if (themeEl) {
      if (themeEl.value === "__custom__") {
        const colorEl = document.getElementById("paThemeColor");
        const hex = String((colorEl && colorEl.value) || __paCustomHex || "").toLowerCase();
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) { toast("请先在「自定义」格里选一个主题色"); return; }
        patch.theme = hex;
      } else {
        patch.theme = themeEl.value;
      }
    }
  }
  const ok = window.updatePortalApp(appKey, patch);
  if (!ok) { toast("保存失败：外链地址必须以 http:// 或 https:// 开头"); return; }
  closeModal();
  toast("已保存门户卡配置");
  replaceView();
}

/** 打开新增外部系统弹窗（原「只能维护种子」现支持直接新增外链卡） */
function openAddPortalApp() {
  if (!window.currentCanAction("sys", "sysMenu", "add")) { toast("您没有新增门户卡的权限"); return; }
  const roleCbs = _portalRoleCbs([]);
  openModal(
    modalContent(
      "新增外部系统",
      `${formRow("名称", `<input id="paName" maxlength="20" placeholder="如：项目管理系统">`, true)}
       ${formRow("图标", `<input id="paIcon" maxlength="4" placeholder="🔗">`, false, "一个 Emoji 字符，默认 🔗")}
       ${formRow("跳转链接", `<input id="paUrl" placeholder="https://example.com">`, true, "必须以 http:// 或 https:// 开头")}
       ${formRow("描述", `<textarea id="paDesc" rows="2" maxlength="80" placeholder="一句话说明该系统用途"></textarea>`, false, "展示在门户卡片描述行，最长 80 字")}
       ${formRow("运行状态", `<select id="paStatus"><option value="active" selected>正常</option><option value="maintenance">维护中</option></select>`, false)}
       ${formRow("可见角色", `<div class="fav-manage-items">${roleCbs}</div>`, false, "不勾选 = 全部角色可见")}`,
      `${btn("取消", "gray", "closeModal()")} ${btn("新增", "", "submitAddPortalApp()")}`,
    ),
    "600px",
  );
}

/** 提交新增外部系统 */
function submitAddPortalApp() {
  if (!window.currentCanAction("sys", "sysMenu", "add")) { toast("您没有新增门户卡的权限"); closeModal(); return; }
  const name = document.getElementById("paName").value.trim();
  if (!name) { toast("门户卡名称不能为空"); return; }
  const url = document.getElementById("paUrl").value.trim();
  if (!/^https?:\/\//i.test(url)) { toast("跳转链接必须以 http:// 或 https:// 开头"); return; }
  const roles = Array.from(document.querySelectorAll(".portal-role-cb:checked")).map((cb) => cb.value);
  const key = window.createPortalApp({
    name,
    icon: document.getElementById("paIcon").value.trim(),
    url,
    desc: document.getElementById("paDesc").value,
    status: document.getElementById("paStatus").value,
    roles,
  });
  if (!key) { toast("新增失败：请检查名称与链接"); return; }
  closeModal();
  toast("已新增外部系统，门户即时展示");
  replaceView();
}

/** 上架 / 下架门户卡 */
function togglePortalApp(appKey) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有修改门户配置的权限"); return; }
  const enabled = window.togglePortalAppEnabled(appKey);
  if (enabled === null) { toast("门户卡不存在"); return; }
  toast(enabled ? "已上架，门户将展示该卡片" : "已下架，门户不再展示该卡片");
  replaceView();
}

/** 上移 / 下移门户卡 */
function movePortalAppBtn(appKey, dir) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有修改门户配置的权限"); return; }
  if (!window.movePortalApp(appKey, dir)) return;
  replaceView();
}

/** 切换模块卡片展开/收起 */
function toggleMenuCard(mk) {
  const card = document.querySelector(`.menu-card[data-mk="${mk}"]`);
  if (!card) return;
  card.classList.toggle("collapsed");
}

/* ---------- 菜单模块 CRUD ---------- */

/** 渲染业务级 actions 多选 HTML（供菜单新增/编辑弹窗使用）
 *  @param {string} fieldName  checkbox 名称前缀
 *  @param {Array}  selected   已选中的 action key 数组
 *  @returns {string} */
/** 渲染业务权限 Action 多选框表单项
 *  @param {string} fieldName checkbox name 属性
 *  @param {string[]} selected 已选中的 action key 数组
 *  @param {object} [opts] 显示条件
 *  @param {boolean} [opts.isInternal] 菜单类型是否为内部菜单（外部系统不显示）
 *  @param {boolean} [opts.isLeaf] 是否为叶子节点（有子菜单的父级目录不显示）
 *  @returns {string} HTML 字符串，不满足条件时返回空串 */
function _renderActionsSelect(fieldName, selected, opts) {
  const actions = window.ALL_ACTIONS || [];
  if (actions.length === 0) return "";
  // 外部系统菜单不显示业务权限
  if (opts && opts.isInternal === false) return "";
  // 父级目录（有子菜单）不显示业务权限
  if (opts && opts.isLeaf === false) return "";
  const sel = {};
  (selected || []).forEach((a) => { sel[a] = true; });
  const boxes = actions
    .map((a) => `<label class="pc-action-item" style="display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0;white-space:nowrap">
      <input type="checkbox" name="${fieldName}" value="${a.key}" ${sel[a.key] ? "checked" : ""}>
      <span>${a.label}</span>
    </label>`)
    .join("");
  return formRow(
    "业务权限",
    `<div class="menu-actions-select" style="display:flex;flex-wrap:wrap;gap:4px 8px">${boxes}</div>`,
    false,
    "声明该菜单支持哪些业务级操作权限，留空表示不做业务级控制（仅页面可见性）",
  );
}

/** 从表单中收集选中的 action key 数组
 *  @param {string} fieldName checkbox name 属性
 *  @returns {string[]} */
function _collectActionsFromForm(fieldName) {
  const cbs = document.querySelectorAll(`input[name="${fieldName}"]:checked`);
  const out = [];
  cbs.forEach((cb) => out.push(cb.value));
  return out;
}

/** 新增模块弹窗 */
function openAddMenuModule() {
  if (!window.currentCanAction("sys", "sysMenu", "add")) { toast("您没有新增菜单的权限"); return; }
  openModal(
    modalContent(
      "新增模块",
      `${formRow("模块编码", `<input id="modNewKey" placeholder="字母开头，如 quality">`, true, "作为模块唯一标识，字母数字下划线，创建后不可修改")}
       ${formRow("模块名称", `<input id="modNewName" placeholder="如 质量管理">`, true)}
       ${formRow("图标", `<input id="modNewIcon" placeholder="如 📋" maxlength="4">`, false, "支持 emoji 或单字符")}
       ${formRow("排序", `<input id="modNewOrder" type="number" value="${Object.keys(MENUS).length + 1}" min="1">`, false, "数字越小越靠前")}
       ${formRow("菜单类型", `
          <div class="radio-group">
            <label>
              <input type="radio" name="modNewType" value="internal" checked onchange="toggleModNewUrl()">
              <span>内部菜单（系统内页面路由）</span>
            </label>
            <label>
              <input type="radio" name="modNewType" value="external" onchange="toggleModNewUrl()">
              <span>外部系统菜单（跳转链接）</span>
            </label>
          </div>`, true)}
       <div id="modNewUrlRow" style="display:none">
         ${formRow("跳转链接", `<input id="modNewUrl" placeholder="https://example.com" oninput="document.getElementById('modNewUrlRow').classList.toggle('has-value',!!this.value)">`, true, "以 http:// 或 https:// 开头")}
       </div>
       <div id="modNewActionsRow">${_renderActionsSelect("modNewActions", [], { isInternal: true, isLeaf: true })}</div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认新增", "", "submitAddMenuModule()")}`,
    ),
  );
}

/** 切换新增模块弹窗的 URL 输入框显示 */
function toggleModNewUrl() {
  const val = document.querySelector('input[name="modNewType"]:checked')?.value;
  const urlRow = document.getElementById("modNewUrlRow");
  if (urlRow) urlRow.style.display = val === "external" ? "" : "none";
  // 同步控制业务权限行：外部系统隐藏，内部菜单显示
  const actionsRow = document.getElementById("modNewActionsRow");
  if (actionsRow) actionsRow.style.display = val === "external" ? "none" : "";
}

/** 提交新增模块 */
function submitAddMenuModule() {
  if (!window.currentCanAction("sys", "sysMenu", "add")) { toast("您没有新增菜单的权限"); closeModal(); return; }
  const key = document.getElementById("modNewKey").value.trim();
  const name = document.getElementById("modNewName").value.trim();
  const icon = document.getElementById("modNewIcon").value.trim();
  const order = document.getElementById("modNewOrder").value;
  const type = document.querySelector('input[name="modNewType"]:checked')?.value || "internal";
  const url = document.getElementById("modNewUrl")?.value.trim() || "";
  const actions = _collectActionsFromForm("modNewActions");
  if (!key || !name) {
    window.toast("请填写模块编码和名称");
    return;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,20}$/.test(key)) {
    window.toast("模块编码需字母开头，字母数字下划线，2-21 位");
    return;
  }
  if (MENUS[key]) {
    window.toast(`模块编码「${key}」已存在`);
    return;
  }
  if (type === "external" && !/^https?:\/\//i.test(url)) {
    window.toast("外部系统菜单必须填写有效的跳转链接（http:// 或 https:// 开头）");
    return;
  }
  const ok = window.addMenuModule(key, name, icon, type, url, actions);
  if (!ok) {
    window.toast("新增失败");
    return;
  }
  if (order) window.updateMenuModule(key, { order: Number(order) });
  closeModal();
  window.toast(`已新增模块「${name}」`);
  document.dispatchEvent(new CustomEvent('permschange'));
  replaceView();
}

/** 编辑模块弹窗 */
function openEditMenuModule(key) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有编辑菜单的权限"); return; }
  const m = MENUS[key];
  if (!m) return;
  openModal(
    modalContent(
      `编辑模块 · ${m.name}`,
      `${formRow("模块编码", `<code style="font-size:13px;color:var(--title)">${key}</code>`, false, "模块编码创建后不可修改")}
       ${formRow("模块名称", `<input id="modEditName" value="${m.name}">`, true)}
       ${formRow("图标", `<input id="modEditIcon" value="${m.icon || ''}" maxlength="4">`, false)}
       ${formRow("排序", `<input id="modEditOrder" type="number" value="${m.order || ''}" min="1">`, false)}
       ${formRow("菜单类型", `
          <div class="radio-group">
            <label>
              <input type="radio" name="modEditType" value="internal" ${m.type !== "external" ? "checked" : ""} onchange="toggleModEditUrl()">
              <span>内部菜单</span>
            </label>
            <label>
              <input type="radio" name="modEditType" value="external" ${m.type === "external" ? "checked" : ""} onchange="toggleModEditUrl()">
              <span>外部系统菜单</span>
            </label>
          </div>`, true)}
       <div id="modEditUrlRow" style="display:${m.type === "external" ? "" : "none"}">
         ${formRow("跳转链接", `<input id="modEditUrl" value="${(m.url || '').replace(/"/g, '&quot;')}" placeholder="https://example.com">`, m.type === "external", "必须以 http:// 或 https:// 开头")}
       </div>
       <div id="modEditActionsRow">${_renderActionsSelect("modEditActions", m.actions || [], { isInternal: m.type !== "external", isLeaf: !(m.subs && m.subs.length > 0) })}</div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditMenuModule('${key}')`)}`,
    ),
  );
}

/** 切换编辑模块弹窗的 URL 输入框显示 */
function toggleModEditUrl() {
  const val = document.querySelector('input[name="modEditType"]:checked')?.value;
  const urlRow = document.getElementById("modEditUrlRow");
  if (urlRow) urlRow.style.display = val === "external" ? "" : "none";
  // 同步控制业务权限行：外部系统隐藏，内部菜单显示
  const actionsRow = document.getElementById("modEditActionsRow");
  if (actionsRow) actionsRow.style.display = val === "external" ? "none" : "";
}

/** 提交编辑模块 */
function submitEditMenuModule(key) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有编辑菜单的权限"); closeModal(); return; }
  const m = MENUS[key];
  if (!m) return;
  const name = document.getElementById("modEditName").value.trim();
  const icon = document.getElementById("modEditIcon").value.trim();
  const order = document.getElementById("modEditOrder").value;
  const type = document.querySelector('input[name="modEditType"]:checked')?.value || "internal";
  const url = document.getElementById("modEditUrl")?.value.trim() || "";
  const actions = _collectActionsFromForm("modEditActions");
  if (!name) {
    window.toast("模块名称不能为空");
    return;
  }
  if (type === "external" && !/^https?:\/\//i.test(url)) {
    window.toast("外部系统菜单必须填写有效的跳转链接（http:// 或 https:// 开头）");
    return;
  }
  const ok = window.updateMenuModule(key, {
    name, icon,
    order: order ? Number(order) : undefined,
    type, url,
    actions,
  });
  if (!ok) {
    window.toast("保存失败，请检查跳转链接格式");
    return;
  }
  closeModal();
  window.toast("已保存");
  document.dispatchEvent(new CustomEvent('permschange'));
  replaceView();
}

/** 删除模块确认 */
function delMenuModule(key) {
  if (!window.currentCanAction("sys", "sysMenu", "delete")) { toast("您没有删除菜单的权限"); return; }
  const m = MENUS[key];
  if (!m) return;
  openModal(
    modalContent(
      "确认删除模块",
      `<div class="warn-box">确定要删除模块「${m.name}」（${key}）吗？<br>该模块下所有子菜单及其权限配置将被一并移除。</div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDelMenuModule('${key}')`)}`,
    ),
  );
}

/** 执行删除模块 */
function doDelMenuModule(key) {
  if (!window.currentCanAction("sys", "sysMenu", "delete")) { toast("您没有删除菜单的权限"); closeModal(); return; }
  const ok = window.deleteMenuModule(key);
  if (!ok) {
    window.toast("删除失败（内置模块不可删）");
    return;
  }
  closeModal();
  window.toast("已删除模块");
  document.dispatchEvent(new CustomEvent('permschange'));
  // 如果删除的是当前模块，降级到工作台
  if (window.curModule === key) {
    window.goHome();
  } else {
    replaceView();
  }
}

/* ---------- 菜单子项 CRUD（通用版，支持任意层级） ---------- */

/** 根据 path 数组递归定位父节点和 subs 数组
 *  @param {string[]} path 从模块 key 开始，不含目标 key 的路径
 *  @returns {{ parentNode: object, subs: array }} | null */
function _resolveMenuNodeByPath(path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  let cur = MENUS[path[0]];
  if (!cur) return null;
  for (let i = 1; i < path.length; i++) {
    cur = (cur.subs || []).find((s) => s.key === path[i]);
    if (!cur) return null;
  }
  if (!Array.isArray(cur.subs)) cur.subs = [];
  return { parentNode: cur, subs: cur.subs };
}

/** 把 path 数组格式化成面包屑显示文本 */
function _formatPathLabel(path) {
  if (!Array.isArray(path) || path.length === 0) return "";
  return path.map((k) => {
    const hit = findMenuByKey(k);
    return hit ? hit.node.name : k;
  }).join(" / ");
}

/** 切换菜单表单中 URL 输入框的显示（通用，radio 名称前缀区分弹窗） */
function toggleMenuFormUrl(radioName) {
  const val = document.querySelector('input[name="' + radioName + '"]:checked')?.value;
  const urlRow = document.getElementById(radioName + "UrlRow");
  if (urlRow) urlRow.style.display = val === "external" ? "" : "none";
  // 同时控制业务权限行显隐：内部菜单显示，外部系统隐藏
  const actionsRow = document.getElementById(radioName + "ActionsRow");
  if (actionsRow) actionsRow.style.display = val === "external" ? "none" : "";
}

/** 通用新增菜单弹窗 */
function openAddMenuAt(path) {
  if (!window.currentCanAction("sys", "sysMenu", "add")) { toast("您没有新增菜单的权限"); return; }
  const resolved = _resolveMenuNodeByPath(path);
  if (!resolved) return;
  const parentNode = resolved.parentNode;
  const pathLabel = _formatPathLabel(path);
  const levelLabel = path.length === 1 ? "子菜单" : "菜单项";
  const radioName = "menuFormNewType";
  const orderVal = (resolved.subs || []).length + 1;
  openModal(
    modalContent(
      `新增${levelLabel} · ${pathLabel}`,
      `${formRow("父级路径", `<span>${parentNode.icon || "📦"} ${parentNode.name}</span>`, false)}
       ${formRow("菜单编码", `<input id="menuFormNewKey" placeholder="字母/数字/下划线，如 new-item">`, true, "唯一标识，创建后不可修改")}
       ${formRow("菜单名称", `<input id="menuFormNewName" placeholder="如 新功能">`, true)}
       ${formRow("图标", `<input id="menuFormNewIcon" placeholder="如 🛠️" maxlength="4">`, false)}
       ${formRow("排序", `<input id="menuFormNewOrder" type="number" value="${orderVal}" min="1">`, false)}
       ${formRow("菜单类型", `
          <div class="radio-group">
            <label><input type="radio" name="${radioName}" value="internal" checked onchange="toggleMenuFormUrl('${radioName}')"><span>内部菜单</span></label>
            <label><input type="radio" name="${radioName}" value="external" onchange="toggleMenuFormUrl('${radioName}')"><span>外部系统</span></label>
          </div>`, true)}
       <div id="${radioName}UrlRow" style="display:none">
         ${formRow("跳转链接", `<input id="menuFormNewUrl" placeholder="https://example.com">`, true, "必须以 http:// 或 https:// 开头")}
       </div>
       <div id="${radioName}ActionsRow">${_renderActionsSelect("menuFormNewActions", [], { isInternal: true, isLeaf: true })}</div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认新增", "", `submitAddMenuAt(${JSON.stringify(path).replace(/"/g, "'")})`)}`,
    ),
  );
}

/** 通用提交新增菜单 */
function submitAddMenuAt(path) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("sys", "sysMenu", "add")) {
    window.toast("您没有新增菜单的权限");
    closeModal();
    return;
  }
  const key = document.getElementById("menuFormNewKey").value.trim();
  const name = document.getElementById("menuFormNewName").value.trim();
  const icon = document.getElementById("menuFormNewIcon").value.trim();
  const order = document.getElementById("menuFormNewOrder").value;
  const type = document.querySelector('input[name="menuFormNewType"]:checked')?.value || "internal";
  const url = document.getElementById("menuFormNewUrl")?.value.trim() || "";
  const actions = _collectActionsFromForm("menuFormNewActions");
  if (!key || !name) { window.toast("请填写菜单编码和名称"); return; }
  if (!/^[a-zA-Z0-9_-]{1,30}$/.test(key)) { window.toast("编码仅允许字母、数字、下划线和短横线"); return; }
  if (type === "external" && !/^https?:\/\//i.test(url)) { window.toast("外部系统菜单必须填写有效的跳转链接"); return; }
  const ok = window.addMenu(path, key, name, icon, type, url, actions);
  if (!ok) { window.toast("新增失败（编码已存在或父级不存在）"); return; }
  if (order) window.updateMenu(path, key, { order: Number(order) });
  closeModal();
  window.toast(`已新增菜单「${name}」`);
  document.dispatchEvent(new CustomEvent('permschange'));
  replaceView();
}

/** 通用编辑菜单弹窗 */
function openEditMenuAt(path, key) {
  if (!window.currentCanAction("sys", "sysMenu", "edit")) { toast("您没有编辑菜单的权限"); return; }
  const resolved = _resolveMenuNodeByPath(path);
  if (!resolved) return;
  const node = resolved.subs.find((s) => s.key === key);
  if (!node) return;
  const pathLabel = _formatPathLabel(path);
  const radioName = "menuFormEditType";
  openModal(
    modalContent(
      `编辑菜单 · ${node.name}`,
      `${formRow("菜单编码", `<code style="font-size:13px;color:var(--title)">${key}</code>`, false, "编码创建后不可修改")}
       ${formRow("菜单名称", `<input id="menuFormEditName" value="${node.name}">`, true)}
       ${formRow("图标", `<input id="menuFormEditIcon" value="${node.icon || ''}" maxlength="4">`, false)}
       ${formRow("排序", `<input id="menuFormEditOrder" type="number" value="${node.order || ''}" min="1">`, false)}
       ${formRow("菜单类型", `
          <div class="radio-group">
            <label><input type="radio" name="${radioName}" value="internal" ${node.type !== "external" ? "checked" : ""} onchange="toggleMenuFormUrl('${radioName}')"><span>内部菜单</span></label>
            <label><input type="radio" name="${radioName}" value="external" ${node.type === "external" ? "checked" : ""} onchange="toggleMenuFormUrl('${radioName}')"><span>外部系统</span></label>
          </div>`, true)}
       <div id="${radioName}UrlRow" style="display:${node.type === "external" ? "" : "none"}">
         ${formRow("跳转链接", `<input id="menuFormEditUrl" value="${(node.url || '').replace(/"/g, '&quot;')}" placeholder="https://example.com">`, node.type === "external", "必须以 http:// 或 https:// 开头")}
       </div>
       <div id="${radioName}ActionsRow">${_renderActionsSelect("menuFormEditActions", node.actions || [], { isInternal: node.type !== "external", isLeaf: !(node.subs && node.subs.length > 0) })}</div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditMenuAt(${JSON.stringify(path).replace(/"/g, "'")}, '${key}')`)}`,
    ),
  );
}

/** 通用提交编辑菜单 */
function submitEditMenuAt(path, key) {
  // 业务级权限守卫
  if (window.currentCanAction && !window.currentCanAction("sys", "sysMenu", "edit")) {
    window.toast("您没有编辑菜单的权限");
    closeModal();
    return;
  }
  const name = document.getElementById("menuFormEditName").value.trim();
  const icon = document.getElementById("menuFormEditIcon").value.trim();
  const order = document.getElementById("menuFormEditOrder").value;
  const type = document.querySelector('input[name="menuFormEditType"]:checked')?.value || "internal";
  const url = document.getElementById("menuFormEditUrl")?.value.trim() || "";
  const actions = _collectActionsFromForm("menuFormEditActions");
  if (!name) { window.toast("名称不能为空"); return; }
  if (type === "external" && !/^https?:\/\//i.test(url)) { window.toast("外部系统菜单必须填写有效的跳转链接"); return; }
  const ok = window.updateMenu(path, key, { name, icon, order: order ? Number(order) : undefined, type, url, actions });
  if (!ok) { window.toast("保存失败"); return; }
  closeModal();
  window.toast("已保存");
  replaceView();
}

/** 通用删除菜单确认 */
function delMenuAt(path, key) {
  if (!window.currentCanAction("sys", "sysMenu", "delete")) { toast("您没有删除菜单的权限"); return; }
  const resolved = _resolveMenuNodeByPath(path);
  if (!resolved) return;
  const node = resolved.subs.find((s) => s.key === key);
  if (!node) return;
  openModal(
    modalContent(
      "确认删除菜单",
      `<div class="warn-box">确定要删除菜单「${node.name}」（${key}）吗？<br>该菜单的权限配置将被一并移除。</div>`,
      `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDelMenuAt(${JSON.stringify(path).replace(/"/g, "'")}, '${key}')`)}`,
    ),
  );
}

/** 通用执行删除菜单 */
function doDelMenuAt(path, key) {
  if (!window.currentCanAction("sys", "sysMenu", "delete")) { toast("您没有删除菜单的权限"); closeModal(); return; }
  const ok = window.deleteMenu(path, key);
  if (!ok) { window.toast("删除失败"); return; }
  closeModal();
  window.toast("已删除菜单");
  document.dispatchEvent(new CustomEvent('permschange'));
  replaceView();
}

/* ---------- 系统：通知公告管理 ---------- */
function renderSysNotice() {
  const canAdd = window.currentCanAction('sys', 'sysNotice', 'add');
  const canEdit = window.currentCanAction('sys', 'sysNotice', 'edit');
  const canDel = window.currentCanAction('sys', 'sysNotice', 'delete');
  const notices = (window.NOTICES || []).slice().sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || b.createdAt - a.createdAt);
  const rows = notices.map((n) => {
    const typeName = (window.NOTICE_TYPES || {})[n.type] || n.type;
    return `<tr>
      <td style="max-width:340px"><b>${_escape(n.title)}</b>${n.top ? ' <span class="tag warn">置顶</span>' : ''}</td>
      <td>${tag(typeName, 'g')}</td>
      <td>${_escape(n.publisher || '-')}</td>
      <td>${_fmtDate(n.createdAt)}</td>
      <td>${n.top ? '是' : '否'}</td>
      <td>${tag(n.status === 'published' ? NOTICE.statusPublished : NOTICE.statusDraft, n.status === 'published' ? 'ok' : 'muted')}</td>
      <td style="white-space:nowrap">
        ${canEdit ? btn('编辑', 'ghost sm', `openEditNotice('${n.id}')`) : ''}
        ${canEdit ? btn(n.status === 'published' ? NOTICE.revoke : NOTICE.publish, 'sm', `toggleNoticeStatus('${n.id}')`) : ''}
        ${canDel ? btn('删除', 'danger sm', `confirmDelNotice('${n.id}')`) : ''}
      </td>
    </tr>`;
  }).join('');
  return `
  ${pageHeader(PAGES.sysNotice.title, PAGES.sysNotice.desc)}
  ${toolbar(
    (canAdd ? btn(BTN.newNotice, 'blue sm', 'openAddNotice()') : ''),
    '',
  )}
  ${zone(
    `<table class="tb">
      <thead><tr>
        ${TH.sysNotice.map((h) => `<th>${h}</th>`).join('')}
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">暂无公告，点击「+ 新增公告」创建</td></tr>'}</tbody>
    </table>`,
    '',
  )}`;
}

/** 新增公告弹窗 */
function openAddNotice() {
  const body = `
    ${formRow(NOTICE.labelTitle, `<input id="ntcTitle" placeholder="${NOTICE.titlePlaceholder}">`, true)}
    ${formRow(NOTICE.labelType, select(Object.keys(NOTICE_TYPES).map((k) => NOTICE_TYPES[k]), '通知'))}
    ${formRow(NOTICE.labelContent, `<textarea id="ntcContent" rows="6" placeholder="${NOTICE.contentPlaceholder}"></textarea>`, true)}
    ${formRow(NOTICE.labelTop, `<label class="chk-inline"><input type="checkbox" id="ntcTop"><span class="chk-tip">${NOTICE.topTip}</span></label>`)}
    ${formRow(NOTICE.labelStatus, select([NOTICE.statusPublished, NOTICE.statusDraft], NOTICE.statusPublished))}`;
  openModal(
    modalContent(NOTICE.addTitle, body, `${btn(BTN.cancel, 'gray', 'closeModal()')} ${btn(BTN.submit, '', 'submitNoticeForm()')}`),
    '600px',
  );
}

/** 编辑公告弹窗 */
function openEditNotice(id) {
  const n = window.findNotice(id);
  if (!n) return;
  const body = `
    ${formRow(NOTICE.labelTitle, `<input id="ntcTitle" value="${_escape(n.title)}" placeholder="${NOTICE.titlePlaceholder}">`, true)}
    ${formRow(NOTICE.labelType, select(Object.keys(NOTICE_TYPES).map((k) => NOTICE_TYPES[k]), (window.NOTICE_TYPES || {})[n.type] || '通知'))}
    ${formRow(NOTICE.labelContent, `<textarea id="ntcContent" rows="6" placeholder="${NOTICE.contentPlaceholder}">${_escape(n.content)}</textarea>`, true)}
    ${formRow(NOTICE.labelTop, `<label class="chk-inline"><input type="checkbox" id="ntcTop" ${n.top ? 'checked' : ''}><span class="chk-tip">${NOTICE.topTip}</span></label>`)}
    ${formRow(NOTICE.labelStatus, select([NOTICE.statusPublished, NOTICE.statusDraft], n.status === 'published' ? NOTICE.statusPublished : NOTICE.statusDraft))}`;
  openModal(
    modalContent(NOTICE.editTitle, body, `${btn(BTN.cancel, 'gray', 'closeModal()')} ${btn(BTN.submit, '', `submitNoticeForm('${n.id}')`)}`),
    '600px',
  );
}

/** 提交新增 / 编辑公告 */
function submitNoticeForm(id) {
  const title = (document.getElementById('ntcTitle').value || '').trim();
  const content = (document.getElementById('ntcContent').value || '').trim();
  if (!title) { window.toast('请填写公告标题'); return; }
  if (!content) { window.toast('请填写公告正文'); return; }
  const typeSel = document.querySelector('#modal select');
  const typeVal = typeSel ? typeSel.value : '通知';
  const typeKey = Object.keys(NOTICE_TYPES).find((k) => NOTICE_TYPES[k] === typeVal) || 'notice';
  const statusSel = document.querySelectorAll('#modal select')[1];
  const status = statusSel && statusSel.value === NOTICE.statusDraft ? 'draft' : 'published';
  const data = { title: title, content: content, type: typeKey, top: document.getElementById('ntcTop').checked, status: status };
  if (id) {
    window.updateNotice(id, data);
  } else {
    window.addNotice(data);
  }
  closeModal();
  window.toast(NOTICE.saved);
  replaceView();
}

/** 发布 / 撤回切换 */
function toggleNoticeStatus(id) {
  const n = window.findNotice(id);
  if (!n) return;
  window.updateNotice(id, { status: n.status === 'published' ? 'draft' : 'published' });
  window.toast(n.status === 'published' ? '公告已撤回' : '公告已发布');
  replaceView();
}

/** 删除公告二次确认 */
function confirmDelNotice(id) {
  const n = window.findNotice(id);
  if (!n) return;
  openModal(
    modalContent(
      '确认删除公告',
      `<div class="warn-box">${NOTICE.delConfirm.replace('{name}', _escape(n.title))}</div>`,
      `${btn(BTN.cancel, 'gray', 'closeModal()')} ${btn('确认删除', 'danger', `doDelNotice('${n.id}')`)}`,
    ),
  );
}

function doDelNotice(id) {
  window.delNotice(id);
  closeModal();
  window.toast(NOTICE.deleted);
  replaceView();
}

/* ---------- 系统管理 VIEWS 填充 ---------- */
VIEWS.sysAcct = renderSysAcct;
VIEWS.sysDept = renderSysDept;
VIEWS.sysRole = renderSysRole;
VIEWS.sysMenu = renderSysMenu;
VIEWS.sysLog = renderSysLog;
VIEWS.sysDict = renderSysDict;
VIEWS.sysNotice = renderSysNotice;

/* ---------- 系统管理 window 挂载 ---------- */
window.openAddAcct = openAddAcct;
window.submitAddAcct = submitAddAcct;
window.openEditAcct = openEditAcct;
window.submitEditAcct = submitEditAcct;
window.toggleAcct = toggleAcct;
window.resetPwd = resetPwd;
window.delAcct = delAcct;
window.doDelAcct = doDelAcct;
/* 部门管理 */
window.openAddDept = openAddDept;
window.openAddChildDept = openAddChildDept;
window.submitAddDept = submitAddDept;
window.openEditDept = openEditDept;
window.submitEditDept = submitEditDept;
window.confirmDelDept = confirmDelDept;
window.doDelDept = doDelDept;
/* 角色管理 */
window.openPermConfigFor = openPermConfigFor;
window.openAddRole = openAddRole;
window.submitAddRole = submitAddRole;
window.openEditRole = openEditRole;
window.submitEditRole = submitEditRole;
window.delRole = delRole;
window.doDelRole = doDelRole;
/* 菜单管理 */
window.toggleMenuCard = toggleMenuCard;
window.openAddMenuModule = openAddMenuModule;
window.toggleModNewUrl = toggleModNewUrl;
window.toggleModEditUrl = toggleModEditUrl;
window.submitAddMenuModule = submitAddMenuModule;
window.openEditMenuModule = openEditMenuModule;
window.submitEditMenuModule = submitEditMenuModule;
window.delMenuModule = delMenuModule;
window.doDelMenuModule = doDelMenuModule;
window.openAddMenuAt = openAddMenuAt;
window.toggleMenuFormUrl = toggleMenuFormUrl;
window.submitAddMenuAt = submitAddMenuAt;
window.openEditMenuAt = openEditMenuAt;
window.submitEditMenuAt = submitEditMenuAt;
window.delMenuAt = delMenuAt;
window.doDelMenuAt = doDelMenuAt;

window.openSysDictAddGroup = openSysDictAddGroup;
window.doSysDictAddGroup = doSysDictAddGroup;
window.openSysDictEditGroup = openSysDictEditGroup;
window.doSysDictEditGroup = doSysDictEditGroup;
window.openSysDictDelGroup = openSysDictDelGroup;
window.doSysDictDelGroup = doSysDictDelGroup;
window.openSysDictView = openSysDictView;
window.doSysDictAddItem = doSysDictAddItem;
window.openSysDictEditItem = openSysDictEditItem;
window.doSysDictEditItem = doSysDictEditItem;
window.doSysDictDelItem = doSysDictDelItem;
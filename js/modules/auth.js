/* ========== 角色与权限系统（权限内嵌到 ROLES[key].perms） ========== */


/* ---------- 运行时状态 ---------- */
let CUR_ROLE = "staff";

/* 当前正在配置的角色 key（权限配置弹窗内部状态） */
let _permConfigRole = null;

/* ---------- 会话管理 ---------- */

/** 同步当前账号信息到全局 CURR_ACCT_* 变量（供业务模块使用） */
function _syncCurrAcct(uid) {
  const acct = window.findAccount ? window.findAccount(uid) : null;
  if (acct) {
    window.CURR_ACCT_ID = acct.id || uid || "";
    window.CURR_ACCT_EMP_ID = acct.id || uid || "";
    window.CURR_ACCT_NAME = acct.n || acct.name || "";
    window.CURR_ACCT_ROLE_KEY = acct.key || CUR_ROLE || "";
  } else {
    window.CURR_ACCT_ID = uid || "";
    window.CURR_ACCT_EMP_ID = uid || "";
    window.CURR_ACCT_NAME = "";
    window.CURR_ACCT_ROLE_KEY = CUR_ROLE || "";
  }
}

/** 从 sessionStorage 恢复登录会话；成功返回 true，否则 false */
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session && session.role && ROLES[session.role]) {
        CUR_ROLE = session.role;
        _syncCurrAcct(session.uid);
        applyRoleUI();
        // 恢复登录页表单中的账号值
        if (session.uid) {
          const uEl = document.getElementById("lgUser");
          if (uEl) uEl.value = session.uid;
        }
        return true;
      }
    }
  } catch (e) {
    // 忽略解析错误
  }
  return false;
}

/** 外部直接设置 CUR_ROLE（用于测试或特殊场景） */
function initRole(role) {
  if (ROLES[role]) {
    CUR_ROLE = role;
    applyRoleUI();
  }
}

/* ---------- 角色检查（从 ROLES[CUR_ROLE].perms 直接读取） ---------- */

/** 递归检查某层 perms.subs 路径是否授权
 *  @param {Object} subsObj   当前层 subs 字典（如 { key: entry, ... }）
 *  @param {Array}  pathKeys  剩余要匹配的 key 数组（非空）
 *  @param {number} idx       当前要匹配的 index */
function _checkPermsSubs(subsObj, pathKeys, idx) {
  if (!subsObj || typeof subsObj !== "object") return false;
  if (idx >= pathKeys.length) {
    return Object.keys(subsObj).length > 0;
  }
  const next = subsObj[pathKeys[idx]];
  if (next === undefined) return false;
  if (idx === pathKeys.length - 1) {
    // 到达路径末端：next 是目标节点
    if (next === true) return true;
    if (typeof next !== "object") return false;
    // 叶子节点带 actions → 视为授权
    if (Array.isArray(next.actions) && next.actions.length > 0) return true;
    // 父级节点带 subs → 子级有任何授权即视为有权
    if (next.subs && Object.keys(next.subs).length > 0) return true;
    return false;
  }
  // 还有更深层 → next 必须有 subs 才能继续
  if (!next || typeof next !== "object" || !next.subs) return false;
  return _checkPermsSubs(next.subs, pathKeys, idx + 1);
}

/** 根据内嵌 perms 判断当前角色是否有权访问（递归版，支持任意深度路径）
 *  sysAdmin 特判直接返回 true
 *  调用示例：
 *    hasRole('dev')                       → 模块级 enabled
 *    hasRole('dev', 'std')                → 二级菜单
 *    hasRole('dev', 'std', 'stdQuick')    → 三级菜单
 *    hasRole('a', 'b', 'c', 'd')          → 四级，未来零成本 */
function hasRole(moduleKey, ...restKeys) {
  if (CUR_ROLE === "sysAdmin") return true;
  const perms = ROLES[CUR_ROLE] && ROLES[CUR_ROLE].perms;
  if (!perms) return false;
  const mod = perms[moduleKey];
  if (!mod) return false;
  if (!restKeys || restKeys.length === 0) return mod.enabled === true;
  const path = restKeys.filter((k) => !!k);
  if (path.length === 0) return mod.enabled === true;
  // 统一从 mod.subs 开始递归，让 _checkPermsSubs 接管路径匹配
  if (!mod.subs) return false;
  return _checkPermsSubs(mod.subs, path, 0);
}

/** 递归遍历某层 perms.subs，检查是否存在任意授权项
 *  识别三种有效授权形态：true、带 actions 的叶子、带 subs 的父级 */
function _hasAnyPerm(entry) {
  if (entry === true) return true;
  if (!entry || typeof entry !== "object") return false;
  // 叶子节点带 actions → 视为授权
  if (Array.isArray(entry.actions) && entry.actions.length > 0) return true;
  // 父级节点带 subs → 递归检查子项
  if (entry.subs) {
    for (const k in entry.subs) {
      if (_hasAnyPerm(entry.subs[k])) return true;
    }
  }
  return false;
}

/** 判断当前角色是否能看到某模块（递归版，支持任意深度）
 *  模块 enabled=true，或 subs 下任意层级存在授权项 */
function canAccessModule(moduleKey) {
  if (hasRole(moduleKey)) return true;
  const perms = ROLES[CUR_ROLE] && ROLES[CUR_ROLE].perms;
  if (!perms) return false;
  const mod = perms[moduleKey];
  if (!mod) return false;
  // 模块 enabled=true 本身即视为可访问（无子菜单的叶子模块场景）
  if (mod.enabled === true) return true;
  if (!mod.subs) return false;
  for (const sk in mod.subs) {
    if (_hasAnyPerm(mod.subs[sk])) return true;
  }
  return false;
}

/** 从 MENUS 运行时递归查找指定路径的节点（支持任意深度 subs）
 *  @param {string} moduleKey 模块 key
 *  @param  {...string} restKeys 路径后续 key
 *  @returns {Object|null} 找到的菜单节点或 null */
function findMenuNode(moduleKey, ...restKeys) {
  const mod = MENUS[moduleKey];
  if (!mod) return null;
  const path = restKeys.filter((k) => !!k);
  if (path.length === 0) return mod;
  let cur = mod;
  for (const key of path) {
    cur = (cur.subs || []).find((s) => s.key === key);
    if (!cur) return null;
  }
  return cur;
}

/** 检查指定角色对某菜单路径是否拥有某个业务 action 权限
 *  @param {string} roleKey   角色 key（不传时取 CUR_ROLE）
 *  @param {string} moduleKey 模块 key
 *  @param  {...string} args  末尾是 action key，前面是 subs 路径 keys
 *  @returns {boolean} */
function canAction(roleKey, moduleKey, ...args) {
  // 兼容调用方省略 roleKey 的情况：canAction(moduleKey, ...pathKeys, action)
  let rk = roleKey;
  let rest = [moduleKey, ...args];
  if (!ROLES[roleKey] && roleKey !== "sysAdmin") {
    rk = CUR_ROLE;
    rest = [moduleKey, ...args];
  }
  if (rk === "sysAdmin") return true;
  const perms = ROLES[rk] && ROLES[rk].perms;
  if (!perms) return false;
  const action = rest.pop();
  const path = rest.filter((k) => !!k);
  const mod = perms[path[0]];
  if (!mod) return false;
  if (!mod.enabled && path.length === 1) return false;
  let entry;
  if (path.length === 1) {
    entry = mod;
  } else {
    // 使用 subs 字典逐层导航，每找到一个 entry 后，取 .subs 继续下一层
    let cur = mod.subs;
    let ok = true;
    for (let i = 1; i < path.length; i++) {
      if (!cur || cur[path[i]] === undefined) { ok = false; break; }
      cur = cur[path[i]];
      // 还有下一层要走 → cur 必须是带 subs 的父级节点
      if (i < path.length - 1) {
        if (!cur || typeof cur !== "object" || !cur.subs) { ok = false; break; }
        cur = cur.subs;
      }
    }
    if (!ok) return false;
    entry = cur;
  }
  if (entry === true) return true;
  if (!entry || typeof entry !== "object") return false;
  if (entry.actions === undefined) return true;
  return Array.isArray(entry.actions) && entry.actions.includes(action);
}

/** 便捷函数：当前登录角色是否拥有某 action */
function currentCanAction(moduleKey, ...pathAndAction) {
  return canAction(CUR_ROLE, moduleKey, ...pathAndAction);
}

/* ---------- 登录/登出 ---------- */

function doLogin() {
  const uid = document.getElementById("lgUser").value.trim();
  const pwd = document.getElementById("lgPwd").value;
  const tip = document.getElementById("loginTip");
  // 空值拦截：账号或密码未填写时不予登录
  if (!uid || !pwd) {
    tip.innerText = LOGIN.emptyTip;
    tip.style.display = "block";
    return;
  }
  // 从持久化账号列表查找
  const acct = window.findAccount(uid);
  if (!acct) {
    tip.innerText = `账号「${uid}」不存在`;
    tip.style.display = "block";
    return;
  }
  // 校验账号状态
  if (acct.st === "停用") {
    tip.innerText = `账号「${uid}」已停用，请联系系统管理员`;
    tip.style.display = "block";
    return;
  }
  // 校验密码（系统内置 admin 默认 admin123，其他默认 123456）
  if (pwd !== acct.pwd) {
    tip.innerText = "密码错误";
    tip.style.display = "block";
    return;
  }
  // 角色由账号档案中的 key 字段决定
  CUR_ROLE = acct.key;
  // 检查：当前角色是否至少有一个可访问模块，全无则拦截登录（让管理员给角色配置权限）
  const firstKey = window.getFirstAccessibleModule ? window.getFirstAccessibleModule() : null;
  if (!firstKey) {
    tip.innerText = `角色「${ROLES[CUR_ROLE] && ROLES[CUR_ROLE].name || CUR_ROLE}」无任何可访问菜单，请联系管理员配置权限`;
    tip.style.display = "block";
    CUR_ROLE = null;
    return;
  }
  // 将登录会话信息持久化到 sessionStorage，刷新页面可自动恢复
  try {
    sessionStorage.setItem(
      "oa_session",
      JSON.stringify({ uid, role: CUR_ROLE, time: Date.now() }),
    );
  } catch (e) {
    // sessionStorage 不可用时降级忽略
  }
  _syncCurrAcct(uid);
  applyRoleUI();
  document.getElementById("loginTip").style.display = "none";
  window.closeAvatarMenu && window.closeAvatarMenu();
  // 清除"待办已关闭"标记，使本次登录再次弹窗
  try { sessionStorage.removeItem("oa_todo_dismissed"); } catch (e) {}
  // 跳转到第一个有权限的模块（而非硬编码 home）
  window.selectModule(firstKey);
  // 登录成功后更新铃铛角标并弹窗提醒待办事项
  window.updateBellBadge && window.updateBellBadge();
  setTimeout(() => { window.showLoginTodoModal && window.showLoginTodoModal(); }, 300);
}

/** 应用当前角色到顶部头像、下拉菜单等 UI 区域（登录/恢复会话共用） */
function applyRoleUI() {
  const r = ROLES[CUR_ROLE];
  if (!r) return;
  const av = document.getElementById("avatarBox");
  if (av) av.innerText = (r.user || r.name || "?").charAt(0);
  const nm = document.getElementById("amName");
  if (nm) nm.innerText = r.user || r.name || "";
  const rl = document.getElementById("amRole");
  if (rl) rl.innerText = LOGIN.roleLabel.replace("{name}", r.name || "未知");
  // 更新铃铛角标（待办数量随角色变化）
  window.updateBellBadge && window.updateBellBadge();
}

function fillDemo(u) {
  const uEl = document.getElementById("lgUser");
  const pEl = document.getElementById("lgPwd");
  if (uEl) uEl.value = u;
  // 从账号档案取密码
  const acct = window.findAccount(u);
  if (pEl) pEl.value = acct ? acct.pwd : (DEMO_PWD[u] || DEFAULT_PWD);
  const tip = document.getElementById("loginTip");
  if (tip) tip.style.display = "none";
}

/** 动态渲染登录页的演示账号列表（从 ACCOUNTS 中读取启用状态的账号） */
function renderDemoAccounts() {
  const box = document.getElementById("lgDemoList");
  if (!box) return;
  const accts = typeof window.getAccounts === "function" ? window.getAccounts() : [];
  const roles = typeof window.ROLES !== "undefined" ? window.ROLES : (typeof window._getRoles === "function" ? window._getRoles() : {});
  const parts = [];
  accts
    .filter((a) => a.st === "启用")
    .forEach((a) => {
      const r = roles[a.key] || (typeof window.findRole === "function" ? window.findRole(a.key) : null);
      const roleName = r ? r.name : a.key;
      parts.push(
        `<span class="lg-chip" onclick="fillDemo('${a.id}')">${a.id} ${roleName}</span>`,
      );
    });
  box.innerHTML = parts.join("");
}

function logout() {
  // 清除本地持久化的会话信息
  try {
    sessionStorage.removeItem("oa_session");
    sessionStorage.removeItem("oa_todo_dismissed");
  } catch (e) {
    // 忽略
  }
  // 清除路由持久化（下次登录从首页开始）
  if (typeof window.clearRoute === "function") window.clearRoute();
  document.getElementById("view-login").style.display = "flex";
  document.getElementById("app").style.display = "none";
  document.getElementById("loginTip").style.display = "block";
  document.getElementById("lgUser").value = "";
  document.getElementById("lgPwd").value = "";
  window.closeAvatarMenu();
  const uEl = document.getElementById("lgUser");
  if (uEl) uEl.focus();
}

function interceptDemo() {
  document.getElementById("view-login").style.display = "flex";
  document.getElementById("app").style.display = "none";
  document.getElementById("loginTip").style.display = "block";
}

/* ---------- 权限配置弹窗 ---------- */

function openPermConfig() {
  window.closeAvatarMenu();
  if (CUR_ROLE !== "sysAdmin") {
    window.toast(TOAST.permConfigOnly);
    return;
  }
  // 必须通过 window._permConfigTarget 指定角色（从角色管理页按钮传入）
  const target = window._permConfigTarget;
  if (!target || !ROLES[target]) {
    window.toast("请从角色管理页进入权限配置");
    return;
  }
  _permConfigRole = target;
  const modal = document.getElementById("modal");
  const mask = document.getElementById("mask");
  modal.innerHTML = buildPermConfigHTML();
  mask.style.display = "flex";
  bindPermConfigEvents();
}

/** 绑定弹窗内按钮事件（折叠 / 父子联动，完全递归通用，不关心层级深度） */
function bindPermConfigEvents() {
  const modal = document.getElementById("modal");
  // 折叠：统一处理 .pc-mod-head 和 .pc-group-head
  const heads = modal.querySelectorAll(".pc-mod-head, .pc-group-head");
  heads.forEach((h) => {
    h.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT") return;
      h.classList.toggle("collapsed");
      const body = h.nextElementSibling;
      if (body) body.style.display = h.classList.contains("collapsed") ? "none" : "";
    });
  });
  // 统一的父子联动：所有 .pc-tree-cb（同时联动后代的 action checkbox）
  const allCbs = modal.querySelectorAll(".pc-tree-cb");
  allCbs.forEach((cb) => {
    cb.addEventListener("change", () => {
      const isChecked = cb.checked;
      const curPath = cb.dataset.path || "";
      // 向下联动：仅联动 data-path 以当前路径 + "/" 开头的 **真正后代**，不影响兄弟
      allCbs.forEach((descendant) => {
        const dp = descendant.dataset.path || "";
        if (dp !== curPath && dp.startsWith(curPath + "/")) {
          descendant.checked = isChecked;
          descendant.indeterminate = false;
        }
      });
      // 同时联动后代路径的 action checkbox
      modal.querySelectorAll(".pc-action-cb").forEach((acb) => {
        const ap = acb.dataset.path || "";
        if (ap.startsWith(curPath + "/") || ap === curPath) {
          acb.checked = isChecked;
        }
      });
      // 向上回算：逐层找父级 cb 重新计算状态
      _propagateUp(cb);
    });
  });
  // action checkbox 单独变化：向上回算所属 tree-cb 状态
  const actionCbs = modal.querySelectorAll(".pc-action-cb");
  actionCbs.forEach((acb) => {
    acb.addEventListener("change", () => {
      const path = acb.dataset.path;
      if (!path) return;
      const treeCb = modal.querySelector('.pc-tree-cb[data-path="' + path + '"]');
      if (treeCb) _propagateUp(treeCb);
    });
  });
  const saveBtn = modal.querySelector(".pc-save");
  if (saveBtn) saveBtn.addEventListener("click", savePermConfig);
  const resetBtn = modal.querySelector(".pc-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetPermConfig);
}

/** 递归向上回算父级 cb 的 checked/indeterminate 状态 */
function _propagateUp(cb) {
  const path = cb.dataset.path || "";
  if (!path) return;
  const segments = path.split("/");
  if (segments.length < 2) return;
  const parentPath = segments.slice(0, -1).join("/");
  const parentCb = document.querySelector('.pc-tree-cb[data-path="' + parentPath + '"]');
  if (!parentCb) return;
  const parentSegCount = parentPath.split("/").length;
  const siblings = document.querySelectorAll('.pc-tree-cb[data-path^="' + parentPath + '/"]');
  const directChildren = Array.from(siblings).filter(
    (s) => s.dataset.path.split("/").length === parentSegCount + 1,
  );
  if (directChildren.length === 0) return;
  const fullyCount = directChildren.filter((s) => s.checked && !s.indeterminate).length;
  const anyCount = directChildren.filter((s) => s.checked || s.indeterminate).length;
  parentCb.checked = fullyCount === directChildren.length;
  parentCb.indeterminate = anyCount > 0 && fullyCount < directChildren.length;
  _propagateUp(parentCb);
}

function closePermConfig() {
  document.getElementById("mask").style.display = "none";
}

/** 构建单角色权限配置弹窗（无 Tab，仅针对 _permConfigRole） */
function buildPermConfigHTML() {
  const role = _permConfigRole;
  const roleName = ROLES[role].name;
  const isDisabled = role === "sysAdmin";
  // 展示所有模块（包括 home，让用户能配置每个角色的首页权限）
  const allMods = Object.entries(MODULES);
  const modBlocks = allMods
    .map(([mk, m]) => renderPermModuleBlock(mk, m, role, isDisabled))
    .join("");
  const footBtns = isDisabled
    ? `<span class="pc-readonly-lock">🔒 ${PERM.note}</span>`
    : `<button type="button" class="btn gray pc-reset">${PERM.reset}</button>
       <button type="button" class="btn pc-save">${PERM.save}</button>`;
  const body = `
    <div class="perm-config">
      <div class="pc-tip">当前正在配置角色「${roleName}」的模块和菜单访问权限${isDisabled ? "（内置只读，不可修改）" : ""}。勾选后该角色用户可访问对应模块。</div>
      <div class="pc-body">${modBlocks}</div>
    </div>`;
  return modalContent(`权限配置 · ${roleName}`, body, footBtns);
}

/** 从 permsEntry 解析出已授予的 actions 数组
 *  entry === true 或无 actions 字段 → 返回声明 actions 的全量（向后兼容）
 *  entry.actions 是数组 → 返回它 */
function _getPermEntryActions(entry, declaredActions) {
  if (!declaredActions || declaredActions.length === 0) return [];
  if (entry === true) return declaredActions.slice();
  if (!entry || typeof entry !== "object") return [];
  if (entry.actions === undefined) return declaredActions.slice();
  return Array.isArray(entry.actions) ? entry.actions.slice() : [];
}

/** 渲染一行 actions checkbox（供 _renderPermsLevel 和 renderPermModuleBlock 调用）
 *  @param {string} dataPath  所属节点的 data-path
 *  @param {Array}  declared 菜单节点声明的 actions
 *  @param {Array}  granted  perms 中已授予的 actions
 *  @param {string} disAttr   disabled 属性
 *  @returns {string} HTML */
function _renderActionsRow(dataPath, declared, granted, disAttr) {
  if (!declared || declared.length === 0) return "";
  const map = {};
  (granted || []).forEach((a) => { map[a] = true; });
  const boxes = declared
    .map((a) => {
      const info = ACTION_MAP[a] || { key: a, label: a };
      const checked = map[a] ? "checked" : "";
      return `<label class="pc-action-item" title="${info.desc || ""}">
        <input type="checkbox" class="pc-action-cb" data-path="${dataPath}" data-action="${a}" ${checked} ${disAttr}>
        <span>${info.label}</span>
      </label>`;
    })
    .join("");
  return `<div class="pc-actions-row">${boxes}</div>`;
}

/** 读取 perms 中某路径的授权状态
 *  @returns {{ checked: boolean, indeterminate: boolean }} */
function _getPermNodeState(permsEntry, childCount) {
  if (permsEntry === true) return { checked: true, indeterminate: false };
  if (permsEntry && typeof permsEntry === "object") {
    // 有 actions 时，如果 actions 全空且 subs 也全空 → 未勾选
    const subs = permsEntry.subs;
    const actions = permsEntry.actions;
    if (!subs && !actions) return { checked: false, indeterminate: false };
    if (subs) {
      const checkedCount = Object.keys(subs).filter((k) => subs[k] === true || typeof subs[k] === "object").length;
      if (checkedCount === childCount && childCount > 0) return { checked: true, indeterminate: false };
      if (checkedCount > 0) return { checked: true, indeterminate: true };
    }
    if (actions && actions.length > 0) return { checked: true, indeterminate: false };
  }
  return { checked: false, indeterminate: false };
}

/** 递归渲染某层 subs 的权限 checkbox + actions 勾选（不关心深度，data-path 存完整路径）
 *  @param {Array}  subsArr   当前层菜单节点数组
 *  @param {Object} permsSubs 对应层级的 perms.subs 对象
 *  @param {Array}  path      到当前层的完整路径（不含自身 key）
 *  @param {number} depth     当前层级深度（用于缩进和 class 命名）
 *  @param {string} disAttr   disabled 属性字符串
 *  @returns {string} HTML */
function _renderPermsLevel(subsArr, permsSubs, path, depth, disAttr) {
  const indent = depth * 16;
  const lineClass = depth === 0 ? "pc-sub" : depth === 1 ? "pc-sub2" : "pc-subN";
  return (subsArr || [])
    .map((s) => {
      const curPath = [...path, s.key];
      const dataPath = curPath.join("/");
      const childSubs = (s.subs || []).filter((c) => c.type !== "external");
      const permsEntry = permsSubs ? permsSubs[s.key] : null;
      const childCount = childSubs.length;
      const declaredActions = Array.isArray(s.actions) ? s.actions : [];
      const { checked, indeterminate } = _getPermNodeState(permsEntry, childCount);
      const cbClass = `pc-tree-cb pc-level-${depth}`;
      const cb = `<input type="checkbox" class="${cbClass}" data-path="${dataPath}" ${checked ? "checked" : ""} ${indeterminate ? "indeterminate" : ""} ${disAttr}>`;
      const icon = `<span class="pc-ic pc-ic-${depth}">${s.icon || "📄"}</span>`;
      const label = `<span class="pc-label">${s.name}</span>`;
      const grantedActions = _getPermEntryActions(permsEntry, declaredActions);
      // 只有内部菜单的叶子节点才显示业务权限行，外部系统和有子菜单的父级目录不显示
      const showActions = s.type !== "external" && childCount === 0;
      const actionsRow = showActions ? _renderActionsRow(dataPath, declaredActions, grantedActions, disAttr) : "";
      if (childCount === 0) {
        // 无子级 → checkbox+icon+label 第一行，actionsRow 缩进显示在下方第二行
        return `<div class="${lineClass}" style="padding-left:${indent}px">
          <div class="pc-sub-row">${cb}${icon}${label}</div>
          ${actionsRow}
        </div>`;
      }
      // 有子级 → 可折叠，同样拆成两行
      const childHtml = _renderPermsLevel(childSubs, permsEntry && permsEntry.subs ? permsEntry.subs : {}, curPath, depth + 1, disAttr);
      return `
        <div class="pc-group">
          <div class="${lineClass} pc-group-head" style="padding-left:${indent}px">
            <div class="pc-sub-row">${cb}${icon}${label}<span class="pc-caret">▶</span></div>
            ${actionsRow}
          </div>
          <div class="pc-group-body">${childHtml}</div>
        </div>`;
    })
    .join("");
}

/** 渲染单个模块的权限配置块（完全递归，data-path 存完整路径） */
function renderPermModuleBlock(moduleKey, moduleDef, roleKey, disabled) {
  const rolePerms = ROLES[roleKey] && ROLES[roleKey].perms;
  const modPerm = rolePerms && rolePerms[moduleKey];
  const disAttr = disabled ? "disabled" : "";
  const allSubs = moduleDef.subs || [];
  const childCount = allSubs.filter((s) => s.type !== "external").length;
  // 模块级 checkbox 状态：优先看 _getPermNodeState 对子项的推导，
  // 再叠加 explicit enabled=true 且无子项的叶子模块场景（如 home）
  const explicitEnabled = !!(modPerm && modPerm.enabled === true);
  const { checked: stateChecked, indeterminate } = _getPermNodeState(modPerm, childCount);
  const moduleChecked = stateChecked || (explicitEnabled && childCount === 0);
  const modIndeterminate = indeterminate && !moduleChecked ? "indeterminate" : "";
  const subsHtml = _renderPermsLevel(allSubs, modPerm && modPerm.subs ? modPerm.subs : [], [moduleKey], 0, disAttr);
  const declaredActions = Array.isArray(moduleDef.actions) ? moduleDef.actions : [];
  const grantedActions = _getPermEntryActions(modPerm, declaredActions);
  const showModActions = allSubs.length === 0 && (moduleDef.type || "internal") !== "external";
  const actionsRow = showModActions ? _renderActionsRow(moduleKey, declaredActions, grantedActions, disAttr) : "";
  return `
    <div class="pc-mod">
      <div class="pc-mod-head">
        <div class="pc-sub-row">
          <input type="checkbox" class="pc-mod-cb pc-tree-cb" data-path="${moduleKey}" data-mod-enabled="1" ${moduleChecked ? "checked" : ""} ${modIndeterminate} ${disAttr}>
          <span class="pc-mod-ic">${moduleDef.icon || "📦"}</span>
          <span>${moduleDef.name}</span>
          <span class="pc-toggle">▼</span>
        </div>
        ${actionsRow}
      </div>
      ${subsHtml ? `<div class="pc-mod-body">${subsHtml}</div>` : ""}
    </div>`;
}

/** 从 MENUS 递归查找某路径节点声明的 actions（供保存时收集 actions 使用） */
function _findNodeDeclaredActions(moduleKey, ...restKeys) {
  const mod = MENUS[moduleKey];
  if (!mod) return [];
  const path = restKeys.filter((k) => !!k);
  let cur = mod;
  for (const key of path) {
    cur = (cur.subs || []).find((s) => s.key === key);
    if (!cur) return [];
  }
  return Array.isArray(cur.actions) ? cur.actions.slice() : [];
}

/** 递归收集某层的勾选结果，构建 perms.subs 对象（同时收集 actions）
 *  @param {Array}  nodes        当前层有效菜单节点数组
 *  @param {Set}    checkedSet   所有 checked 的 data-path 集合
 *  @param {Map}    actionsMap   路径 → 已勾选 action[] 的 Map
 *  @param {string} pathPrefix   到当前层的路径前缀
 *  @returns {Object} 形如 { key: true | { subs: {...}, actions: [...] } } */
function _collectPermsLevel(nodes, checkedSet, actionsMap, pathPrefix) {
  const out = {};
  nodes.forEach((n) => {
    const curPath = pathPrefix ? `${pathPrefix}/${n.key}` : n.key;
    // external 菜单只关心自身的访问权限，不递归子级（external 无子级）
    if (n.type === "external") {
      if (checkedSet.has(curPath)) out[n.key] = true;
      return;
    }
    const childSubs = (n.subs || []).filter((c) => c.type !== "external");
    const selfChecked = checkedSet.has(curPath);
    const declaredActions = Array.isArray(n.actions) ? n.actions : [];
    const grantedActions = actionsMap.get(curPath) || [];
    const hasActions = declaredActions.length > 0 && grantedActions.length > 0;
    if (childSubs.length > 0) {
      const childPerms = _collectPermsLevel(childSubs, checkedSet, actionsMap, curPath);
      const childKeys = Object.keys(childPerms);
      if (childKeys.length === 0) {
        // 子级全部 external 或全部未勾选 → 只看自身
        if (selfChecked) {
          out[n.key] = hasActions ? { actions: grantedActions } : true;
        }
      } else {
        // 只要有子级被授权 → 必须保留 { subs: {...} } 结构
        // 不能简化为 true——因为子级可能有 actions 细节需要保留
        const node = { subs: childPerms };
        if (hasActions) node.actions = grantedActions;
        out[n.key] = node;
      }
    } else if (selfChecked) {
      // 真正的叶子节点（无子级）→ 可简化为 true 或 { actions: [...] }
      out[n.key] = hasActions ? { actions: grantedActions } : true;
    }
  });
  return out;
}

/** 从弹窗收集勾选结果，以递归方式重建 ROLES[roleKey].perms（支持任意层级 + actions） */
function savePermConfig() {
  const modal = document.getElementById("modal");
  const roleKey = _permConfigRole;
  if (!roleKey || !ROLES[roleKey]) {
    window.toast("未知角色，保存失败");
    return;
  }
  if (roleKey === "sysAdmin") {
    ROLES.sysAdmin.perms = window.buildFullRolePerms();
    saveRoles();
    closePermConfig();
    document.dispatchEvent(new CustomEvent('permschange'));
    window.toast(PERM.saved.replace('{role}', ROLES[roleKey].name));
    return;
  }
  // 收集所有 checked 的 tree-cb data-path
  const checkedPaths = new Set();
  modal.querySelectorAll(".pc-tree-cb:checked").forEach((cb) => {
    if (cb.dataset.path) checkedPaths.add(cb.dataset.path);
  });
  // 收集所有勾选的 action：path → actions[]
  const actionsMap = new Map();
  modal.querySelectorAll(".pc-action-cb:checked").forEach((cb) => {
    const p = cb.dataset.path;
    const a = cb.dataset.action;
    if (!p || !a) return;
    if (!actionsMap.has(p)) actionsMap.set(p, []);
    actionsMap.get(p).push(a);
  });
  const newPerms = {};
  for (const mk in MENUS) {
    const m = MENUS[mk];
    const modEnabled = checkedPaths.has(mk);
    const subs = _collectPermsLevel((m.subs || []), checkedPaths, actionsMap, mk);
    if (!modEnabled && Object.keys(subs).length === 0) continue;
    newPerms[mk] = { enabled: modEnabled, subs };
  }
  ROLES[roleKey].perms = newPerms;
  saveRoles();
  closePermConfig();
  document.dispatchEvent(new CustomEvent('permschange'));
  window.toast(PERM.saved.replace('{role}', ROLES[roleKey].name));
}

/** 将当前角色的权限恢复为默认值（与 resetRoles 对单角色的行为一致，不影响其他角色） */
function resetPermConfig() {
  const roleKey = _permConfigRole;
  if (!roleKey) return;
  ROLES[roleKey].perms = window.buildDefaultRolePerms(roleKey);
  saveRoles();
  closePermConfig();
  document.dispatchEvent(new CustomEvent('permschange'));
  window.toast(`角色「${ROLES[roleKey].name}」权限已恢复默认`);
}

/* ---------- 挂载到 window（供 HTML 内联 onclick 调用 + 跨模块调用） ---------- */
window.doLogin = doLogin;
window.fillDemo = fillDemo;
window.renderDemoAccounts = renderDemoAccounts;
window.logout = logout;
window.canAccessModule = canAccessModule;
window.openPermConfig = openPermConfig;
window.closePermConfig = closePermConfig;
window.interceptDemo = interceptDemo;
// 业务级 Action 权限相关
window.canAction = canAction;
window.currentCanAction = currentCanAction;
window.findMenuNode = findMenuNode;
// 常量挂载（供 views.js / 其他模块使用）
window.ALL_ACTIONS = ALL_ACTIONS;
window.ACTION_MAP = ACTION_MAP;
/* ========== 研发OA综合平台 · 角色与权限（config-roles.js） ========== */
/* 拆分自原 config.js。包含：
 *   - 内置角色定义（DEFAULT_ROLES / ROLES）
 *   - 角色默认权限构建（buildDefaultRolePerms / buildFullRolePerms / ROLE_EXTRA_ACTIONS）
 *   - 角色持久化 CRUD（saveRoles / loadRoles / addRole / updateRole / deleteRole）
 * 依赖 config-menu.js 的 MENUS 结构（仅在运行时函数调用时读取，无加载顺序约束）。 */

/* ---------- 角色（持久化到 localStorage） ---------- */
const ROLE_KEY = "oa_roles";
const DEFAULT_ROLES = [
  {
    key: "staff",
    name: "一般人员",
    desc: "所有模块的查看和导出权限",
    user: "张工 (8001)",
    builtin: true,
  },
  {
    key: "projManager",
    name: "项目经理",
    desc: "所有模块查看导出 + 过程资产 4 个页面新增/编辑/删除",
    user: "刘工 (8004)",
    builtin: true,
  },
  {
    key: "supervisor",
    name: "主管",
    desc: "所有模块查看导出 + 绩效管理相关审批和管理权限",
    user: "周主管 (8005)",
    builtin: true,
  },
  {
    key: "deptLeader",
    name: "部门领导",
    desc: "所有模块查看导出 + 部门绩效管理审批和全局管理权限",
    user: "赵主任 (8006)",
    builtin: true,
  },
  {
    key: "sysAdmin",
    name: "系统管理员",
    desc: "平台超级管理员，拥有全部菜单权限；负责账号、角色、权限配置",
    user: "系统管理员(admin)",
    builtin: true,
  }];

/* 运行时角色表——加载后为 { key: { name, desc, icon, user, builtin, perms } } 结构 */
let ROLES = {};



/** 递归收集某层 subs 的全权限结构（含 actions 全量授权）
 *  有下一级 subs 时递归返回；叶子节点返回 true 或 { actions: [...] } */
function _buildFullSubs(subsArray) {
  const out = {};
  (subsArray || []).forEach((s) => {
    // external 菜单：仅访问权限 true，不递归子级（external 无子级）
    if (s.type === "external") {
      out[s.key] = true;
      return;
    }
    const childSubs = (s.subs || []).filter((c) => c.type !== "external");
    const declaredActions = Array.isArray(s.actions) ? s.actions : [];
    if (childSubs.length > 0) {
      // 有子级 → 必须用 { subs: ... } 包装，与 _collectPermsLevel / _buildRoleSubsPerms 结构统一
      // 否则 _getPermNodeState 读 permsEntry.subs 得到 undefined → 父级 checkbox 永远不勾选
      out[s.key] = { subs: _buildFullSubs(childSubs) };
    } else if (declaredActions.length > 0) {
      // 叶子节点声明了 actions → 全量授权这些 actions
      out[s.key] = { actions: declaredActions.slice() };
    } else {
      out[s.key] = true;
    }
  });
  return out;
}

/** 各角色的额外 actions 配置（基础 actions 统一为 view + export）
 *  key: 角色 key → 模块 key → 子菜单 key → 额外 actions 数组 */
const ROLE_EXTRA_ACTIONS = {
  projManager: {
    asset: {
      "sub-spec": ["add", "edit", "delete"],
      "sub-tpl": ["add", "edit", "delete"],
      "sub-design": ["add", "edit", "delete"],
      "sub-check": ["add", "edit", "delete"],
    },
  },
  supervisor: {
    perf: {
      paTemplate: ["add", "edit"],
      paTableMonthly: ["edit"],
      paTableYearly: ["edit"],
      paPeerMgmt: ["view"],
    },
  },
  deptLeader: {
    perf: {
      paTemplate: ["add", "edit"],
      paTableMonthly: ["edit"],
      paTableYearly: ["edit"],
      paYearly: ["edit"],
      paPeerMgmt: ["view", "edit"],
    },
  },
};

/** 递归构建 subs 权限：基础 view+export，叠加角色额外 actions
 *  @param {Array}  subsArray 当前层菜单节点
 *  @param {string} roleKey   目标角色
 *  @param {string} moduleKey 所属模块 key（用于查 ROLE_EXTRA_ACTIONS） */
function _buildRoleSubsPerms(subsArray, roleKey, moduleKey) {
  const out = {};
  const overrides = (ROLE_EXTRA_ACTIONS[roleKey] && ROLE_EXTRA_ACTIONS[roleKey][moduleKey]) || {};
  (subsArray || []).forEach((s) => {
    if (s.type === "external") {
      out[s.key] = true;
      return;
    }
    const declaredActions = Array.isArray(s.actions) ? s.actions : [];
    // 基础 actions：view + export（仅取菜单声明过的）
    const baseActions = declaredActions.filter((a) => a === "view" || a === "export");
    // 叠加角色特定的额外 actions（也需在菜单声明范围内）
    const extraActions = (overrides[s.key] || []).filter((a) => declaredActions.includes(a));
    const granted = baseActions.concat(extraActions).filter((a, i, arr) => arr.indexOf(a) === i);

    const childSubs = (s.subs || []).filter((c) => c.type !== "external");
    if (childSubs.length > 0) {
      const childPerms = _buildRoleSubsPerms(childSubs, roleKey, moduleKey);
      if (Object.keys(childPerms).length > 0) {
        const node = { subs: childPerms };
        if (granted.length > 0) node.actions = granted;
        out[s.key] = node;
        return;
      }
    }
    // 无子级 or 子级无授权 → 自身叶子节点
    if (granted.length > 0) {
      out[s.key] = { actions: granted };
    }
  });
  return out;
}

/** 根据 MENUS 为指定角色生成默认 perms
 *  sysAdmin       → buildFullRolePerms() 全量授权
 *  其他内置角色    → 所有非 sys 模块 enabled，subs 给 view+export + ROLE_EXTRA_ACTIONS 叠加
 *  自定义角色      → 与一般人员同权限（view+export） */
function buildDefaultRolePerms(roleKey) {
  if (roleKey === "sysAdmin") return buildFullRolePerms();
  const out = {};
  for (const mk in MENUS) {
    if (mk === "sys") continue; // 非 sysAdmin 不给系统管理模块
    const m = MENUS[mk];
    const subs = _buildRoleSubsPerms(m.subs || [], roleKey, mk);
    out[mk] = { enabled: true, subs };
  }
  return out;
}

/** 全模块全子菜单全层级都设为全量授权的 perms 结构（含 actions 全量） */
function buildFullRolePerms() {
  const out = {};
  for (const mk in MENUS) {
    const m = MENUS[mk];
    out[mk] = {
      enabled: true,
      // 保留 external 子菜单（_buildFullSubs 内部会处理）
      subs: _buildFullSubs(m.subs || []),
    };
  }
  return out;
}

/* ========== 角色持久化（localStorage） ========== */

/** 将 ROLES 当前内容序列化写入 localStorage */
function saveRoles() {
  try {
    const flat = {};
    for (const key in ROLES) {
      flat[key] = {
        key: ROLES[key].key,
        name: ROLES[key].name,
        desc: ROLES[key].desc,
        user: ROLES[key].user,
        builtin: !!ROLES[key].builtin,
        perms: ROLES[key].perms || {},
      };
    }
    localStorage.setItem(ROLE_KEY, JSON.stringify(flat));
  } catch (e) {
    /* 忽略 */
  }
}

/** 从 localStorage 加载 ROLES；无则以 DEFAULT_ROLES + buildDefaultRolePerms 初始化 */
function loadRoles() {
  let flat = null;
  try {
    const raw = localStorage.getItem(ROLE_KEY);
    if (raw) flat = JSON.parse(raw);
  } catch (e) {
    /* 忽略存储异常 */
  }
  if (
    flat &&
    typeof flat === "object" &&
    !Array.isArray(flat) &&
    Object.keys(flat).length > 0
  ) {
    ROLES = flat;
    // 完整性校验：确保所有 DEFAULT_ROLES 里的内置角色都存在
    // 并强制所有内置角色的 perms 跟随最新代码重新生成（内置角色不允许被自定义覆盖）
    DEFAULT_ROLES.forEach((dr) => {
      if (!ROLES[dr.key]) {
        ROLES[dr.key] = {
          key: dr.key,
          name: dr.name,
          desc: dr.desc,
          user: dr.user,
          builtin: !!dr.builtin,
          perms: buildDefaultRolePerms(dr.key),
        };
      } else {
        // 内置角色：名称/描述/权限都跟随代码更新（用户对内置角色的自定义会被重置）
        ROLES[dr.key].name = dr.name;
        ROLES[dr.key].desc = dr.desc;
        ROLES[dr.key].builtin = !!dr.builtin;
        ROLES[dr.key].perms = buildDefaultRolePerms(dr.key);
      }
    });
  } else {
    ROLES = {};
    DEFAULT_ROLES.forEach((dr) => {
      ROLES[dr.key] = {
        key: dr.key,
        name: dr.name,
        desc: dr.desc,
        user: dr.user,
        builtin: !!dr.builtin,
        perms: buildDefaultRolePerms(dr.key),
      };
    });
  }
  saveRoles();
}

/** 按 key 查找角色 */
function findRole(key) {
  return ROLES[key] || null;
}

/** 新增角色——成功返回新角色对象，失败返回 null */
function addRole(key, name, desc) {
  if (!key || !name) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,20}$/.test(key)) return null;
  if (ROLES[key]) return null;
  ROLES[key] = {
    key,
    name: name.trim(),
    desc: desc ? desc.trim() : "",
    user: "自定义角色",
    perms: buildDefaultRolePerms(key),
  };
  saveRoles();
  return ROLES[key];
}

/** 更新角色字段——仅允许修改 name、desc */
function updateRole(key, patch) {
  if (!ROLES[key]) return false;
  if (ROLES[key].builtin) return false;
  if (patch.name !== undefined && patch.name.trim())
    ROLES[key].name = patch.name.trim();
  if (patch.desc !== undefined) ROLES[key].desc = patch.desc;
  saveRoles();
  return true;
}

/** 删除角色（内置角色不可删）；同时清理所有账号中指向该角色的引用（降级为 staff） */
function deleteRole(key) {
  if (!ROLES[key]) return false;
  if (ROLES[key].builtin) return false;
  if (typeof ACCOUNTS !== "undefined" && Array.isArray(ACCOUNTS)) {
    ACCOUNTS.forEach((a) => {
      if (a.key === key) a.key = "staff";
    });
    if (typeof saveAccounts === "function") saveAccounts();
  }
  delete ROLES[key];
  saveRoles();
  return true;
}

/* ---------- 角色管理函数挂载到 window ---------- */
window.loadRoles = loadRoles;
window.findRole = findRole;
window.addRole = addRole;
window.updateRole = updateRole;
window.deleteRole = deleteRole;
window.buildDefaultRolePerms = buildDefaultRolePerms;
window.buildFullRolePerms = buildFullRolePerms;
window.ROLES = ROLES;


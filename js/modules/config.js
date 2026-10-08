/* ========== 研发OA综合平台 · 配置与数据 ========== */

/* ---------- 角色（持久化到 sessionStorage） ---------- */
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

/** 角色 key 数组（动态 Proxy，兼容原有 ALL 引用） */
const ALL = new Proxy([], {
  get(target, prop) {
    const keys = Object.keys(ROLES);
    if (prop === "length") return keys.length;
    if (typeof prop === "string" && /^\d+$/.test(prop))
      return keys[parseInt(prop)];
    if (prop === "slice") return (...args) => keys.slice(...args);
    if (prop === "map") return (...args) => keys.map(...args);
    if (prop === "includes") return (...args) => keys.includes(...args);
    if (prop === "filter") return (...args) => keys.filter(...args);
    if (prop === Symbol.iterator) return keys[Symbol.iterator].bind(keys);
    return keys[prop];
  },
});

/* ---------- 动态菜单表（持久化到 sessionStorage，支持任意深度递归） ---------- */
/*
 * MENUS 是运行时菜单表，由 loadMenus() 从 sessionStorage 加载，首次启动从 DEFAULT_MODULES 种子生成。
 * 结构：{ [modKey]: { key, name, icon, order, subs: [
 *   { key, name, icon, order, type, url, subs: [...] }
 * ]}}
 */
const MENU_KEY = "oa_menus";
let MENUS = {};

/* 菜单模块 key 排序（按 order 升序） */
function _sortedMenus() {
  return Object.entries(MENUS).sort(
    (a, b) => (a[1].order || 0) - (b[1].order || 0),
  );
}
/* 菜单子项排序 */
function _sortedSubs(modKey) {
  const subs = (MENUS[modKey] && MENUS[modKey].subs) || [];
  return subs.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
}
/* 兼容原有 Object.entries(MODULES) 写法的别名代理（所有操作实时转发到当前 MENUS 变量） */
const MODULES = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "length") return Object.keys(MENUS).length;
      return MENUS[prop];
    },
    has(_target, prop) {
      return prop in MENUS;
    },
    ownKeys(_target) {
      return Reflect.ownKeys(MENUS);
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(MENUS, prop);
    },
  },
);

/* ---------- 业务级 Action 权限常量 ---------- */
/** 所有可用的业务 Action（全局定义，菜单通过 actions 数组声明自身支持哪些） */
const ALL_ACTIONS = [
  { key: "view", label: "查看", desc: "浏览和查询数据" },
  { key: "add", label: "新增", desc: "创建新记录" },
  { key: "edit", label: "编辑", desc: "修改已有记录" },
  { key: "delete", label: "删除", desc: "移除记录" },
  { key: "export", label: "导出", desc: "下载或导出数据" },
  { key: "admin", label: "管理员", desc: "模块级管理员权限，可执行所有操作" }];
/** Action key → 描述 快速查找表 */
const ACTION_MAP = ALL_ACTIONS.reduce(
  (m, a) => { m[a.key] = a; return m; },
  {},
);

/* ---------- 默认菜单种子（首次启动时从 MODULES 转 MENUS，使用 roles 字段生成角色默认 perms） ---------- */
const DEFAULT_MODULES = {
  home: {
    name: "首页",
    icon: "🏠",
    order: 1,
    subs: [],
  },
  proj: {
    name: "项目管理",
    icon: "📁",
    order: 2,
    subs: [
      {
        key: "pms",
        name: "项目管理系统",
        icon: "📁",
        order: 1,
        type: "external",
        url: "http://192.168.1.19/devsuite/#home",
      },
      {
        key: "board",
        name: "项目看板",
        icon: "📊",
        order: 2,
        type: "external",
        url: "http://192.168.215.23/axshare/ppb/index.html",
      }],
  },
  dev: {
    name: "研发公共",
    icon: "🔬",
    order: 3,
    subs: [
      { key: "stdHome", name: "标准库", icon: "📚", order: 1, actions: ["view", "export", "add", "edit", "delete"] },
      { key: "ec", name: "经验案例库", icon: "💡", order: 2, actions: ["view", "add", "edit", "delete", "export", "admin"] },
      {
        key: "sub-serial",
        name: "串口调试工具",
        icon: "🔌",
        order: 4,
        type: "external",
        url: "http://swagger.qwgas.com/#/home",
      },
      {
        key: "sub-auto",
        name: "自动化测试平台",
        icon: "🤖",
        order: 5,
        type: "external",
        url: "http://192.168.215.23/pd/uml/index.html",
      }],
  },
  asset: {
    name: "过程资产",
    icon: "📐",
    order: 4,
    subs: [
      {
        key: "sub-spec",
        name: "开发规范",
        icon: "📐",
        order: 1,
        actions: ["view", "add", "edit", "delete", "export"],
      },
      {
        key: "sub-tpl",
        name: "文档模板",
        icon: "📄",
        order: 2,
        actions: ["view", "add", "edit", "delete", "export"],
      },
      {
        key: "sub-design",
        name: "设计规范",
        icon: "🎨",
        order: 3,
        actions: ["view", "add", "edit", "delete", "export"],
      },
      {
        key: "sub-check",
        name: "评审 checklist",
        icon: "✅",
        order: 4,
        actions: ["view", "add", "edit", "delete", "export"],
      }],
  },
  perf: {
    name: "绩效管理",
    icon: "📈",
    order: 5,
    subs: [
      { key: "paTemplate", name: "考核模板管理", icon: "📋", order: 2, actions: ["view", "add", "edit"] },
      { key: "paTableMonthly", name: "月度绩效考核", icon: "📅", order: 3, actions: ["view", "edit"] },
      { key: "paTableYearly", name: "年度绩效考核", icon: "🎯", order: 4, actions: ["view", "edit"] },
      { key: "paPeerMgmt", name: "互评管理", icon: "👥", order: 5, actions: ["view", "edit"] },
      { key: "paPeerReview", name: "我的互评任务", icon: "✍️", order: 6, actions: ["view"] },
      { key: "paResult", name: "结果查询 / 检索", icon: "🔎", order: 7, actions: ["view", "export"] },
      { key: "paYearly", name: "年终考核汇总", icon: "🏆", order: 8, actions: ["view", "edit"] }],
  },
  sys: {
    name: "系统管理",
    icon: "⚙️",
    order: 6,
    roles: ["sysAdmin"],
    subs: [
      { key: "sysAcct", name: "账号管理", icon: "👤", order: 1, roles: ["sysAdmin"], actions: ["view", "add", "edit", "delete"] },
      { key: "sysDept", name: "部门管理", icon: "🏢", order: 2, roles: ["sysAdmin"], actions: ["view", "add", "edit", "delete"] },
      {
        key: "sysRole",
        name: "角色管理",
        icon: "🎭",
        order: 3,
        roles: ["sysAdmin"],
        actions: ["view", "add", "edit", "delete"],
      },
      {
        key: "sysMenu",
        name: "菜单管理",
        icon: "🧭",
        order: 4,
        roles: ["sysAdmin"],
        actions: ["view", "add", "edit", "delete"],
      },
      {
        key: "sysDict",
        name: "数据字典",
        icon: "📚",
        order: 5,
        roles: ["sysAdmin"],
        actions: ["view", "add", "edit", "delete"],
      },
      {
        key: "sysLog",
        name: "日志与审计",
        icon: "📜",
        order: 6,
        roles: ["sysAdmin"],
        actions: ["view", "export"],
      }],
  },
};

/** 递归构建子菜单项（支持任意深度 subs），同时转发 actions 到 MENUS 运行时 */
function _buildSubsFromSeed(subsArr) {
  return (subsArr || []).map((ss, i) => {
    const node = {
      key: ss.key,
      name: ss.name,
      icon: ss.icon,
      order: ss.order || i + 1,
      type: ss.type || "internal",
      url: ss.url || "",
      subs: _buildSubsFromSeed(ss.subs),
    };
    // 种子里声明的 actions 转发到运行时节点（供菜单管理 + 权限配置使用）
    if (Array.isArray(ss.actions) && ss.actions.length > 0) {
      node.actions = ss.actions.slice();
    }
    return node;
  });
}

/** 把 DEFAULT_MODULES 转换成 MENUS 运行时结构（丢掉 roles 字段，保留 actions）
 *  支持三级 subs 递归生成 */
function _buildMenusFromSeed() {
  const out = {};
  for (const mk in DEFAULT_MODULES) {
    const s = DEFAULT_MODULES[mk];
    const node = {
      key: mk,
      name: s.name,
      icon: s.icon,
      order: s.order || 99,
      type: s.type || "internal",
      url: s.url || "",
      subs: _buildSubsFromSeed(s.subs),
    };
    // 模块级 actions（预留，当前主要在子项上声明）
    if (Array.isArray(s.actions) && s.actions.length > 0) {
      node.actions = s.actions.slice();
    }
    out[mk] = node;
  }
  return out;
}

/** 递归收集子菜单 roles 到 seedRoles 结构（支持任意深度） */
function _collectSubSeedRoles(subsArr, parentRoles) {
  const out = {};
  (subsArr || []).forEach((ss) => {
    const subRoles = ss.roles ? ss.roles.slice() : parentRoles.slice();
    out[ss.key] = { roles: subRoles };
    if (ss.subs && ss.subs.length) {
      // 真正的递归，支持任意层级
      out[ss.key].subs = _collectSubSeedRoles(ss.subs, subRoles);
    }
  });
  return out;
}

/** 把 DEFAULT_MODULES 的 roles 字段反填到 MENUS（只在首次初始化角色 perms 时用）
 *  返回结构：{ [modKey]: { roles: [...], subs: { [subKey]: { roles: [...], subs: { [ssKey]: { roles: [...] } } } } } } */
/** 递归给旧 MENUS 数据补齐 subs: [] 字段（三级结构迁移） */
function _migrateMenusSubs(menusObj) {
  for (const mk in menusObj) {
    const m = menusObj[mk];
    if (!Array.isArray(m.subs)) m.subs = [];
    m.subs.forEach((sub) => {
      if (!Array.isArray(sub.subs)) sub.subs = [];
    });
  }
}

/** 从 sessionStorage 加载菜单；无则以 DEFAULT_MODULES 初始化并写回 */
function loadMenus() {
  let stored = null;
  try {
    const raw = sessionStorage.getItem(MENU_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    /* 忽略存储异常 */
  }
  if (
    stored &&
    typeof stored === "object" &&
    !Array.isArray(stored) &&
    Object.keys(stored).length > 0
  ) {
    MENUS = stored;
    // 数据迁移：给旧 MENUS 中所有 sub 补齐 subs: [] 字段
    _migrateMenusSubs(MENUS);
    // 种子同步：把 DEFAULT_MODULES 中有但 MENUS 里缺失的 sub 自动注入
    _syncMenusMissingFromSeed();
  } else {
    MENUS = _buildMenusFromSeed();
  }
  saveMenus();
}

/** 递归对比 DEFAULT_MODULES 和 MENUS，把种子中新增的菜单项自动补进 MENUS
 *  场景：代码发布了新子菜单，但用户 sessionStorage 里还是旧 MENUS，导致看不到 */
function _syncMenusMissingFromSeed() {
  let changed = false;
  for (const mk in DEFAULT_MODULES) {
    const seedMod = DEFAULT_MODULES[mk];
    const menuMod = MENUS[mk];
    if (!menuMod) {
      // 整个模块缺失 → 从种子重建
      MENUS[mk] = _buildOneModuleFromSeed(seedMod);
      changed = true;
      continue;
    }
    changed |= _syncSubsMissing(menuMod.subs, seedMod.subs || []);
  }
  // 同时递归清理角色 perms：让新增菜单自动拥有默认权限
  if (changed) {
    rebuildAllPermsFromDefault();
  }
}

/** 递归同步某层 subs：把 seedSubs 中存在但 menuSubs 中缺失的项插入，
 *  同时同步已存在项的 order/name/icon/actions/subs 并重新排序数组。
 *  种子中已移除的 subs 节点也会被清理。
 *  返回值表示是否有变更 */
function _syncSubsMissing(menuSubs, seedSubs) {
  let changed = false;
  if (!Array.isArray(menuSubs)) return true;
  // 收集种子中所有 key（用于末尾清理多余项）
  const seedKeys = new Set(seedSubs.map((s) => s.key));
  seedSubs.forEach((seedSub) => {
    const existing = menuSubs.find((ms) => ms.key === seedSub.key);
    if (!existing) {
      // 缺失 → 按 order 找到正确位置插入
      const idx = menuSubs.findIndex((ms) => (ms.order || 999) > (seedSub.order || 999));
      if (idx === -1) menuSubs.push(_buildOneSubFromSeed(seedSub));
      else menuSubs.splice(idx, 0, _buildOneSubFromSeed(seedSub));
      changed = true;
    } else {
      // 已存在 → 同步 order/name/icon/actions 等元数据
      if (existing.order !== seedSub.order) { existing.order = seedSub.order; changed = true; }
      if (seedSub.name && existing.name !== seedSub.name) { existing.name = seedSub.name; changed = true; }
      if (seedSub.icon && existing.icon !== seedSub.icon) { existing.icon = seedSub.icon; changed = true; }
      if (Array.isArray(seedSub.actions)) {
        if (JSON.stringify(existing.actions) !== JSON.stringify(seedSub.actions)) {
          existing.actions = seedSub.actions.slice(); changed = true;
        }
      }
      // subs 同步：种子无 subs 时清空旧 subs；有 subs 时递归同步
      if (Array.isArray(seedSub.subs) && seedSub.subs.length > 0) {
        if (!Array.isArray(existing.subs)) existing.subs = [];
        changed |= _syncSubsMissing(existing.subs, seedSub.subs);
      } else if (existing.subs && existing.subs.length > 0) {
        // 种子已不再声明 subs → 清空运行时残留的子节点
        existing.subs = [];
        changed = true;
      }
    }
  });
  // 清理：运行时存在但种子中已移除的节点
  for (let i = menuSubs.length - 1; i >= 0; i--) {
    if (!seedKeys.has(menuSubs[i].key)) {
      menuSubs.splice(i, 1);
      changed = true;
    }
  }
  // 按 order 重新排序整个数组
  const orderChanged = menuSubs.slice().sort((a, b) => (a.order || 999) - (b.order || 999)).some((s, i) => menuSubs[i] !== s);
  if (orderChanged) {
    menuSubs.sort((a, b) => (a.order || 999) - (b.order || 999));
    changed = true;
  }
  return changed;
}

/** 从 DEFAULT_MODULES 的一个 sub seed 构建 MENUS 子项 */
function _buildOneSubFromSeed(seedSub) {
  const sub = {
    key: seedSub.key,
    name: seedSub.name,
    icon: seedSub.icon || "",
    order: seedSub.order || 99,
    actions: seedSub.actions ? seedSub.actions.slice() : ["view"],
  };
  if (seedSub.type) sub.type = seedSub.type;
  if (seedSub.url) sub.url = seedSub.url;
  if (Array.isArray(seedSub.subs) && seedSub.subs.length > 0) {
    sub.subs = seedSub.subs.map(_buildOneSubFromSeed);
  } else {
    sub.subs = [];
  }
  return sub;
}

/** 从 DEFAULT_MODULES 构建单个模块的 MENUS 条目 */
function _buildOneModuleFromSeed(seedMod) {
  return {
    name: seedMod.name,
    icon: seedMod.icon || "",
    order: seedMod.order || 99,
    subs: (seedMod.subs || []).map(_buildOneSubFromSeed),
  };
}

/** 重设所有角色 perms 为默认值（菜单变更后调用） */
function rebuildAllPermsFromDefault() {
  if (typeof ROLES !== "object" || ROLES === null) return;
  for (const rk in ROLES) {
    const r = ROLES[rk];
    if (rk === "sysAdmin") {
      r.perms = buildFullRolePerms();
    } else if (typeof buildDefaultRolePerms === "function") {
      r.perms = buildDefaultRolePerms(rk);
    }
  }
  try { document.dispatchEvent(new CustomEvent("permschange")); } catch (e) {}
}

/** 将当前菜单表写回 sessionStorage */
function saveMenus() {
  try {
    sessionStorage.setItem(MENU_KEY, JSON.stringify(MENUS));
  } catch (e) {
    /* 忽略 */
  }
}

/** 递归清理 perms.subs 中无效的三级 subs key */
function _cleanPermSubSubs(permsSubEntry, validSubSubKeys) {
  if (!permsSubEntry || typeof permsSubEntry !== "object") return permsSubEntry;
  if (permsSubEntry.subs) {
    for (const ssK in permsSubEntry.subs) {
      if (!validSubSubKeys.has(ssK)) {
        delete permsSubEntry.subs[ssK];
      }
    }
    if (Object.keys(permsSubEntry.subs).length === 0) {
      // 三级全空，降级回 true（表示该 subKey 本身有权限）
      return true;
    }
  }
  return permsSubEntry;
}

/** 同步所有角色的 perms：清理已删除的模块/子菜单/三级菜单 key，sysAdmin 始终全权限
 *  perms 结构：subs[sk] 可能是 true（该 subKey 直接授权）
 *              也可能是 { subs: { ssKey: true } }（三级授权对象） */
/** 递归清理某层 perms.subs 中的无效 key；支持任意层级嵌套
 *  @param {Object} permsSubs  perms 中某层的 subs 对象，形如 { key: true | { subs: {...} } }
 *  @param {Array}  menuSubs   对应层级的菜单节点数组（有效 key 集合来源） */
function _cleanupPermsSubs(permsSubs, menuSubs) {
  const validKeys = new Set((menuSubs || []).map((s) => s.key));
  for (const k in permsSubs) {
    if (!validKeys.has(k)) {
      delete permsSubs[k];
      continue;
    }
    const entry = permsSubs[k];
    const menuNode = (menuSubs || []).find((s) => s.key === k);
    const childSubs = (menuNode && menuNode.subs) || [];
    if (entry && typeof entry === "object") {
      let isLeafWithActions = false;
      if (entry.subs) {
        _cleanupPermsSubs(entry.subs, childSubs);
        if (Object.keys(entry.subs).length === 0 &&
            (!Array.isArray(entry.actions) || entry.actions.length === 0)) {
          delete permsSubs[k];
          continue;
        }
      } else if (Array.isArray(entry.actions) && entry.actions.length > 0) {
        isLeafWithActions = true;
      }
      // 既不是 true，也不是有效 object（无 subs 无 actions）→ 脏数据
      if (!isLeafWithActions && !(entry.subs && Object.keys(entry.subs).length > 0)) {
        delete permsSubs[k];
      }
    } else if (entry !== true) {
      delete permsSubs[k];
    }
  }
}

/** 当菜单结构变更时，清理所有角色 perms 中已不存在的模块/子菜单 key */
function syncPermsWithMenus() {
  for (const rk in ROLES) {
    const perms = ROLES[rk].perms;
    if (!perms) continue;
    const validModKeys = new Set(Object.keys(MENUS));
    for (const mk in perms) {
      if (!validModKeys.has(mk)) {
        delete perms[mk];
        continue;
      }
      const m = MENUS[mk];
      if (perms[mk].subs) {
        _cleanupPermsSubs(perms[mk].subs, m.subs || []);
      }
      const hasAnySub =
        perms[mk].subs && Object.keys(perms[mk].subs).length > 0;
      if (perms[mk].enabled !== true && !hasAnySub) {
        delete perms[mk];
      }
    }
  }
  if (ROLES.sysAdmin) ROLES.sysAdmin.perms = buildFullRolePerms();
  saveRoles();
}

/* ---------- 菜单 CRUD ---------- */

/** 校验 URL 是否合法（http/https/mailto/tel 开头） */
function _isValidUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^(https?:\/\/|mailto:|tel:|\/\/)/i.test(url.trim());
}

/** 新增模块
 *  @param {string} key    模块编码
 *  @param {string} name   模块名称
 *  @param {string} icon   图标
 *  @param {string} [type] "internal" 或 "external"，默认 "internal"
 *  @param {string} [url]  external 时必填的跳转链接
 *  @returns {boolean}
 */
function addMenuModule(key, name, icon, type, url, actions) {
  if (!key || !name) return false;
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,20}$/.test(key)) return false;
  if (MENUS[key]) return false;
  const t = type === "external" ? "external" : "internal";
  if (t === "external" && !_isValidUrl(url)) return false;
  const order = Object.keys(MENUS).length + 1;
  MENUS[key] = {
    key,
    name,
    icon: icon || "📦",
    order,
    type: t,
    url: t === "external" ? url.trim() : "",
    subs: [],
  };
  // 业务级 actions（可选）
  if (Array.isArray(actions) && actions.length > 0) {
    MENUS[key].actions = actions.slice();
  }
  saveMenus();
  syncPermsWithMenus();
  return true;
}

/** 更新模块（名称/图标/排序/类型/链接/actions） */
function updateMenuModule(key, patch) {
  if (!MENUS[key]) return false;
  if (patch.name !== undefined && patch.name.trim())
    MENUS[key].name = patch.name.trim();
  if (patch.icon !== undefined) MENUS[key].icon = patch.icon;
  if (patch.order !== undefined) MENUS[key].order = Number(patch.order) || 0;
  // 业务级 actions 更新
  if (patch.actions !== undefined) {
    if (Array.isArray(patch.actions) && patch.actions.length > 0) {
      MENUS[key].actions = patch.actions.slice();
    } else {
      delete MENUS[key].actions;
    }
  }
  if (patch.type !== undefined) {
    const t = patch.type === "external" ? "external" : "internal";
    if (t === "external") {
      if (!_isValidUrl(patch.url !== undefined ? patch.url : MENUS[key].url))
        return false;
      MENUS[key].type = "external";
      MENUS[key].url = (
        patch.url !== undefined ? patch.url : MENUS[key].url
      ).trim();
      // 外部模块不允许有子菜单（本身就是一个跳转入口）
      if (MENUS[key].subs && MENUS[key].subs.length > 0) {
        MENUS[key].subs = [];
        syncPermsWithMenus();
      }
    } else {
      MENUS[key].type = "internal";
      MENUS[key].url = "";
    }
  } else if (MENUS[key].type === "external" && patch.url !== undefined) {
    // 仅更新 url（已是 external）
    if (!_isValidUrl(patch.url)) return false;
    MENUS[key].url = patch.url.trim();
  }
  saveMenus();
  return true;
}

/** 删除模块；同步清理所有角色的 perms */
function deleteMenuModule(key) {
  if (!MENUS[key]) return false;
  delete MENUS[key];
  saveMenus();
  syncPermsWithMenus();
  return true;
}

/* ---------- 递归路径解析：通用菜单 CRUD 的核心 ---------- */

/** 按路径逐层解析，返回 { arr, node, parentNode }
 *  path 数组形式，path[0] 为模块 key，后续为每层 sub key
 *    path = ['dev']         → arr = MENUS.dev.subs，node = MENUS.dev
 *    path = ['dev', 'std']  → arr = MENUS.dev.subs.find('std').subs，node = 二级项
 *    path = ['dev', 'std', 'stdQuick'] → arr = 三级 subs，node = 二级项
 *  如果路径不存在返回 null */
function _resolveMenuPath(path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  let cur = MENUS[path[0]];
  if (!cur) return null;
  let parentNode = cur;
  for (let i = 1; i < path.length; i++) {
    const subs = cur.subs;
    if (!Array.isArray(subs)) return null;
    const found = subs.find((s) => s.key === path[i]);
    if (!found) return null;
    parentNode = cur;
    cur = found;
  }
  if (!Array.isArray(cur.subs)) cur.subs = [];
  return { arr: cur.subs, node: cur, parentNode };
}

/** 校验菜单 key 合法性（所有层级共用） */
function _validateMenuKey(key) {
  if (!key) return false;
  if (!/^[a-zA-Z0-9_-]{1,30}$/.test(key)) return false;
  return true;
}

/** 构造一个新菜单节点 payload（不含 subs 字段由调用方统一追加） */
function _buildMenuNode(key, name, icon, type, url, actions) {
  const t = type === "external" ? "external" : "internal";
  const node = {
    key,
    name,
    icon: icon || "📄",
    order: 0,
    type: t,
    url: t === "external" ? (url || "").trim() : "",
    subs: [],
  };
  // 业务级 actions
  if (Array.isArray(actions) && actions.length > 0) {
    node.actions = actions.slice();
  }
  return node;
}

/* ---------- 通用菜单 CRUD（支持任意深度嵌套） ---------- */

/** 通用新增：path 决定目标层级
 *  addMenu(['dev'], 'std', ...)           → 原 addMenuSub('dev', 'std', ...)
 *  addMenu(['dev', 'std'], 'stdQuick', ...) → 原 addMenuSubSub('dev', 'std', 'stdQuick', ...)
 *  addMenu(['a','b','c'], 'd', ...)       → 四级，未来扩展零成本 */
function addMenu(path, key, name, icon, type, url, actions) {
  const resolved = _resolveMenuPath(path);
  if (!resolved) return false;
  if (!_validateMenuKey(key)) return false;
  if (!name || !name.trim()) return false;
  if (resolved.arr.find((s) => s.key === key)) return false;
  const t = type === "external" ? "external" : "internal";
  if (t === "external" && !_isValidUrl(url)) return false;
  const node = _buildMenuNode(key, name.trim(), icon, type, url, actions);
  node.order = resolved.arr.length + 1;
  resolved.arr.push(node);
  saveMenus();
  syncPermsWithMenus();
  return true;
}

/** 通用更新：修改 path 下指定 key 的菜单项 */
function updateMenu(path, key, patch) {
  const resolved = _resolveMenuPath(path);
  if (!resolved) return false;
  const target = resolved.arr.find((s) => s.key === key);
  if (!target) return false;
  if (patch.name !== undefined && patch.name.trim())
    target.name = patch.name.trim();
  if (patch.icon !== undefined) target.icon = patch.icon;
  if (patch.order !== undefined) target.order = Number(patch.order) || 0;
  // 业务级 actions 更新
  if (patch.actions !== undefined) {
    if (Array.isArray(patch.actions) && patch.actions.length > 0) {
      target.actions = patch.actions.slice();
    } else {
      delete target.actions;
    }
  }
  if (patch.type !== undefined) {
    const t = patch.type === "external" ? "external" : "internal";
    if (t === "external") {
      if (!_isValidUrl(patch.url !== undefined ? patch.url : target.url))
        return false;
      target.type = "external";
      target.url = (patch.url !== undefined ? patch.url : target.url).trim();
    } else {
      target.type = "internal";
      target.url = "";
    }
  } else if (target.type === "external" && patch.url !== undefined) {
    if (!_isValidUrl(patch.url)) return false;
    target.url = patch.url.trim();
  }
  saveMenus();
  return true;
}

/** 通用删除：删除 path 下指定 key 的菜单项；同步清理所有角色 perms */
function deleteMenu(path, key) {
  const resolved = _resolveMenuPath(path);
  if (!resolved) return false;
  const idx = resolved.arr.findIndex((s) => s.key === key);
  if (idx === -1) return false;
  resolved.arr.splice(idx, 1);
  saveMenus();
  syncPermsWithMenus();
  return true;
}

/* ---------- 兼容旧 API 的包装函数（行为完全不变） ---------- */
function addMenuSub(parentKey, key, name, icon, type, url) {
  return addMenu([parentKey], key, name, icon, type, url);
}
function updateMenuSub(parentKey, key, patch) {
  return updateMenu([parentKey], key, patch);
}
function deleteMenuSub(parentKey, key) {
  return deleteMenu([parentKey], key);
}
function addMenuSubSub(modKey, subKey, key, name, icon, type, url) {
  return addMenu([modKey, subKey], key, name, icon, type, url);
}
function updateMenuSubSub(modKey, subKey, key, patch) {
  return updateMenu([modKey, subKey], key, patch);
}
function deleteMenuSubSub(modKey, subKey, key) {
  return deleteMenu([modKey, subKey], key);
}

/** 恢复菜单为默认；同步重建所有角色的 perms（稀疏存储） */
function resetMenus() {
  MENUS = _buildMenusFromSeed();
  saveMenus();
  for (const rk in ROLES) {
    ROLES[rk].perms = buildDefaultRolePerms(rk);
  }
  saveRoles();
}

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

/* ========== 角色持久化（sessionStorage） ========== */

/** 将 ROLES 当前内容序列化写入 sessionStorage */
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
    sessionStorage.setItem(ROLE_KEY, JSON.stringify(flat));
  } catch (e) {
    /* 忽略 */
  }
}

/** 从 sessionStorage 加载 ROLES；无则以 DEFAULT_ROLES + buildDefaultRolePerms 初始化 */
function loadRoles() {
  let flat = null;
  try {
    const raw = sessionStorage.getItem(ROLE_KEY);
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

/** 恢复所有角色的权限为默认值（保留角色本身，只重置 perms）
 *  - 遍历所有角色（内置 + 自定义），perms 统一重建为 buildDefaultRolePerms(key)
 *  - 内置角色从 DEFAULT_MODULES 种子推导默认授权，自定义角色不在种子里 → 空权限 {}
 *  - 触发 permschange 事件通知侧栏菜单刷新 */
function resetRoles() {
  for (const key in ROLES) {
    ROLES[key].perms = buildDefaultRolePerms(key);
  }
  saveRoles();
  document.dispatchEvent(new CustomEvent("permschange"));
}

/* ---------- 常量 ---------- */
const SESSION_KEY = "oa_session";
const ACCT_KEY = "oa_accounts";
const DEPT_KEY = "oa_depts";
const DEFAULT_PWD = "123456";

/* 过程资产模块 sessionStorage Key（持久化存储，关闭浏览器标签页即清除） */
const ASSET_SPEC_KEY = "oa_asset_spec";      // 开发规范
const ASSET_TPL_KEY = "oa_asset_tpl";        // 文档模板
const ASSET_DESIGN_KEY = "oa_asset_design";  // 设计规范
const ASSET_CHECK_KEY = "oa_asset_check";    // 评审 checklist

/* 演示账号与默认密码映射（原型演示用） */
const DEMO_PWD = {
  8001: "123456",
  admin: "admin123"
};

/* ---------- Mock 数据（集中管理，便于维护） ---------- */
const MOCK = {
  // 标准库最近上传
  stdRecent: [
    {
      no: "GB/T 6968-2026",
      name: "膜式燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-03-01",
    },
    {
      no: "GB/T 39841-2026",
      name: "超声波燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-04-01",
    }],
  // 标准检索结果
  stdSearchList: [
    {
      no: "GB/T 6968-2026",
      name: "膜式燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-03-01",
      btn: "预览/下载",
      btnCls: "",
    },
    {
      no: "GB/T 6968-2019",
      name: "膜式燃气表（已废止·2026版代替）",
      level: "国标",
      status: "已作废",
      statusCls: "danger",
      date: "2019-06-01",
      btn: "查看旧版",
      btnCls: "ghost",
    },
    {
      no: "GB/T 39841-2026",
      name: "超声波燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-04-01",
      btn: "预览/下载",
      btnCls: "",
    }],
  // 案例审核列表
  ecCases: [
    {
      t: "低功耗唤醒异常导致漏记",
      who: "王工 / 硬件",
      c: "硬件",
      st: "待初审",
      cls: "p2",
    },
    {
      t: "通讯模块死机分析",
      who: "赵工 / 软件",
      c: "软件",
      st: "部门审核中",
      cls: "p2",
    },
    {
      t: "燃气表外壳应力开裂",
      who: "陈工 / 结构",
      c: "结构",
      st: "副总工审批中",
      cls: "p2",
    },
    {
      t: "密封性试验夹具优化",
      who: "李工 / 测试",
      c: "测试",
      st: "已退回",
      cls: "p3",
    }],
  sysLogs: [
    { time: "2026-10-04 09:12:35", who: "admin", type: "登录", typeCls: "ok", action: "用户登录系统", target: "IP 192.168.1.100" },
    { time: "2026-10-04 09:08:17", who: "赵主任", type: "业务", typeCls: "", action: "审核年终绩效考核表", target: "刘工（8006）· 2026 年度" },
    { time: "2026-10-04 08:55:42", who: "周主管", type: "业务", typeCls: "", action: "提交主管打分", target: "张工（8001）· 2026-09 月度" },
    { time: "2026-10-03 17:30:11", who: "刘工", type: "业务", typeCls: "", action: "导入月度计划任务", target: "2026-10 月度计划 · 12 条" },
    { time: "2026-10-03 15:22:08", who: "admin", type: "安全", typeCls: "warn", action: "修改用户密码", target: "账号 8005（周主管）" },
    { time: "2026-10-03 14:05:33", who: "陈工", type: "业务", typeCls: "", action: "上传标准文件", target: "GB/T 39841-2026.pdf" },
    { time: "2026-10-02 16:48:20", who: "赵主任", type: "业务", typeCls: "", action: "配置互评人", target: "刘工 → 互评人：周主管、陈工" },
    { time: "2026-10-02 10:15:59", who: "admin", type: "系统", typeCls: "info", action: "更新考核表单模板", target: "pa_tpl_yearly_peer_v1 · v1→v2" },
    { time: "2026-10-01 20:33:41", who: "李工", type: "登录", typeCls: "ok", action: "用户登录系统", target: "IP 10.0.0.55" },
    { time: "2026-09-30 11:27:16", who: "系统", type: "系统", typeCls: "info", action: "自动归档月度考核结果", target: "2026-09 · 7 人已归档" },
  ],
};

/* 默认账号（用于初始化 sessionStorage） */
const DEFAULT_ACCOUNTS = [
  { id: "8001", n: "张工", key: "staff", deptId: "YJSJZ", phone: "13800008001", st: "启用", pwd: DEFAULT_PWD },
  { id: "8004", n: "刘工", key: "projManager", deptId: "CPGLZ", phone: "13800008004", st: "启用", pwd: DEFAULT_PWD },
  { id: "8005", n: "周主管", key: "supervisor", deptId: "GCYJYJZX", phone: "13800008005", st: "启用", pwd: DEFAULT_PWD },
  { id: "8006", n: "赵主任", key: "deptLeader", deptId: "QWYB", phone: "13800008006", st: "启用", pwd: DEFAULT_PWD },
  { id: "8010", n: "陈工", key: "staff", deptId: "PTJRZ", phone: "13800008010", st: "启用", pwd: DEFAULT_PWD },
  { id: "8011", n: "孙主管", key: "supervisor", deptId: "YJSJZ", phone: "13800008011", st: "启用", pwd: DEFAULT_PWD },
  { id: "8012", n: "吴主管", key: "supervisor", deptId: "PTJRZ", phone: "13800008012", st: "启用", pwd: DEFAULT_PWD },
  { id: "8013", n: "郑工", key: "projManager", deptId: "CSZ", phone: "13800008013", st: "启用", pwd: DEFAULT_PWD },
  { id: "8014", n: "钱工", key: "projManager", deptId: "GGSJZ", phone: "13800008014", st: "启用", pwd: DEFAULT_PWD },
  { id: "admin", n: "系统管理员", key: "sysAdmin", deptId: "QWYB", phone: "13800000000", st: "启用", pwd: "admin123" }
];

/** 从 sessionStorage 加载账号；无则以 DEFAULT_ACCOUNTS 初始化并写回 */
function loadAccounts() {
  let stored = null;
  try {
    const raw = sessionStorage.getItem(ACCT_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    /* 忽略存储异常 */
  }
  if (Array.isArray(stored) && stored.length > 0) {
    ACCOUNTS = stored;
  } else {
    ACCOUNTS = [];
  }
  // 完整性校验：确保 DEFAULT_ACCOUNTS 中的账号都存在，且字段（如 deptId、phone）跟随默认补齐
  DEFAULT_ACCOUNTS.forEach((da) => {
    const existing = ACCOUNTS.find((a) => a.id === da.id);
    if (!existing) {
      ACCOUNTS.push({ ...da });
    } else {
      // 向后兼容：旧账号缺少字段时，从默认数据补齐
      if (existing.deptId === undefined) existing.deptId = da.deptId || "";
      if (existing.phone === undefined) existing.phone = da.phone || "";
    }
  });
  saveAccounts();
}

/** 将当前账号列表写回 sessionStorage */
function saveAccounts() {
  try {
    sessionStorage.setItem(ACCT_KEY, JSON.stringify(ACCOUNTS));
  } catch (e) {
    // 忽略
  }
}

/** 按账号 ID 查找 */
function findAccount(id) {
  return ACCOUNTS.find((a) => a.id === id);
}

/** 新增账号——成功返回新账号对象，失败返回 null */
function addAccount(id, n, key, deptId = "", phone = "") {
  if (!id || !n || !key || !ROLES[key]) return null;
  if (findAccount(id)) return null;
  const acct = { id, n, key, deptId: deptId || "", phone: phone || "", st: "启用", pwd: DEFAULT_PWD };
  ACCOUNTS.push(acct);
  saveAccounts();
  return acct;
}

/** 更新账号字段——允许修改 key（角色）、st（状态）、n（姓名）、deptId（部门小组）、phone（手机号码） */
function updateAccount(id, patch) {
  const a = findAccount(id);
  if (!a) return false;
  if (patch.n !== undefined) a.n = patch.n;
  if (patch.key !== undefined && ROLES[patch.key]) a.key = patch.key;
  if (patch.st !== undefined && (patch.st === "启用" || patch.st === "停用"))
    a.st = patch.st;
  if (patch.deptId !== undefined) a.deptId = patch.deptId;
  if (patch.phone !== undefined) a.phone = patch.phone;
  saveAccounts();
  return true;
}

/** 切换账号启用/停用状态 */
function toggleAccount(id) {
  const a = findAccount(id);
  if (!a) return null;
  a.st = a.st === "启用" ? "停用" : "启用";
  saveAccounts();
  return a;
}

/** 重置账号密码 */
function resetAccountPwd(id) {
  const a = findAccount(id);
  if (!a) return null;
  a.pwd = DEFAULT_PWD;
  saveAccounts();
  return a;
}

/** 删除账号（内置管理员 admin 不允许删除） */
function deleteAccount(id) {
  if (id === "admin") return false;
  const i = ACCOUNTS.findIndex((a) => a.id === id);
  if (i === -1) return false;
  ACCOUNTS.splice(i, 1);
  saveAccounts();
  return true;
}

/** 恢复账号为默认列表 */
function resetAccounts() {
  ACCOUNTS = DEFAULT_ACCOUNTS.map((a) => ({ ...a }));
  saveAccounts();
}


/* ========== 部门管理（持久化到 sessionStorage） ========== */

/* 运行时部门列表 */
let DEPTS = null;

/* 默认部门（固定一个顶层：前卫表业） */
const DEFAULT_DEPTS = [
  { id: "QWYB", name: "前卫表业", parentId: "", sort: 1 },
  // 二级
  { id: "GCYJYJZX", name: "工程技术研究中心", parentId: "QWYB", sort: 1 },
  { id: "GYSBZX", name: "工艺设备中心", parentId: "QWYB", sort: 2 },
  // 三级：工程技术研究中心
  { id: "YJSJZ", name: "硬件设计组", parentId: "GCYJYJZX", sort: 1 },
  { id: "GGSJZ", name: "结构设计组", parentId: "GCYJYJZX", sort: 2 },
  { id: "XTJRZ", name: "系统软件组", parentId: "GCYJYJZX", sort: 3 },
  { id: "PTJRZ", name: "平台软件组", parentId: "GCYJYJZX", sort: 4 },
  { id: "CPGLZ", name: "产品管理组", parentId: "GCYJYJZX", sort: 5 },
  { id: "CSZ", name: "测试组", parentId: "GCYJYJZX", sort: 6 },
  // 四级：平台软件组
  { id: "QDJZ", name: "前端组", parentId: "PTJRZ", sort: 1 },
  { id: "HDJZ", name: "后端组", parentId: "PTJRZ", sort: 2 },
  { id: "CESZ", name: "测试组", parentId: "PTJRZ", sort: 3 },
  { id: "CPZ", name: "产品组", parentId: "PTJRZ", sort: 4 },
  { id: "SJZ", name: "设计组", parentId: "PTJRZ", sort: 5 },
  { id: "AZZ", name: "安卓组", parentId: "PTJRZ", sort: 6 }];

/** 加载部门列表（保证顶层有且仅有前卫表业） */
function loadDepts() {
  DEPTS = _loadArr(DEPT_KEY, DEFAULT_DEPTS);
  // 兼容旧数据：如果顶层没有 QWYB，则按默认重建
  if (!DEPTS.find(d => d.id === "QWYB" && !d.parentId)) {
    DEPTS = DEFAULT_DEPTS.map((d) => ({ ...d }));
  }
  saveDepts();
}
/** 保存部门列表 */
function saveDepts() { _save(DEPT_KEY, DEPTS); }

/** 按 ID 查找部门 */
function findDept(id) { return DEPTS.find((d) => d.id === id); }

/** 新增部门 */
function addDept(id, name, parentId) {
  if (!id || !name) return null;
  if (findDept(id)) return null;
  const sort = DEPTS.length + 1;
  const d = { id: id.trim(), name: name.trim(), parentId: parentId || "", sort };
  DEPTS.push(d);
  saveDepts();
  return d;
}

/** 更新部门（name / parentId / sort） */
function updateDept(id, patch) {
  const d = findDept(id);
  if (!d) return false;
  if (patch.name !== undefined) d.name = patch.name;
  if (patch.parentId !== undefined) d.parentId = patch.parentId;
  if (patch.sort !== undefined) d.sort = patch.sort;
  saveDepts();
  return true;
}

/** 递归收集某部门下所有子部门 ID（含自身） */
function _collectDeptSubtree(rootId) {
  const ids = [rootId];
  const walk = (pid) => {
    DEPTS.filter(d => d.parentId === pid).forEach(c => { ids.push(c.id); walk(c.id); });
  };
  walk(rootId);
  return ids;
}

/** 删除部门（有子部门的不允许删） */
function deleteDept(id) {
  const hasChild = DEPTS.some((d) => d.parentId === id);
  if (hasChild) return false;
  const i = DEPTS.findIndex((d) => d.id === id);
  if (i === -1) return false;
  DEPTS.splice(i, 1);
  saveDepts();
  return true;
}

/** 恢复默认部门 */
function resetDepts() {
  DEPTS = DEFAULT_DEPTS.map((d) => ({ ...d }));
  saveDepts();
}


/** 根据部门名称生成拼音首字母编码（跨模块复用） */
window._pinyinInitials = function _pinyinInitials(name) {
  if (!name) return "";
  // 常用拼音首字母表（覆盖部门常见汉字）
  const MAP = {
    "前": "Q", "卫": "W", "表": "B", "业": "Y",
    "工": "G", "程": "C", "技": "J", "术": "S", "研": "Y", "究": "J", "中": "Z", "心": "X",
    "艺": "Y", "设": "S", "备": "B", "设": "S",
    "硬": "Y", "件": "J", "计": "J", "组": "Z",
    "结": "J", "构": "G",
    "系": "X", "统": "T", "软": "R",
    "平": "P", "台": "T",
    "产": "C", "品": "P", "管": "G", "理": "L",
    "测": "C", "试": "S",
    "部": "B", "室": "S", "科": "K", "处": "C", "厅": "T",
    "人": "R", "力": "L", "资": "Z", "源": "Y", "行": "X", "政": "Z", "财": "C", "务": "W",
    "市": "S", "场": "C", "销": "X", "售": "S", "客": "K", "服": "F",
    "数": "S", "据": "J", "信": "X", "息": "X", "安": "A", "全": "Q",
    "法": "F", "律": "L", "审": "S", "核": "H", "监": "J", "督": "D",
    "生": "S", "产": "C", "物": "W", "流": "L", "采": "C", "购": "G",
    "项": "X", "目": "M", "工": "G", "程": "C", "质": "Z", "量": "L",
    "文": "W", "档": "D", "档": "D", "案": "A", "管": "G", "理": "L",
    "基": "J", "础": "C", "设": "S", "施": "S", "研": "Y", "发": "F",
    "创": "C", "新": "X", "孵": "F", "化": "H", "投": "T", "资": "Z",
    "战": "Z", "略": "L", "合": "H", "规": "G", "划": "H",
  };
  return String(name).split("").map((ch) => MAP[ch] || ch.toUpperCase()).join("");
};
/* ---------- 通用持久化辅助（供 PA / 标准库 / 资产 子模块共用） ---------- */
function _loadArr(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v) && v.length > 0) return v;
    }
  } catch (e) {}
  return fallback.map((x) => ({ ...x }));
}
/** 通用：写入 sessionStorage */
function _save(key, val) {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* VIEWS 映射表——由 views.js 在加载时填充 */
const VIEWS = {};

/* ---------- 面包屑：从 MENUS 动态生成 ---------- */
/** 根据菜单 key 查找对应的模块名 + 子菜单名 + 三级子菜单名
 *  返回 { modKey, modName, subKey, subName, subSubKey, subSubName } */
/** 递归在 MENUS 全树中查找某个 key 对应的菜单项
 *  @param {string} key  要查找的菜单 key（任意层级）
 *  @returns {{ path: string[], node: Object } | null}
 *    path 为从模块开始逐层的 key 数组，如 ['dev', 'std', 'stdQuick']
 *    node 为实际的菜单节点对象 */
function findMenuByKey(key) {
  for (const mk in MENUS) {
    if (mk === key) return { path: [mk], node: MENUS[mk] };
    const found = _findInSubs(MENUS[mk].subs || [], [mk], key);
    if (found) return found;
  }
  return null;
}

/** 在某个 subs 数组下递归查找
 *  @param {Array} subsArr   当前层 subs 数组
 *  @param {Array} pathSoFar 到当前层为止的路径
 *  @param {string} targetKey 目标 key */
function _findInSubs(subsArr, pathSoFar, targetKey) {
  for (const s of subsArr) {
    if (s.key === targetKey) return { path: [...pathSoFar, s.key], node: s };
    const childFound = _findInSubs(
      s.subs || [],
      [...pathSoFar, s.key],
      targetKey,
    );
    if (childFound) return childFound;
  }
  return null;
}

/** 按路径逐层查找菜单节点；path 为空或无效返回 null
 *  如 path=['dev'] 返回 MENUS.dev
 *  如 path=['dev','std'] 返回 MENUS.dev.subs.find('std') */
function findMenuByPath(...path) {
  if (!path || path.length === 0) return null;
  let cur = MENUS[path[0]];
  if (!cur) return null;
  for (let i = 1; i < path.length; i++) {
    cur = (cur.subs || []).find((s) => s.key === path[i]);
    if (!cur) return null;
  }
  return cur;
}

/** 兼容旧 API：按 subKey（可选 subSubKey）查找面包屑信息
 *  内部委托给 findMenuByKey，支持任意深度（不仅三级） */
function findMenuBySubKey(subKey, subSubKey) {
  if (subSubKey) {
    // 同时指定 → 精确路径
    const modNode = MENUS[subKey];
    if (modNode) {
      const subNode = (modNode.subs || []).find((s) => s.key === subSubKey);
      if (subNode)
        return {
          modKey: subKey,
          modName: modNode.name,
          subKey: subSubKey,
          subName: subNode.name,
          subSubKey: null,
          subSubName: null,
        };
      // subSubKey 其实是三级 → 再递归一层
      for (const s of modNode.subs || []) {
        const ss = (s.subs || []).find((x) => x.key === subSubKey);
        if (ss)
          return {
            modKey: subKey,
            modName: modNode.name,
            subKey: s.key,
            subName: s.name,
            subSubKey: ss.key,
            subSubName: ss.name,
          };
      }
    }
  }
  // 只传 subKey → 全树查找
  const hit = findMenuByKey(subKey);
  if (!hit) return null;
  const { path, node } = hit;
  const modNode = MENUS[path[0]];
  if (path.length === 1)
    return {
      modKey: path[0],
      modName: modNode.name,
      subKey: null,
      subName: null,
      subSubKey: null,
      subSubName: null,
    };
  if (path.length === 2)
    return {
      modKey: path[0],
      modName: modNode.name,
      subKey: path[1],
      subName: node.name,
      subSubKey: null,
      subSubName: null,
    };
  // path.length >= 3 → 三级或更深
  const parentSub = (modNode.subs || []).find((s) => s.key === path[1]);
  return {
    modKey: path[0],
    modName: modNode.name,
    subKey: path[1],
    subName: parentSub ? parentSub.name : "",
    subSubKey: path.slice(2).join("."),
    subSubName: node.name,
  };
}

/* ---------- 菜单管理函数挂载到 window ---------- */
window.loadMenus = loadMenus;
window.saveMenus = saveMenus;
window.addMenuModule = addMenuModule;
window.updateMenuModule = updateMenuModule;
window.deleteMenuModule = deleteMenuModule;
window.addMenu = addMenu;
window.updateMenu = updateMenu;
window.deleteMenu = deleteMenu;
window.addMenuSub = addMenuSub;
window.updateMenuSub = updateMenuSub;
window.deleteMenuSub = deleteMenuSub;
window.resetMenus = resetMenus;
window.syncPermsWithMenus = syncPermsWithMenus;
window.findMenuBySubKey = findMenuBySubKey;
window.addMenuSubSub = addMenuSubSub;
window.updateMenuSubSub = updateMenuSubSub;
window.deleteMenuSubSub = deleteMenuSubSub;

/* ---------- 账号管理函数挂载到 window ---------- */
window.loadAccounts = loadAccounts;
window.findAccount = findAccount;
window.getAccounts = () => ACCOUNTS;
window.addAccount = addAccount;
window.updateAccount = updateAccount;
window.toggleAccount = toggleAccount;
window.resetAccountPwd = resetAccountPwd;
window.deleteAccount = deleteAccount;
window.resetAccounts = resetAccounts;

/* ---------- 部门管理函数挂载到 window ---------- */
window.loadDepts = loadDepts;
window.findDept = findDept;
window.getDepts = () => DEPTS;
window.addDept = addDept;
window.updateDept = updateDept;
window.deleteDept = deleteDept;
window.resetDepts = resetDepts;
// 用 getter 保证每次访问取最新值（DEPTS 在 loadDepts 后才被赋值）
Object.defineProperty(window, "DEPTS", {
  get() { return DEPTS; },
  set(v) { DEPTS = v; },
  configurable: true,
});

/* ---------- 角色管理函数挂载到 window ---------- */
window.loadRoles = loadRoles;
window.findRole = findRole;
window.addRole = addRole;
window.updateRole = updateRole;
window.deleteRole = deleteRole;
window.resetRoles = resetRoles;
window.buildDefaultRolePerms = buildDefaultRolePerms;
window.buildFullRolePerms = buildFullRolePerms;

window.ROLES = ROLES;
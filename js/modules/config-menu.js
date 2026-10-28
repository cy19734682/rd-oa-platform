/* ========== 研发OA综合平台 · 菜单管理（config-menu.js） ========== */
/* 拆分自原 config.js。包含：
 *   - 动态菜单表（MENUS，支持任意深度 subs）与 MODULES 兼容代理
 *   - 默认菜单种子（DEFAULT_MODULES）及种子同步 / 数据迁移
 *   - 菜单 CRUD（模块级 + 通用递归 addMenu/updateMenu/deleteMenu + 兼容包装）
 *   - perms 与菜单结构同步清理（syncPermsWithMenus）
 *   - 面包屑查找（findMenuByKey / findMenuByPath / findMenuBySubKey） */


/* ---------- 动态菜单表（持久化到 localStorage，支持任意深度递归） ---------- */
/*
 * MENUS 是运行时菜单表，由 loadMenus() 从 localStorage 加载，首次启动从 DEFAULT_MODULES 种子生成。
 * 结构：{ [modKey]: { key, name, icon, order, subs: [
 *   { key, name, icon, order, type, url, subs: [...] }
 * ]}}
 */
const MENU_KEY = "oa_menus";
/* 种子指纹：DEFAULT_MODULES 的内容哈希。
 * 持久化语义：localStorage 里的 MENUS 是唯一事实源——用户在菜单管理中的
 * 增/删/改刷新后必须保留。只有当代码里的种子相对上次加载发生过变更
 * （发版改了 DEFAULT_MODULES）时，才执行一次种子同步（注入新增项 /
 * 清理移除项）并刷新指纹。若每次加载都无条件同步，会把用户删掉的菜单
 * 当「缺失项」重新灌回来，也会覆盖用户的改名/排序。 */
const MENU_SEED_HASH_KEY = "oa_menu_seed_hash";
/* 删除墓碑：用户删掉的种子菜单 key。种子变更同步时不重新注入这些 key，
 * 保证「删除」在后续发版后依然生效。 */
const MENU_DELETED_KEYS_KEY = "oa_menu_deleted_keys";
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
        key: "pdr",
        name: "研发设计评审",
        icon: "📋",
        order: 1,
        actions: ["view", "export"],
      },
      {
        key: "psr",
        name: "项目阶段评审",
        icon: "🚦",
        order: 2,
        actions: ["view", "export"],
      }],
  },
  dev: {
    name: "研发公共",
    icon: "🔬",
    order: 3,
    subs: [
      { key: "stdHome", name: "标准库", icon: "📚", order: 1, actions: ["view", "export", "add", "edit", "delete"] },
      { key: "ec", name: "经验案例库", icon: "💡", order: 2, actions: ["view", "add", "edit", "delete", "export", "admin"] }],
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
        name: "评审 Checklist",
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
      {
        key: "paYearlyMgmt",
        name: "年度绩效管理",
        icon: "📊",
        order: 4,
        subs: [
          { key: "paTableYearly", name: "年度绩效考核", icon: "🎯", order: 1, actions: ["view", "edit"] },
          { key: "paPeerMgmt", name: "互评管理", icon: "👥", order: 2, actions: ["view", "edit"] },
          { key: "paPeerReview", name: "我的互评任务", icon: "✍️", order: 3, actions: ["view"] },
          { key: "paYearly", name: "年终考核汇总", icon: "🏆", order: 4, actions: ["view", "edit"] },
        ],
      },
      { key: "paResult", name: "结果查询 / 检索", icon: "🔎", order: 5, actions: ["view", "export"] }],
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
      },
      {
        key: "sysNotice",
        name: "通知公告",
        icon: "📢",
        order: 7,
        roles: ["sysAdmin"],
        actions: ["view", "add", "edit", "delete"],
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

/** 从 localStorage 加载菜单；无则以 DEFAULT_MODULES 初始化并写回 */
function loadMenus() {
  let stored = null;
  try {
    const raw = localStorage.getItem(MENU_KEY);
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
    // 数据迁移：给旧 MENUS 中所有 sub 补齐 subs: [] 字段（幂等，每次加载都执行）
    _migrateMenusSubs(MENUS);
    // 种子同步：仅当种子相对上次加载变更过才执行（见 _syncSeedIfChanged）
    _syncSeedIfChanged();
  } else {
    MENUS = _buildMenusFromSeed();
    _writeSeedHash(_seedHash());
  }
  saveMenus();
}

/* ---------- 种子指纹与删除墓碑 ---------- */

/** 计算 DEFAULT_MODULES 的内容指纹（FNV-1a 32bit 十六进制） */
function _seedHash() {
  const s = JSON.stringify(DEFAULT_MODULES);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
function _readSeedHash() {
  try {
    return localStorage.getItem(MENU_SEED_HASH_KEY);
  } catch (e) {
    return null;
  }
}
function _writeSeedHash(h) {
  try {
    localStorage.setItem(MENU_SEED_HASH_KEY, h);
  } catch (e) {
    /* 存储异常时静默：下次加载会再同步一次（同步本身幂等） */
  }
}
/** 种子变更时同步一次；无变更则什么都不做（完全尊重用户的运行时增删改） */
function _syncSeedIfChanged() {
  const cur = _seedHash();
  const prev = _readSeedHash();
  if (prev === cur) return;
  _syncMenusMissingFromSeed();
  _writeSeedHash(cur);
}

/** 读取删除墓碑集合 */
function _readTombstones() {
  try {
    const arr = JSON.parse(localStorage.getItem(MENU_DELETED_KEYS_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}
function _writeTombstones(set) {
  try {
    localStorage.setItem(MENU_DELETED_KEYS_KEY, JSON.stringify([...set]));
  } catch (e) {
    /* 忽略存储异常 */
  }
}
/** 删除种子中存在的菜单 key 时记墓碑，防止后续发版同步把它灌回来 */
function _tombstoneKey(key) {
  if (!key || !_seedHasKey(key)) return;
  const set = _readTombstones();
  if (set.has(key)) return;
  set.add(key);
  _writeTombstones(set);
}
/** 递归判断 key 是否存在于 DEFAULT_MODULES（模块 key 或任意层级 sub key） */
function _seedHasKey(key) {
  if (!key) return false;
  if (Object.prototype.hasOwnProperty.call(DEFAULT_MODULES, key)) return true;
  const inSubs = (subs) => (subs || []).some((s) => s.key === key || inSubs(s.subs));
  for (const mk in DEFAULT_MODULES) {
    if (inSubs(DEFAULT_MODULES[mk].subs)) return true;
  }
  return false;
}

/** 递归对比 DEFAULT_MODULES 和 MENUS，把种子中新增的菜单项自动补进 MENUS
 *  场景：代码发布了新子菜单，但用户 localStorage 里还是旧 MENUS，导致看不到
 *  仅在种子指纹变更（发版）后由 _syncSeedIfChanged 调用一次；
 *  用户删除过的 key（墓碑）不注入，用户自建的 custom 节点不清理，
 *  用户改过的节点（edited）不被种子元数据覆盖。 */
function _syncMenusMissingFromSeed() {
  let changed = false;
  const tomb = _readTombstones();
  for (const mk in DEFAULT_MODULES) {
    const seedMod = DEFAULT_MODULES[mk];
    const menuMod = MENUS[mk];
    if (!menuMod) {
      // 整个模块缺失 → 从种子重建（用户删过的模块记了墓碑，不重建）
      if (tomb.has(mk)) continue;
      MENUS[mk] = _buildOneModuleFromSeed(seedMod);
      changed = true;
      continue;
    }
    changed |= _syncSubsMissing(menuMod.subs, seedMod.subs || [], tomb);
  }
  // 同时递归清理角色 perms：让新增菜单自动拥有默认权限
  if (changed) {
    rebuildAllPermsFromDefault();
  }
}

/** 递归同步某层 subs：把 seedSubs 中存在但 menuSubs 中缺失的项插入，
 *  同时同步已存在项的 order/name/icon/actions/subs 并重新排序数组。
 *  种子中已移除的 subs 节点也会被清理（用户自建的 custom 节点除外）。
 *  墓碑中的 key（用户删过的种子菜单）不重新注入。
 *  返回值表示是否有变更 */
function _syncSubsMissing(menuSubs, seedSubs, tomb) {
  let changed = false;
  if (!Array.isArray(menuSubs)) return true;
  // 删除墓碑：用户主动删掉的种子菜单，后续同步不注入
  const dead = tomb || new Set();
  // 收集种子中所有 key（用于末尾清理多余项）
  const seedKeys = new Set(seedSubs.map((s) => s.key));
  seedSubs.forEach((seedSub) => {
    if (dead.has(seedSub.key)) return;
    const existing = menuSubs.find((ms) => ms.key === seedSub.key);
    if (!existing) {
      // 缺失 → 按 order 找到正确位置插入
      const idx = menuSubs.findIndex((ms) => (ms.order || 999) > (seedSub.order || 999));
      if (idx === -1) menuSubs.push(_buildOneSubFromSeed(seedSub));
      else menuSubs.splice(idx, 0, _buildOneSubFromSeed(seedSub));
      changed = true;
    } else {
      // 已存在 → 同步 order/name/icon/actions 等元数据
      // （用户在菜单管理里改过的节点不覆盖，否则刷新后改名/排序会被种子恢复）
      if (!existing.edited) {
        if (existing.order !== seedSub.order) { existing.order = seedSub.order; changed = true; }
        if (seedSub.name && existing.name !== seedSub.name) { existing.name = seedSub.name; changed = true; }
        if (seedSub.icon && existing.icon !== seedSub.icon) { existing.icon = seedSub.icon; changed = true; }
        if (Array.isArray(seedSub.actions)) {
          if (JSON.stringify(existing.actions) !== JSON.stringify(seedSub.actions)) {
            existing.actions = seedSub.actions.slice(); changed = true;
          }
        }
      }
      // subs 同步：种子无 subs 时清空旧 subs；有 subs 时递归同步
      if (Array.isArray(seedSub.subs) && seedSub.subs.length > 0) {
        if (!Array.isArray(existing.subs)) existing.subs = [];
        changed |= _syncSubsMissing(existing.subs, seedSub.subs, dead);
      } else if (Array.isArray(existing.subs) && existing.subs.length > 0) {
        // 种子已不再声明 subs → 清理运行时残留的子节点（保留用户自建的 custom 节点）
        changed |= _syncSubsMissing(existing.subs, [], dead);
      }
    }
  });
  // 清理：运行时存在但种子中已移除的节点（用户自建的 custom 节点除外）
  for (let i = menuSubs.length - 1; i >= 0; i--) {
    if (!seedKeys.has(menuSubs[i].key) && !menuSubs[i].custom) {
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

/** 将当前菜单表写回 localStorage */
function saveMenus() {
  try {
    localStorage.setItem(MENU_KEY, JSON.stringify(MENUS));
  } catch (e) {
    /* 忽略 */
  }
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
    // 用户自建模块：种子同步的清理逻辑不删除该节点
    custom: true,
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
  // 标记为用户改过：种子变更同步时不覆盖用户的名称/图标/排序等修改
  MENUS[key].edited = true;
  saveMenus();
  return true;
}

/** 删除模块；同步清理所有角色的 perms */
function deleteMenuModule(key) {
  if (!MENUS[key]) return false;
  delete MENUS[key];
  // 删除的是种子模块 → 记墓碑，防止后续发版种子同步重建
  _tombstoneKey(key);
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
    // 用户自建菜单：种子同步的清理逻辑不删除该节点
    custom: true,
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
  // 标记为用户改过：种子变更同步时不覆盖用户的名称/图标/排序等修改
  target.edited = true;
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
  // 删除的是种子菜单 → 记墓碑，防止后续发版种子同步重新注入
  _tombstoneKey(key);
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
window.syncPermsWithMenus = syncPermsWithMenus;
window.findMenuBySubKey = findMenuBySubKey;
window.addMenuSubSub = addMenuSubSub;
window.updateMenuSubSub = updateMenuSubSub;
window.deleteMenuSubSub = deleteMenuSubSub;

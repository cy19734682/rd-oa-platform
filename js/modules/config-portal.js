/* ========== 主系统门户 · 子系统入口配置 · config-portal.js ==========
 * 职责：定义主系统门户展示的「子系统卡片」种子（内部子系统 + 外部系统），
 *   支持 localStorage 持久化（门户配置由「菜单管理 → 门户配置」维护）。
 * 数据模型：
 *   { key, name, icon, kind: "internal"|"external", mod?, url?, enabled, status, order, roles, desc, theme? }
 *     kind=internal：点击进入子系统壳（mod 指向 MODULES 中的板块 key）
 *     kind=external：点击新窗口打开第三方系统（url）
 *     enabled=false：已下架，门户不再展示（可在「菜单管理 → 门户配置」重新上架）
 *     roles 为空数组 = 全角色可见；否则仅列出角色可见
 *     status: "active" 正常 / "maintenance" 维护中
 *     theme（仅内部卡）：主题配色——PORTAL_THEMES 预设 key 或自定义 #RRGGBB，
 *       主系统首页卡片与对应子系统窗口 chrome 均跟随该配色；缺省回落 MODULE_THEME 默认色
 * 本文件必须在 config-menu.js 之后加载（运行时依赖 MODULES）。
 */

const PORTAL_KEY = "oa_portal";

/* ---------- 门户主题配色预设（内部系统卡片 + 子系统窗口 chrome 共用） ----------
 * base  主色（按钮 / 图标 / 链接）；dark 深色（顶栏 / 标题竖线 / hover 加深）；
 * bg    浅底色（磁贴悬停投影 / 选中底），与 base 同色系 6% ~ 8% 浓度 */
const PORTAL_THEMES = [
  { key: "blue",     name: "商务蓝",   base: "#1677ff", dark: "#0958d9", bg: "#e6f4ff" },
  { key: "green",    name: "生机绿",   base: "#52c41a", dark: "#389e0d", bg: "#f6ffed" },
  { key: "cyan",     name: "科技青",   base: "#13c2c2", dark: "#08979c", bg: "#e6fffb" },
  { key: "purple",   name: "典雅紫",   base: "#722ed1", dark: "#531dab", bg: "#f9f0ff" },
  { key: "orange",   name: "活力橙",   base: "#fa8c16", dark: "#d46b08", bg: "#fff7e6" },
  { key: "magenta",  name: "品红",     base: "#eb2f96", dark: "#c41d7f", bg: "#fff0f6" },
  { key: "red",      name: "中国红",   base: "#f5222d", dark: "#cf1322", bg: "#fff1f0" },
  { key: "geekblue", name: "极客蓝",   base: "#2f54eb", dark: "#1d39c4", bg: "#f0f5ff" },
];
const PORTAL_THEME_MAP = Object.fromEntries(PORTAL_THEMES.map((t) => [t.key, t]));

/* ---------- 自定义主题色（#RRGGBB）解析与派生 ---------- */

/** 字节钳位 */
function _clampByte(n) { return Math.max(0, Math.min(255, Math.round(n))); }

/** #hex（3/6 位）→ {r,g,b}；非法返回 null */
function _hexToRgb(hex) {
  const h = String(hex == null ? "" : hex).replace("#", "").trim();
  if (h.length === 3 && /^[0-9a-fA-F]{3}$/.test(h)) {
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** {r,g,b} → #rrggbb */
function _rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => _clampByte(v).toString(16).padStart(2, "0")).join("");
}

/** 两色线性混合（t = hexB 权重 0~1），用于由 base 派生 dark / bg */
function _mixHex(hexA, hexB, t) {
  const a = _hexToRgb(hexA), b = _hexToRgb(hexB);
  if (!a || !b) return hexA;
  return _rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

/** 主题值解析：预设 key 或自定义 #RRGGBB → {key,name,base,dark,bg}；非法值返回 null
 *  自定义色派生规则与预设一致：dark = base 混黑 18%，bg = base 混白 93%（约 7% 浓度浅底） */
function resolvePortalTheme(val) {
  if (!val) return null;
  if (PORTAL_THEME_MAP[val]) return PORTAL_THEME_MAP[val];
  const hex = String(val).trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    key: "custom", name: "自定义", base: hex.toLowerCase(),
    dark: _mixHex(hex, "#000000", 0.18),
    bg: _mixHex(hex, "#ffffff", 0.93),
  };
}

/** 门户卡主题解析：theme 值（预设 key / 自定义 #hex）→ 主题对象；
 *  非法/缺省回落 MODULE_THEME 默认色
 *  @param {object} app 门户卡（kind=internal）
 *  @returns {{key,name,base,dark,bg}} */
function getPortalTheme(app) {
  if (app && app.theme) {
    const t = resolvePortalTheme(app.theme);
    if (t) return t;
  }
  const mod = app && app.mod;
  const legacy = (typeof MODULE_THEME !== "undefined" && mod && MODULE_THEME[mod]) || null;
  if (legacy) {
    const hit = PORTAL_THEMES.find((t) => t.base.toLowerCase() === String(legacy).toLowerCase());
    if (hit) return hit;
    return { key: "legacy", name: "默认", base: legacy, dark: legacy, bg: legacy + "14" };
  }
  return PORTAL_THEME_MAP.blue;
}

/** 子系统默认主题 key（按板块约定，与 MODULE_THEME 视觉保持一致） */
const _SUB_DEFAULT_THEME = { proj: "blue", dev: "green", asset: "cyan", perf: "purple" };

/** 子系统窗口主题注入：按门户配置 theme（缺省按板块默认）把主题变量写到
 * documentElement inline style（优先级高于 subs css 的 :root 静态默认），
 * 使子系统 chrome / 按钮 / 高亮跟随门户配置的主题配色。
 * 在主系统窗口调用为 no-op（不影响门户自身）。 */
function applySubsystemTheme(appKey) {
  if (typeof document === "undefined" || !appKey) return;
  if (typeof window !== "undefined" && !window.__SUB_KEY) return;
  const root = document.documentElement;
  if (!root || !root.style) return;
  let t = null;
  if (typeof findPortalApp === "function") {
    const app = findPortalApp(appKey);
    if (app && app.kind !== "external" && app.theme) t = resolvePortalTheme(app.theme);
  }
  if (!t) t = PORTAL_THEME_MAP[_SUB_DEFAULT_THEME[appKey] || "blue"];
  if (!t) return;
  const s = root.style;
  s.setProperty("--primary", t.dark);
  s.setProperty("--btBlue", t.base);
  s.setProperty("--iconBlue", t.base);
  s.setProperty("--headerBg", t.dark);
}

/** 门户种子（首次启动写入 localStorage；结构变更由种子同步机制迁移） */
const DEFAULT_PORTAL_APPS = [
  {
    key: "proj", name: "项目管理", icon: "📁", kind: "internal", mod: "proj", theme: "blue",
    status: "active", order: 1, roles: [],
    desc: "研发设计评审、项目阶段评审与项目看板，覆盖项目全生命周期",
  },
  {
    key: "dev", name: "研发公共", icon: "🔬", kind: "internal", mod: "dev", theme: "green",
    status: "active", order: 2, roles: [],
    desc: "标准库、经验案例库与研发公共知识资产",
  },
  {
    key: "asset", name: "过程资产", icon: "📐", kind: "internal", mod: "asset", theme: "cyan",
    status: "active", order: 3, roles: [],
    desc: "开发规范、文档模板、设计规范与评审 Checklist",
  },
  {
    key: "perf", name: "绩效管理", icon: "📈", kind: "internal", mod: "perf", theme: "purple",
    status: "active", order: 4, roles: [],
    desc: "月度 / 年度绩效考核、互评任务与年终考核汇总",
  },
  {
    key: "ext-pms", name: "项目管理系统", icon: "🗂️", kind: "external",
    url: "http://192.168.1.19/devsuite/#home",
    status: "active", order: 5, roles: [],
    desc: "公司内部项目管理平台 DevSuite，已打通 SSO 免二次登录",
  },
  {
    key: "ext-board", name: "项目看板", icon: "📊", kind: "external",
    url: "http://192.168.215.23/axshare/ppb/index.html",
    status: "active", order: 6, roles: [],
    desc: "项目进度看板原型（Axure 在线原型）",
  },
  {
    key: "ext-auto", name: "自动化测试平台", icon: "🤖", kind: "external",
    url: "http://192.168.215.23/pd/uml/index.html",
    status: "active", order: 7, roles: [],
    desc: "UI 自动化测试平台，支持用例编排与执行",
  },
];

/** 运行时门户配置（loadPortal 后可用；顶层 let 语义同其他 config 模块） */
let PORTAL_APPS = [];

/** 归一化单张门户卡：旧数据缺 enabled 时按「已上架」处理 */
function _normalizePortalApp(app) {
  if (app && app.enabled === undefined) app.enabled = true;
  return app;
}

/** 归一化排序：按 order 升序重排，并压实为 1..N 连续序号后持久化 */
function _normalizePortalOrders() {
  PORTAL_APPS.sort((a, b) => (a.order || 0) - (b.order || 0));
  PORTAL_APPS.forEach((a, i) => { a.order = i + 1; });
  savePortalApps(PORTAL_APPS);
}

/** 加载门户配置：无持久化数据时写回种子 */
function loadPortal() {
  let saved = null;
  try {
    const raw = localStorage.getItem(PORTAL_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    saved = null;
  }
  if (saved && Array.isArray(saved.apps) && saved.apps.length) {
    /* 种子同步：补齐种子中新增的卡（按 key 合并，保留用户对既有卡的排序/显隐修改） */
    const byKey = {};
    saved.apps.forEach((a) => { if (a && a.key) byKey[a.key] = a; });
    DEFAULT_PORTAL_APPS.forEach((seed) => {
      if (!byKey[seed.key]) byKey[seed.key] = JSON.parse(JSON.stringify(seed));
    });
    const merged = Object.keys(byKey).map((k) => byKey[k]);
    merged.sort((a, b) => (a.order || 0) - (b.order || 0));
    PORTAL_APPS = merged;
    PORTAL_APPS.forEach(_normalizePortalApp);
    savePortalApps(PORTAL_APPS);
  } else {
    PORTAL_APPS = JSON.parse(JSON.stringify(DEFAULT_PORTAL_APPS));
    PORTAL_APPS.forEach(_normalizePortalApp);
    savePortalApps(PORTAL_APPS);
  }
  _normalizePortalOrders();
}

/** 读取门户配置（未加载时返回种子副本） */
function getPortalApps() {
  const list = PORTAL_APPS && PORTAL_APPS.length ? PORTAL_APPS : DEFAULT_PORTAL_APPS;
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
}

/** 按 key 查找门户卡 */
function findPortalApp(key) {
  return getPortalApps().find((a) => a.key === key) || null;
}

/** 持久化门户配置 */
function savePortalApps(list) {
  try {
    localStorage.setItem(PORTAL_KEY, JSON.stringify({ apps: list }));
  } catch (e) {
    // 忽略存储异常
  }
}

/** 门户卡对当前角色是否可见（roles 空 = 全角色；内部卡另受模块权限过滤；下架卡不可见）
 *  sysAdmin 为超级用户，不受 roles 白名单约束（与 canAccessModule / canAction 的全权限约定一致） */
function _portalAppAllowed(app) {
  if (!app) return false;
  if (app.enabled === false) return false;
  const role = typeof CUR_ROLE !== "undefined" ? CUR_ROLE : "";
  if (role !== "sysAdmin" && app.roles && app.roles.length && app.roles.indexOf(role) < 0) return false;
  if (app.kind === "internal") {
    return !!app.mod && typeof canAccessModule === "function" && canAccessModule(app.mod);
  }
  return true;
}

/** 门户状态文案 */
function _portalStatusText(status) {
  return status === "maintenance" ? "维护中" : "正常";
}

/* ---------- 门户卡 CRUD（供「菜单管理 → 门户配置」使用） ---------- */

/** 更新门户卡字段（名称/图标/描述/状态/可见角色/外链地址/主题配色），持久化；返回是否成功 */
function updatePortalApp(key, patch) {
  const app = PORTAL_APPS.find((a) => a.key === key);
  if (!app) return false;
  const p = patch || {};
  if (p.name !== undefined) {
    const name = String(p.name).trim();
    if (!name) return false;
    app.name = name;
  }
  if (p.icon !== undefined) app.icon = String(p.icon).trim() || app.icon;
  if (p.desc !== undefined) app.desc = String(p.desc == null ? "" : p.desc);
  if (p.status !== undefined) app.status = p.status === "maintenance" ? "maintenance" : "active";
  if (p.roles !== undefined) app.roles = Array.isArray(p.roles) ? p.roles.slice() : [];
  if (p.url !== undefined) {
    const url = String(p.url == null ? "" : p.url).trim();
    /* 外链卡必须保留合法地址，避免下架/清空后卡片点击无响应 */
    if (app.kind === "external" && !/^https?:\/\//i.test(url)) return false;
    app.url = url;
  }
  /* 主题配色仅内部卡可设；取值须为预设 key 或自定义 #RRGGBB，空串表示清除（回落默认） */
  if (p.theme !== undefined) {
    if (app.kind === "external") return false;
    if (p.theme === "" || p.theme === null) delete app.theme;
    else if (!resolvePortalTheme(p.theme)) return false;
    else app.theme = String(p.theme).trim().toLowerCase();
  }
  savePortalApps(PORTAL_APPS);
  return true;
}

/** 新增外部系统门户卡（「菜单管理 → 门户配置」原只能维护种子，无法新增外链）
 * 自动生成 key（ext-<时间戳36进制>），order 追加到末尾，默认已上架。
 * @param {object} opts { name, icon, url, desc, roles, status }
 * @returns {string|null} 新卡 key（失败返回 null） */
function createPortalApp(opts) {
  const o = opts || {};
  const name = String(o.name == null ? "" : o.name).trim();
  const url = String(o.url == null ? "" : o.url).trim();
  if (!name) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  const key = "ext-" + Date.now().toString(36);
  const maxOrder = PORTAL_APPS.reduce((mx, a) => Math.max(mx, a.order || 0), 0);
  const app = {
    key,
    name,
    icon: String(o.icon == null ? "" : o.icon).trim() || "🔗",
    kind: "external",
    url,
    desc: String(o.desc == null ? "" : o.desc),
    status: o.status === "maintenance" ? "maintenance" : "active",
    enabled: true,
    order: maxOrder + 1,
    roles: Array.isArray(o.roles) ? o.roles.slice() : [],
  };
  PORTAL_APPS.push(app);
  savePortalApps(PORTAL_APPS);
  return key;
}

/** 上架 / 下架门户卡（enabled 取反），持久化；返回操作后的 enabled 值（找不到返回 null） */
function togglePortalAppEnabled(key) {
  const app = PORTAL_APPS.find((a) => a.key === key);
  if (!app) return null;
  app.enabled = app.enabled === false ? true : false;
  savePortalApps(PORTAL_APPS);
  return app.enabled;
}

/** 调整门户卡排序（dir: -1 上移 / +1 下移），与相邻卡交换并压实序号；返回是否成功 */
function movePortalApp(key, dir) {
  if (!PORTAL_APPS.some((a) => a.key === key)) return false;
  const sorted = PORTAL_APPS.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const i = sorted.findIndex((a) => a.key === key);
  const j = i + (dir < 0 ? -1 : 1);
  if (j < 0 || j >= sorted.length) return false;
  const tmp = sorted[i].order;
  sorted[i].order = sorted[j].order;
  sorted[j].order = tmp;
  _normalizePortalOrders();
  return true;
}

/* ---------- 挂载到 window ---------- */
window.loadPortal = loadPortal;
window.getPortalApps = getPortalApps;
window.findPortalApp = findPortalApp;
window.savePortalApps = savePortalApps;
window.updatePortalApp = updatePortalApp;
window.togglePortalAppEnabled = togglePortalAppEnabled;
window.movePortalApp = movePortalApp;
window.createPortalApp = createPortalApp;
window.getPortalTheme = getPortalTheme;
window.resolvePortalTheme = resolvePortalTheme;
window.applySubsystemTheme = applySubsystemTheme;
window.PORTAL_THEMES = PORTAL_THEMES;

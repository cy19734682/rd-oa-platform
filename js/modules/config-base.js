/* ========== 研发OA综合平台 · 配置基座（config-base.js） ========== */
/* 拆分自原 config.js。集中存放跨模块共享内容：
 *   - VIEWS 视图注册表（由各 views-*.js 填充）
 *   - 业务级 Action 常量（ALL_ACTIONS / ACTION_MAP）
 *   - 各模块 localStorage 存储 Key 与默认密码
 *   - 通用持久化辅助 _loadArr / _save（被 config-pa/std/ec/assets 复用）
 * 加载顺序：必须在 auth.js 之前、且早于全部 config-*.js / views-*.js（index.html 已保证）。 */


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


/* ---------- 常量 ---------- */
const SESSION_KEY = "oa_session";
const ACCT_KEY = "oa_accounts";
const DEPT_KEY = "oa_depts";
const DEFAULT_PWD = "123456";

/* 过程资产模块 localStorage Key（持久化存储，关闭浏览器标签页即清除） */
const ASSET_SPEC_KEY = "oa_asset_spec";      // 开发规范
const ASSET_TPL_KEY = "oa_asset_tpl";        // 文档模板
const ASSET_DESIGN_KEY = "oa_asset_design";  // 设计规范
const ASSET_CHECK_KEY = "oa_asset_check";    // 评审 checklist

/* 演示账号与默认密码映射（原型演示用） */
const DEMO_PWD = {
  8001: "123456",
  admin: "admin123"
};

/* ---------- 通用持久化辅助（供 PA / 标准库 / 资产 子模块共用） ---------- */
function _loadArr(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v) && v.length > 0) return v;
    }
  } catch (e) {}
  return fallback.map((x) => ({ ...x }));
}
/** 通用：写入 localStorage */
function _save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* VIEWS 映射表——由 views.js 在加载时填充 */
const VIEWS = {};

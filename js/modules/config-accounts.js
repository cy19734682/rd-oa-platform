/* ========== 研发OA综合平台 · 账号管理（config-accounts.js） ========== */
/* 拆分自原 config.js。包含默认账号种子（DEFAULT_ACCOUNTS）与账号 CRUD，
 * 持久化到 localStorage（Key 见 config-base.js 的 ACCT_KEY）。 */


/* 默认账号（用于初始化 localStorage） */
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

/** 从 localStorage 加载账号；无则以 DEFAULT_ACCOUNTS 初始化并写回 */
function loadAccounts() {
  let stored = null;
  try {
    const raw = localStorage.getItem(ACCT_KEY);
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

/** 将当前账号列表写回 localStorage */
function saveAccounts() {
  try {
    localStorage.setItem(ACCT_KEY, JSON.stringify(ACCOUNTS));
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

/* ---------- 账号管理函数挂载到 window ---------- */
window.loadAccounts = loadAccounts;
window.findAccount = findAccount;
window.getAccounts = () => ACCOUNTS;
window.addAccount = addAccount;
window.updateAccount = updateAccount;
window.toggleAccount = toggleAccount;
window.resetAccountPwd = resetAccountPwd;
window.deleteAccount = deleteAccount;

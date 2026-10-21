/* ========== 研发OA综合平台 · 部门管理（config-depts.js） ========== */
/* 拆分自原 config.js。包含部门树（扁平数组 + parentId 递归）、部门 CRUD、
 * 以及跨模块复用的拼音首字母编码 _pinyinInitials。 */



/* ========== 部门管理（持久化到 localStorage） ========== */

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


/* ---------- 部门管理函数挂载到 window ---------- */
window.loadDepts = loadDepts;
window.findDept = findDept;
window.getDepts = () => DEPTS;
window.addDept = addDept;
window.updateDept = updateDept;
window.deleteDept = deleteDept;
// 用 getter 保证每次访问取最新值（DEPTS 在 loadDepts 后才被赋值）
Object.defineProperty(window, "DEPTS", {
  get() { return DEPTS; },
  set(v) { DEPTS = v; },
  configurable: true,
});

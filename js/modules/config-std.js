/* ========== 标准库模块 · config-std.js ========== */
/* 包含：标准 / 字典 / 日志 种子数据与全量 CRUD */
/* 依赖基座 config.js 中的 _loadArr / _save 辅助函数 */

/* ---------- 标准库模块 localStorage Key ---------- */
const OA_STD_STANDARDS = "oa_std_standards";
const OA_SYS_DICT = "oa_sys_dict";
const OA_SYS_DICT_META = "oa_sys_dict_meta";
const OA_STD_LOGS = "oa_std_logs";

/* ---------- 标准库默认种子数据 ---------- */
const DEFAULT_STANDARDS = [
  {
    id: "std_001", stdNo: "GB/T 6968-2026",
    nameCn: "膜式燃气表", nameEn: "Diaphragm Gas Meters",
    pubDate: "2025-09-30", implDate: "2026-03-01",
    status: "current", level: "国标", nature: "推荐",
    domain: "膜式燃气表", org: "住建部",
    drafter: "中国城市燃气协会", drafterPeople: "王工、李工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "张工、陈工",
    publisher: "国家标准化管理委员会",
    supersedes: "GB/T 6968-2019",
    year: 2026, version: "2026版",
    body: "本标准规定了膜式燃气表的术语、分类、要求、试验方法、检验规则及标志、包装、运输、贮存。\n\n6.3 密封性试验：燃气表在 1.5 倍最大工作压力下，保压不少于 3 min，不得出现泄漏或压力下降超过规定值。\n\n7.2 计量性能：在额定流量范围内，基本误差限应符合表 2 要求。",
    attachments: [{ type: "pdf", name: "GB/T 6968-2026.pdf", size: "12.4MB" }],
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: "std_002", stdNo: "GB/T 6968-2019",
    nameCn: "膜式燃气表", nameEn: "Diaphragm Gas Meters",
    pubDate: "2019-04-02", implDate: "2019-10-01",
    status: "replaced", level: "国标", nature: "推荐",
    domain: "膜式燃气表", org: "住建部",
    drafter: "中国城市燃气协会", drafterPeople: "王工、李工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "张工、陈工",
    publisher: "国家标准化管理委员会",
    supersedes: "GB/T 6968-2011",
    supersededBy: "GB/T 6968-2026",
    year: 2019, version: "2019版",
    body: "本标准规定了膜式燃气表的术语、分类、要求、试验方法、检验规则及标志、包装、运输、贮存。\n\n已被 GB/T 6968-2026 代替，保留供历史查阅。",
    attachments: [{ type: "pdf", name: "GB/T 6968-2019.pdf", size: "11.8MB" }],
    createdAt: Date.now() - 86400000 * 2000,
  },
  {
    id: "std_003", stdNo: "GB/T 39841-2026",
    nameCn: "超声波燃气表", nameEn: "Ultrasonic Gas Meters",
    pubDate: "2025-12-15", implDate: "2026-06-01",
    status: "current", level: "国标", nature: "推荐",
    domain: "超声波燃气表", org: "住建部",
    drafter: "中国城市燃气协会", drafterPeople: "赵工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "刘工",
    publisher: "国家标准化管理委员会",
    supersedes: "CJ/T 507-2018",
    year: 2026, version: "2026版",
    body: "本标准规定了超声波燃气表的技术要求、试验方法、检验规则。\n\n5.4 密封性试验：按 JB/T 9236-1999 执行，压力试验 1.5 MPa 下保压 5 min。",
    attachments: [{ type: "pdf", name: "GB/T 39841-2026.pdf", size: "9.6MB" }],
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: "std_004", stdNo: "CJ/T 112-2016",
    nameCn: "膜式燃气表安装要求", nameEn: "Installation Requirements of Diaphragm Gas Meters",
    pubDate: "2016-03-15", implDate: "2016-09-01",
    status: "aboutToExpire", level: "行标", nature: "推荐",
    domain: "膜式燃气表", org: "中燃协",
    drafter: "中国城市燃气协会", drafterPeople: "周工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "吴工",
    publisher: "住房和城乡建设部",
    supersedes: "CJ/T 112-2008",
    year: 2016, version: "2016版",
    body: "本标准规定了膜式燃气表的安装位置、安装高度、固定方式等要求。\n\n附录 A（资料性） 密封性试验方法及评定。",
    attachments: [{ type: "pdf", name: "CJ/T 112-2016.pdf", size: "5.2MB" }],
    createdAt: Date.now() - 86400000 * 3650,
  },
  {
    id: "std_005", stdNo: "GB/T 41373-2022",
    nameCn: "燃气表安全技术要求", nameEn: "Safety Technical Requirements for Gas Meters",
    pubDate: "2022-04-11", implDate: "2022-11-01",
    status: "current", level: "国标", nature: "强制",
    domain: "安全", org: "住建部",
    drafter: "中国城市燃气协会", drafterPeople: "郑工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "马工",
    publisher: "国家标准化管理委员会",
    supersedes: "",
    year: 2022, version: "2022版",
    body: "本标准规定了燃气表的安全设计、材料选择、密封结构、耐压试验等安全技术要求。",
    attachments: [{ type: "pdf", name: "GB/T 41373-2022.pdf", size: "8.1MB" }],
    createdAt: Date.now() - 86400000 * 1400,
  },
  {
    id: "std_006", stdNo: "ISO 12460-1:2015",
    nameCn: "燃气表 国际标准 第一部分", nameEn: "Gas meters — Part 1",
    pubDate: "2015-02-18", implDate: "2015-08-01",
    status: "current", level: "国际", nature: "推荐",
    domain: "机械流量计", org: "ISO/TC 293",
    drafter: "ISO/TC 293", drafterPeople: "International",
    coDrafter: "ISO/TC 293 WG 1", coDrafterPeople: "",
    publisher: "国际标准化组织",
    supersedes: "",
    year: 2015, version: "2015版",
    body: "国际燃气表通用技术要求，涵盖机械式、超声波、MEMS 热式等多种类型。",
    attachments: [{ type: "pdf", name: "ISO 12460-1-2015.pdf", size: "6.8MB" }],
    createdAt: Date.now() - 86400000 * 4000,
  },
  {
    id: "std_007", stdNo: "CJ/T 507-2018",
    nameCn: "超声波燃气表", nameEn: "Ultrasonic Gas Meters",
    pubDate: "2018-09-10", implDate: "2019-03-01",
    status: "aboutToExpire", level: "行标", nature: "推荐",
    domain: "超声波燃气表", org: "中燃协",
    drafter: "中国城市燃气协会", drafterPeople: "何工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "谢工",
    publisher: "住房和城乡建设部",
    supersedes: "",
    supersededBy: "GB/T 39841-2026",
    year: 2018, version: "2018版",
    body: "国内较早的超声波燃气表行标，已被国标 GB/T 39841-2026 替代，保留供历史查阅。",
    attachments: [{ type: "pdf", name: "CJ/T 507-2018.pdf", size: "7.3MB" }],
    createdAt: Date.now() - 86400000 * 2500,
  },
  {
    id: "std_008", stdNo: "T/CECS 1087-2022",
    nameCn: "城镇燃气调压器技术规程", nameEn: "Technical Specification for Urban Gas Pressure Regulators",
    pubDate: "2022-10-25", implDate: "2023-03-01",
    status: "current", level: "团标", nature: "推荐",
    domain: "调压器", org: "中国工程建设协会",
    drafter: "中国工程建设标准化协会", drafterPeople: "杨工",
    coDrafter: "成都前沿精密机械有限公司", coDrafterPeople: "孙工",
    publisher: "中国工程建设协会",
    supersedes: "",
    year: 2022, version: "2022版",
    body: "本规程规定了城镇燃气调压器的设计、制造、安装、验收及运行维护要求。",
    attachments: [{ type: "pdf", name: "T-CECS 1087-2022.pdf", size: "4.5MB" }],
    createdAt: Date.now() - 86400000 * 1200,
  },
];

const DEFAULT_SYS_DICT = {
  domains: [
    "膜式燃气表", "超声波燃气表", "MEMS热式燃气表", "机械流量计", "超声流量计",
    "物联网", "调压器", "管网", "场站", "运维", "安全",
  ],
  orgs: [
    "中燃协", "住建部", "中国工程建设协会", "四川省建设厅", "成都市住建局",
    "国家标管委", "国际标准化组织（ISO）",
  ],
  levels: ["国际", "国标", "行标", "团标", "地标"],
  natures: ["强制", "推荐"],
  statuses: ["现行", "废止", "草案", "征求意见", "报批"],
  // 案例库相关字典
  ecSources: ["生产过程", "开发阶段", "售后"],
  ecCategories: ["硬件", "软件", "结构", "测试", "其他"],
  ecQualities: ["优秀", "良好", "一般"],
  ecValues: ["大", "中", "一般"],
};

/* 字典元信息（供数据字典管理页展示标签） */
const DEFAULT_DICT_META = {
  domains: { label: "所属领域", desc: "标准可选择的领域/产品类型标签" },
  orgs:    { label: "标准归口组织", desc: "标准归口组织（中燃协、住建部等）" },
  levels:  { label: "标准级别", desc: "国际 / 国标 / 行标 / 团标 / 地标" },
  natures: { label: "标准性质", desc: "强制 / 推荐" },
  statuses:{ label: "标准状态", desc: "现行 / 废止 / 草案 / 征求意见 / 报批" },
  // 案例库相关字典元信息
  ecSources:    { label: "案例来源", desc: "生产过程 / 开发阶段 / 售后" },
  ecCategories: { label: "案例分类", desc: "硬件 / 软件 / 结构 / 测试 / 其他" },
  ecQualities:  { label: "质量评价", desc: "优秀 / 良好 / 一般" },
  ecValues:     { label: "推广价值", desc: "大 / 中 / 一般" },
};
let DICT_META = null;

const DEFAULT_STD_LOGS = [
  { id: "log_001", stdId: "std_001", op: "upload", who: "8002 李工", time: Date.now() - 86400000 * 5, note: "上传新版本 PDF（v2026）" },
  { id: "log_002", stdId: "std_001", op: "preview", who: "8001 张工", time: Date.now() - 86400000 * 2, note: "在线预览" },
  { id: "log_003", stdId: "std_003", op: "download", who: "8001 张工", time: Date.now() - 86400000, note: "下载 PDF（水印：张工 2026-09-22）" },
];

/* ---------- 标准库全局状态 ---------- */
let STANDARDS = null;
let SYS_DICT = null;
let STD_LOGS = null;

/* ---------- 标准库加载 / 保存 ---------- */
function loadStandards() { STANDARDS = _loadArr(OA_STD_STANDARDS, DEFAULT_STANDARDS); _save(OA_STD_STANDARDS, STANDARDS); }
function saveStandards() { _save(OA_STD_STANDARDS, STANDARDS); }
function loadStdDicts() {
  try {
    const raw = localStorage.getItem(OA_SYS_DICT);
    if (raw) { SYS_DICT = JSON.parse(raw); } else { SYS_DICT = JSON.parse(JSON.stringify(DEFAULT_SYS_DICT)); }
  } catch (e) { SYS_DICT = JSON.parse(JSON.stringify(DEFAULT_SYS_DICT)); }
  _save(OA_SYS_DICT, SYS_DICT);
}
function saveStdDicts() { _save(OA_SYS_DICT, SYS_DICT); }
function loadDictMeta() {
  try {
    const raw = localStorage.getItem(OA_SYS_DICT_META);
    if (raw) { DICT_META = JSON.parse(raw); } else { DICT_META = JSON.parse(JSON.stringify(DEFAULT_DICT_META)); }
  } catch (e) { DICT_META = JSON.parse(JSON.stringify(DEFAULT_DICT_META)); }
  _save(OA_SYS_DICT_META, DICT_META);
  // 同步到 window，确保 views.js 拿到的是同一个对象引用
  window.DICT_META = DICT_META;
}
function saveDictMeta() {
  // 保存前同步 window.DICT_META 上的改动回内部变量（views.js 直接修改 window.DICT_META 的属性）
  if (window.DICT_META && typeof window.DICT_META === "object") {
    DICT_META = window.DICT_META;
  }
  _save(OA_SYS_DICT_META, DICT_META);
}
/** 更新单个字典组元数据 */
function updateDictMeta(key, label, desc) {
  if (!DICT_META || typeof DICT_META !== "object") DICT_META = {};
  DICT_META[key] = { label: label || key, desc: desc || "" };
  window.DICT_META = DICT_META;
  saveDictMeta();
}
/** 删除单个字典组元数据 */
function deleteDictMeta(key) {
  if (DICT_META && DICT_META[key]) {
    delete DICT_META[key];
    window.DICT_META = DICT_META;
    saveDictMeta();
  }
}
function loadStdLogs() { STD_LOGS = _loadArr(OA_STD_LOGS, DEFAULT_STD_LOGS); _save(OA_STD_LOGS, STD_LOGS); }
function saveStdLogs() { _save(OA_STD_LOGS, STD_LOGS); }
function loadAllStd() { loadStandards(); loadStdDicts(); loadDictMeta(); loadStdLogs(); }
function resetAllStd() {
  localStorage.removeItem(OA_STD_STANDARDS);
  localStorage.removeItem(OA_SYS_DICT);
  localStorage.removeItem(OA_SYS_DICT_META);
  localStorage.removeItem(OA_STD_LOGS);
  loadAllStd();
}

/* ---------- 标准库 CRUD ---------- */
function findStandard(id) { return (STANDARDS || []).find((s) => s.id === id); }
function findStandardsByNo(stdNo) { return (STANDARDS || []).filter((s) => s.stdNo === stdNo).sort((a, b) => b.year - a.year); }

function addStandard(data) {
  const id = "std_" + Date.now().toString(36);
  const item = {
    id, stdNo: (data.stdNo || "").trim(), nameCn: (data.nameCn || "").trim(),
    nameEn: (data.nameEn || "").trim(),
    pubDate: data.pubDate || "", implDate: data.implDate || "",
    status: data.status || "current", level: data.level || "国标", nature: data.nature || "推荐",
    domain: data.domain || "", org: data.org || "",
    drafter: data.drafter || "", drafterPeople: data.drafterPeople || "",
    coDrafter: data.coDrafter || "", coDrafterPeople: data.coDrafterPeople || "",
    publisher: data.publisher || "",
    supersedes: data.supersedes || "",
    year: data.year || new Date().getFullYear(), version: data.version || (data.year || new Date().getFullYear()) + "版",
    body: data.body || "",
    attachments: data.attachments || [{ type: "pdf", name: (data.stdNo || "标准") + ".pdf", size: "0MB" }],
    createdAt: Date.now(),
  };
  STANDARDS.push(item); saveStandards();
  logStdOp("add", id, `新增标准 ${item.stdNo}`);
  return item;
}

function updateStandard(id, patch) {
  const idx = (STANDARDS || []).findIndex((s) => s.id === id);
  if (idx < 0) return null;
  STANDARDS[idx] = { ...STANDARDS[idx], ...patch };
  saveStandards();
  logStdOp("edit", id, `编辑标准 ${STANDARDS[idx].stdNo}`);
  return STANDARDS[idx];
}

function deleteStandard(id) {
  const idx = (STANDARDS || []).findIndex((s) => s.id === id);
  if (idx < 0) return false;
  const no = STANDARDS[idx].stdNo;
  STANDARDS.splice(idx, 1); saveStandards();
  logStdOp("delete", id, `删除标准 ${no}`);
  return true;
}

/** 升级新版本：新建条目，老版本记录 supersededBy，新版本记录 supersedes */
function upgradeStandard(id, newData) {
  const oldItem = findStandard(id); if (!oldItem) return null;
  const newStdNo = newData.stdNo || oldItem.stdNo;
  const newYear = newData.year || new Date().getFullYear();
  const newItem = addStandard({
    ...oldItem, ...newData,
    stdNo: newStdNo, year: newYear,
    version: newData.version || (newYear + "版"),
    supersedes: oldItem.stdNo,
  });
  updateStandard(id, { status: "replaced", supersededBy: newItem.stdNo });
  logStdOp("upgrade", id, `${oldItem.stdNo} → ${newItem.stdNo}（新版本）`);
  return newItem;
}

function abolishStandard(id) {
  const item = findStandard(id); if (!item) return null;
  item.status = "abolished";
  saveStandards();
  logStdOp("abolish", id, `废止 ${item.stdNo}`);
  return item;
}

/**
 * 获取某条标准的完整版本链
 * 通过全局扫描所有条目的 supersedes / supersededBy 字段，双向迭代串联完整版本链
 * （弥补单条记录字段缺失导致的断链问题，比如 A.supersededBy=B 但 B.supersedes 为空）
 * @returns {Array} 版本链数组，按标准编号中的年份升序排列
 */
function getStdVersionChain(id) {
  const item = findStandard(id); if (!item) return [];
  const all = STANDARDS || [];
  const stdNoToId = {};
  all.forEach((s) => { stdNoToId[s.stdNo] = s.id; });

  // 先建立 id → stdNo 反查表（用于后面判断哪些条目关联到链上）
  const idToStdNo = {};
  all.forEach((s) => { idToStdNo[s.id] = s.stdNo; });

  const chainIds = new Set([item.id]);
  // 迭代扩展：每轮扫描所有条目，找 supersedes / supersededBy 指向链上已有成员的条目
  let changed = true;
  while (changed) {
    changed = false;
    const currentStdNos = new Set(Array.from(chainIds).map((cid) => idToStdNo[cid]).filter(Boolean));
    all.forEach((s) => {
      if (chainIds.has(s.id)) return;
      // s.supersedes 指向链上某条 → s 是老版本，应该加入
      if (s.supersedes && currentStdNos.has(s.supersedes)) {
        chainIds.add(s.id); changed = true;
      }
      // s.supersededBy 指向链上某条 → s 是新版本，应该加入
      if (s.supersededBy && currentStdNos.has(s.supersededBy)) {
        chainIds.add(s.id); changed = true;
      }
      // s 的 supersedes 或 supersededBy 链上条目指向它
      if (currentStdNos.has(s.stdNo)) {
        chainIds.add(s.id); changed = true;
      }
    });
  }

  // 收集并按编号中的年份升序排列
  const chain = Array.from(chainIds).map((cid) => findStandard(cid)).filter(Boolean);
  chain.sort((a, b) => {
    const ya = (a.stdNo.match(/(\d{4})/) || [, 0])[1];
    const yb = (b.stdNo.match(/(\d{4})/) || [, 0])[1];
    return Number(ya) - Number(yb);
  });
  return chain;
}

/* ---------- 标准库检索 ---------- */
function searchStandards({ keyword, level, domain, status, yearRange, searchBody } = {}) {
  const list = STANDARDS || [];
  const kw = (keyword || "").trim().toLowerCase();
  return list.filter((s) => {
    // 默认隐藏已被代替的历史版本（replaced），只有详情页历史版本侧栏能看到
    // 废止（abolished）保留在列表中，用户可通过筛选查看
    if ((!status || status === "全部") && s.status === "replaced") return false;
    if (kw) {
      const hay = (s.stdNo + " " + s.nameCn + " " + s.nameEn + " " + (s.summary || "")).toLowerCase();
      if (searchBody && s.body) {
        if (!hay.includes(kw) && !s.body.toLowerCase().includes(kw)) return false;
      } else {
        if (!hay.includes(kw)) return false;
      }
    }
    if (level && level !== "全部" && s.level !== level) return false;
    if (domain && domain !== "全部" && s.domain !== domain) return false;
    if (status && status !== "全部" && s.status !== status) return false;
    if (yearRange && yearRange !== "全部") {
      const y = s.year || 0;
      if (yearRange === "更早") { if (y >= 2019) return false; }
      else if (yearRange === "2020-2024") { if (y < 2020 || y > 2024) return false; }
      else { if (String(y) !== yearRange) return false; }
    }
    return true;
  }).sort((a, b) => b.year - a.year);
}

/* ---------- 标准字典 ---------- */
function getStdDict(key) { return (SYS_DICT && SYS_DICT[key]) || []; }
function addStdDictItem(key, val) {
  if (!SYS_DICT) SYS_DICT = { domains: [], orgs: [] };
  const arr = SYS_DICT[key] || [];
  if (arr.includes(val)) return false;
  arr.push(val); SYS_DICT[key] = arr;
  saveStdDicts();
  return true;
}
function removeStdDictItem(key, val) {
  if (!SYS_DICT) return false;
  const arr = SYS_DICT[key] || [];
  const idx = arr.indexOf(val);
  if (idx < 0) return false;
  arr.splice(idx, 1); saveStdDicts();
  return true;
}

/* ---------- 标准库统计 / 看板 ---------- */
function getStdBoardStats() {
  const all = STANDARDS || [];
  const byLevel = {}; all.forEach((s) => { byLevel[s.level] = (byLevel[s.level] || 0) + 1; });
  const byOrg = {}; all.forEach((s) => { byOrg[s.org] = (byOrg[s.org] || 0) + 1; });
  const byStatus = {}; all.forEach((s) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
  const now = Date.now();
  const NEW_THRESHOLD = 86400000 * 30;
  const newList = all.filter((s) => now - s.createdAt < NEW_THRESHOLD).sort((a, b) => b.createdAt - a.createdAt);
  const abolishSoon = all.filter((s) => s.status === "aboutToExpire").sort((a, b) => a.createdAt - b.createdAt);
  return { total: all.length, byLevel, byOrg, byStatus, newList, abolishSoon };
}

/* ---------- 操作日志 ---------- */
function logStdOp(op, stdId, note) {
  const who = (window.CURR_ACCT_ID || "system") + " " + (window.CURR_ACCT_NAME || "");
  STD_LOGS.push({
    id: "log_" + Date.now().toString(36),
    stdId, op, who: who.trim(),
    time: Date.now(), note,
  });
  saveStdLogs();
}

/* ---------- 标准库函数挂载到 window ---------- */
window.STANDARDS = STANDARDS;
window.SYS_DICT = SYS_DICT;
window.STD_LOGS = STD_LOGS;
window.findStandard = findStandard;
window.findStandardsByNo = findStandardsByNo;
window.addStandard = addStandard;
window.updateStandard = updateStandard;
window.deleteStandard = deleteStandard;
window.upgradeStandard = upgradeStandard;
window.abolishStandard = abolishStandard;
window.getStdVersionChain = getStdVersionChain;
window.searchStandards = searchStandards;
window.getStdDict = getStdDict;
window.addStdDictItem = addStdDictItem;
window.removeStdDictItem = removeStdDictItem;
window.getStdBoardStats = getStdBoardStats;
window.logStdOp = logStdOp;
window.loadAllStd = loadAllStd;
window.resetAllStd = resetAllStd;
// 注意：DICT_META 在 loadDictMeta() 内才会被正确赋值，这里先占位
// loadAllStd() 调用 loadDictMeta() 后会自动更新 window.DICT_META
window.DICT_META = DICT_META;
window.saveDictMeta = saveDictMeta;
window.updateDictMeta = updateDictMeta;
window.deleteDictMeta = deleteDictMeta;
window.getDict = getStdDict;
window.addDictItem = addStdDictItem;
window.removeDictItem = removeStdDictItem;
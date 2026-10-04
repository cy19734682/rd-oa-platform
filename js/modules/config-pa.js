/* ========== 绩效管理模块 · config-pa.js ========== */
/* 包含：考核人员库 / 模板 / 任务导入 / 考核表 / 结果 全流程种子与 CRUD */
/* 依赖基座 config.js 中的 _loadArr / _save 辅助函数 */

/* ---------- 绩效管理模块 sessionStorage Key ---------- */
const OA_PA_TEMPLATES = "oa_pa_tpls";    // 考核表单模板（含历史版本）
const OA_PA_TASKS = "oa_pa_tasks";       // 项目经理导入的月度计划任务 & 完成结果
const OA_PA_TABLES = "oa_pa_tables";     // 考核表与打分
const OA_PA_RESULTS = "oa_pa_results";   // 最终考核结果

/* ---------- 默认种子数据 ---------- */

/** 角色 key → 中文角色名 */
const _rk2label = { staff: "员工", projManager: "项目经理", supervisor: "主管", deptLeader: "部门领导", sysAdmin: "系统管理员" };

/** 由系统账号 ACCOUNTS + 部门 DEPTS 动态构建考核人员列表
 *  - group（部门小组）: ACCOUNTS.deptId → DEPTS.name
 *  - manager（直接主管）: 向上追溯部门链，第一个含 supervisor / projManager 的账号
 *  - leader（分管领导）: 向上追溯部门链（跳过自身），第一个含 deptLeader 的账号
 */
function _paBuildPeople() {
  const accts = (typeof ACCOUNTS !== "undefined" ? ACCOUNTS : (window.getAccounts ? window.getAccounts() : []));
  const depts = (typeof DEPTS !== "undefined" ? DEPTS : (window.DEPTS || []));
  if (accts.length === 0 || depts.length === 0) return [];
  const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]));

  // 从当前部门向上追溯整条部门链（自身ID → 上级ID → 上上级ID → ...）
  function _getDeptChain(startDeptId) {
    const chain = [];
    let cur = deptMap[startDeptId];
    while (cur) { chain.push(cur.id); cur = deptMap[cur.parentId]; }
    return chain;
  }

  return accts
    .filter((a) => a.st !== "停用" && a.key !== "sysAdmin" && a.key !== "deptLeader")
    .map((a) => {
      const chain = _getDeptChain(a.deptId);
      let manager = null, leader = null;
      for (const did of chain) {
        // manager：在当前或上级部门找 supervisor / projManager（排除自己）
        if (!manager) {
          const m = accts.find((x) => x.deptId === did && (x.key === "supervisor" || x.key === "projManager") && x.id !== a.id && x.st !== "停用");
          if (m) manager = m;
        }
        // leader：在上级部门找 deptLeader（跳过自身所在部门）
        if (!leader && did !== a.deptId) {
          const l = accts.find((x) => x.deptId === did && x.key === "deptLeader" && x.st !== "停用");
          if (l) leader = l;
        }
        if (manager && leader) break;
      }
      return {
        id: a.id,
        name: a.n,
        role: _rk2label[a.key] || a.key || "员工",
        roleKey: a.key,
        group: deptMap[a.deptId] ? deptMap[a.deptId].name : "",
        deptId: a.deptId,
        manager: manager ? manager.n : "—",
        managerId: manager ? manager.id : "",
        leader: leader ? leader.n : "—",
        leaderId: leader ? leader.id : "",
      };
    });
}

/** 考核表单模板 —— 月度 & 年终（默认激活最新版本） */
const DEFAULT_PA_TEMPLATES = [
  /* ======== 月度 · 员工版 ======== */
  {
    id: "pa_tpl_monthly_staff_v2",
    type: "monthly", typeLabel: "月度考核", subType: "staff",
    targetRoles: ["员工"],
    version: 2, name: "月度考核 · 员工版 v2",
    active: true, deletable: false,
    updatedAt: Date.now() - 86400000 * 10,
    items: [
      { id: "it_1", group: "工作业绩", category: "工作质量", standard: "任务交付物质量是否达标，Bug 率、文档完整度等指标", weight: 25 },
      { id: "it_2", group: "工作业绩", category: "工作效率", standard: "按时完成率、进度把控、资源利用效率", weight: 20 },
      { id: "it_3", group: "工作业绩", category: "任务完成情况", standard: "月度计划任务完成数量和质量（由项目经理导入自动填充）", weight: 30 },
      { id: "it_4", group: "综合素养", category: "团队协作", standard: "跨部门协作、沟通响应、知识分享", weight: 15 },
      { id: "it_5", group: "综合素养", category: "学习成长", standard: "新技术学习、培训参与、技能提升", weight: 10 },
    ],
  },
  /* ======== 月度 · 主管版 ======== */
  {
    id: "pa_tpl_monthly_manager_v1",
    type: "monthly", typeLabel: "月度考核", subType: "manager",
    targetRoles: ["主管"],
    version: 1, name: "月度考核 · 主管版 v1",
    active: true, deletable: false,
    updatedAt: Date.now() - 86400000 * 5,
    items: [
      { id: "it_1", group: "管理业绩", category: "团队指标达成", standard: "团队月度目标完成率、关键 KPI 达成情况", weight: 30 },
      { id: "it_2", group: "管理业绩", category: "项目管控", standard: "项目进度把控、风险识别、资源协调", weight: 25 },
      { id: "it_3", group: "管理能力", category: "人才培养", standard: "下属培训、绩效反馈、团队建设", weight: 20 },
      { id: "it_4", group: "管理能力", category: "流程改进", standard: "部门流程优化、问题闭环、标准化推进", weight: 15 },
      { id: "it_5", group: "综合素养", category: "沟通协作", standard: "跨部门协调、向上汇报、对外沟通", weight: 10 },
    ],
  },
  /* ======== 月度 · 项目经理版 ======== */
  {
    id: "pa_tpl_monthly_pm_v1",
    type: "monthly", typeLabel: "月度考核", subType: "pm",
    targetRoles: ["项目经理"],
    version: 1, name: "月度考核 · 项目经理版 v1",
    active: true, deletable: false,
    updatedAt: Date.now() - 86400000 * 3,
    items: [
      { id: "it_1", group: "项目业绩", category: "项目交付", standard: "项目按时交付率、里程碑达成、客户验收情况", weight: 35 },
      { id: "it_2", group: "项目业绩", category: "质量与成本", standard: "项目质量指标、预算控制、资源利用效率", weight: 25 },
      { id: "it_3", group: "管理能力", category: "团队与协作", standard: "项目团队管理、跨部门协作、干系人管理", weight: 20 },
      { id: "it_4", group: "管理能力", category: "风险与问题", standard: "风险预判与应对、问题闭环率、经验沉淀", weight: 10 },
      { id: "it_5", group: "综合素养", category: "学习成长", standard: "项目管理能力提升、行业学习", weight: 10 },
    ],
  },
  /* ======== 月度 · 历史版本 ======== */
  {
    id: "pa_tpl_monthly_staff_v1",
    type: "monthly", typeLabel: "月度考核", subType: "staff",
    targetRoles: ["员工"],
    version: 1, name: "月度考核 · 员工版 v1（历史版本）",
    active: false, deletable: false,
    updatedAt: Date.now() - 86400000 * 180,
    items: [
      { id: "it_1", group: "工作业绩", category: "工作质量", standard: "交付物质量", weight: 30 },
      { id: "it_2", group: "工作业绩", category: "工作效率", standard: "按时完成率", weight: 30 },
      { id: "it_3", group: "综合素养", category: "团队协作", standard: "协作沟通", weight: 20 },
      { id: "it_4", group: "综合素养", category: "学习成长", standard: "技能提升", weight: 20 },
    ],
  },
  /* ======== 年终 · 员工版 ======== */
  {
    id: "pa_tpl_yearly_v1",
    type: "yearly", typeLabel: "年终考核", subType: "staff",
    targetRoles: ["员工", "主管", "项目经理", "部门领导"],
    version: 1, name: "年终绩效考核表单 v1（通用）",
    active: true, deletable: false,
    updatedAt: Date.now() - 86400000 * 30,
    items: [
      { id: "it_1", group: "全年业绩", category: "全年工作业绩", standard: "全年重点项目完成情况、关键指标达成、年度计划兑现率", weight: 35 },
      { id: "it_2", group: "全年业绩", category: "平时考核结果", standard: "当年所有月度绩效考核的平均分（系统自动汇总填充）", weight: 25 },
      { id: "it_3", group: "能力发展", category: "能力提升与创新", standard: "技术能力成长、专利/论文、流程改进贡献", weight: 15 },
      { id: "it_4", group: "综合素养", category: "团队与文化贡献", standard: "团队协作、新人培养、公司文化践行", weight: 15 },
      { id: "it_5", group: "综合素养", category: "互评结果", standard: "同事互评平均分（系统自动计算）", weight: 10 },
    ],
  },
  /* ======== 互评考核 · 专用模板（主管/项目经理互评打分用） ======== */
  {
    id: "pa_tpl_yearly_peer_v1",
    type: "peer", typeLabel: "互评考核", subType: "yearly",
    targetRoles: ["主管", "项目经理"],
    version: 1, name: "年终绩效互评考核模板",
    active: true, deletable: false,
    updatedAt: Date.now() - 86400000 * 5,
    items: [
      { id: "pit_1", group: "工作业绩", category: "全年重点贡献", standard: "被考核人全年在项目/部门中做出的关键业绩和贡献", weight: 30 },
      { id: "pit_2", group: "协作沟通", category: "跨团队协作", standard: "与其他团队/同事的配合度、沟通响应、知识分享", weight: 25 },
      { id: "pit_3", group: "能力素质", category: "专业能力与成长", standard: "专业技能深度、学习能力、问题解决能力", weight: 25 },
      { id: "pit_4", group: "综合表现", category: "责任心与执行力", standard: "主动担当、计划兑现、抗压能力", weight: 20 },
    ],
  },
];

/** 项目经理导入的月度计划任务 & 完成结果（种子） */
const DEFAULT_PA_TASKS = [
  {
    id: "pa_tsk_001",
    period: "2026-02",
    importedBy: "赵工",
    importedAt: Date.now() - 86400000 * 15,
    tasks: [
      { ownerId: "8001", ownerName: "张工", category: "硬件开发", plan: "UG-200 计量精度优化方案设计与验证", result: "完成，计量精度提升 ±0.1%", weight: 30 },
      { ownerId: "8001", ownerName: "张工", category: "硬件开发", plan: "通讯模块低功耗联调", result: "完成，功耗降低 20%", weight: 25 },
      { ownerId: "8001", ownerName: "张工", category: "测试验证", plan: "样机温箱测试", result: "完成，各项指标合格", weight: 25 },
      { ownerId: "8001", ownerName: "张工", category: "产线支持", plan: "产线问题分析支持", result: "完成，现场支持及时", weight: 20 },
      { ownerId: "8005", ownerName: "陈工", category: "软件开发", plan: "上位机 V2.3 功能迭代", result: "完成，新增 5 项功能", weight: 40 },
      { ownerId: "8005", ownerName: "陈工", category: "软件开发", plan: "Modbus 协议兼容性修复", result: "完成，解决 3 个历史遗留问题", weight: 30 },
      { ownerId: "8006", ownerName: "刘工", category: "软件开发", plan: "嵌入式固件 OTA 升级方案", result: "进行中，预计 3 月完成", weight: 50 },
    ],
  },
];

/** 考核表种子 */
const DEFAULT_PA_TABLES = [];

/** 考核结果种子 */
const DEFAULT_PA_RESULTS = [];

/* ---------- 全局状态 ---------- */

let PA_TEMPLATES = null;
let PA_TASKS = null;
let PA_TABLES = null;
let PA_RESULTS = null;


function loadPaTemplates() { PA_TEMPLATES = _loadArr(OA_PA_TEMPLATES, DEFAULT_PA_TEMPLATES); _save(OA_PA_TEMPLATES, PA_TEMPLATES); }
function savePaTemplates() { _save(OA_PA_TEMPLATES, PA_TEMPLATES); }

function loadPaTasks() { PA_TASKS = _loadArr(OA_PA_TASKS, DEFAULT_PA_TASKS); _save(OA_PA_TASKS, PA_TASKS); }
function savePaTasks() { _save(OA_PA_TASKS, PA_TASKS); }

function loadPaTables() { PA_TABLES = _loadArr(OA_PA_TABLES, DEFAULT_PA_TABLES); _save(OA_PA_TABLES, PA_TABLES); }
function savePaTables() { _save(OA_PA_TABLES, PA_TABLES); }

function loadPaResults() { PA_RESULTS = _loadArr(OA_PA_RESULTS, DEFAULT_PA_RESULTS); _save(OA_PA_RESULTS, PA_RESULTS); }
function savePaResults() { _save(OA_PA_RESULTS, PA_RESULTS); }

/** 统一初始化绩效管理模块 */
function loadAllPa() {
  loadPaTemplates();
  loadPaTasks();
  loadPaTables();
  loadPaResults();
}

/* ---------- 通用工具 ---------- */

/** 判定文本是否超长（>10 字） */
function _isLongText(text) {
  return typeof text === "string" && text.length > 10;
}
/** 超长截断显示 */
function _shortText(text, len = 10) {
  if (!text) return "";
  return text.length > len ? text.slice(0, len) + "…" : text;
}

/* ---------- 考核人员（动态构建，无持久化） ---------- */

/** 查找考核人员：从 ACCOUNTS+DEPTS 动态构建的列表中查找 */
function findPaPerson(id) {
  return _paBuildPeople().find((p) => p.id === id) || null;
}

/* ---------- 考核表单模板 CRUD ---------- */

function findPaTemplate(id) { return (PA_TEMPLATES || []).find((t) => t.id === id); }
/**
 * 获取某类型当前激活的模板（可选传 ownerRole 按角色优先匹配）
 * @param {string} type        模板大类 type（monthly / yearly / 自定义）
 * @param {string} [ownerRole] 可选：被考核人的角色，优先匹配 targetRoles 包含该角色的模板
 */
function findActivePaTemplate(type, ownerRole) {
  const all = PA_TEMPLATES || [];
  // 优先：同 type + 同 subType + active
  if (ownerRole) {
    const matched = all.find((t) => t.type === type && t.active && (t.targetRoles || []).includes(ownerRole));
    if (matched) return matched;
  }
  // 兜底：同 type + active（第一个匹配的）
  return all.find((t) => t.type === type && t.active);
}
/** 获取某类型所有版本（按版本号倒序，可按 subType 进一步筛选） */
function listPaTemplateVersions(type, subType) {
  let list = (PA_TEMPLATES || []).filter((t) => t.type === type);
  if (subType) list = list.filter((t) => t.subType === subType);
  return list.sort((a, b) => b.version - a.version);
}
/** 列出所有出现过的模板大类 type（含 typeLabel） */
function listPaTemplateTypes() {
  const map = {};
  (PA_TEMPLATES || []).forEach((t) => { if (!map[t.type]) map[t.type] = t.typeLabel || t.type; });
  return Object.keys(map).map((k) => ({ key: k, label: map[k] }));
}
/** 列出指定 type 下出现过的 subType */
function listPaTemplateSubTypes(type) {
  const set = new Set();
  (PA_TEMPLATES || []).forEach((t) => { if (t.type === type) set.add(t.subType || ""); });
  return Array.from(set).filter(Boolean);
}

/**
 * 创建全新模板（非版本迭代，用于自定义新增）
 * @param {object} options
 *   - type:          模板大类（monthly / yearly / project ...）
 *   - typeLabel:     大类中文名（如 "月度考核"）
 *   - subType:       小类标识（如 staff / manager / 自定义英文）
 *   - name:          模板名称
 *   - targetRoles:   适用角色数组
 *   - items:         考核项数组
 */
function createPaTemplate(options) {
  const { type, typeLabel, name, targetRoles, items } = options || {};
  if (!type || !name) return null;
  const now = Date.now();
  const firstRole = (targetRoles && targetRoles[0]) || "员工";
  const subType = firstRole;
  const existing = (PA_TEMPLATES || []).filter((t) => t.type === type && t.subType === subType);
  const version = existing.length > 0 ? Math.max(...existing.map((t) => t.version)) + 1 : 1;
  existing.forEach((t) => { t.active = false; });
  PA_TEMPLATES = PA_TEMPLATES || [];
  const newTpl = {
    id: "pa_tpl_" + type + "_" + subType + "_v" + version,
    type, typeLabel: typeLabel || type, subType,
    targetRoles: [firstRole],
    version, name,
    active: true, deletable: true,
    updatedAt: now,
    items: Array.isArray(items) ? items : [
      { id: "it_1", group: "业绩", category: "考核项", standard: "请填写考核标准", weight: 100 },
    ],
  };
  PA_TEMPLATES.push(newTpl); savePaTemplates(); return newTpl;
}
/** 编辑模板元信息（名称、适用角色等），不影响版本号 */
function updatePaTemplateMeta(id, patch) {
  const t = findPaTemplate(id); if (!t) return false;
  ["name", "typeLabel", "targetRoles", "subType"].forEach((k) => { if (patch[k] !== undefined) t[k] = patch[k]; });
  t.updatedAt = Date.now();
  savePaTemplates(); return true;
}
/** 编辑模板考核项（items），不影响版本号 */
function updatePaTemplateItems(id, items) {
  const t = findPaTemplate(id); if (!t) return false;
  if (!Array.isArray(items)) return false;
  t.items = items.map((it, idx) => ({
    id: it.id || ("it_" + (idx + 1)),
    group: it.group || "",
    category: it.category || "",
    standard: it.standard || "",
    weight: Number(it.weight) || 0,
  }));
  t.updatedAt = Date.now();
  savePaTemplates(); return true;
}
/** 删除自定义模板（deletable=true 且该版本未被任何考核表引用） */
function deletePaTemplate(id) {
  const t = findPaTemplate(id); if (!t) return { ok: false, msg: "模板不存在" };
  if (!t.deletable) return { ok: false, msg: "系统内置模板不可删除" };
  const inUse = (PA_TABLES || []).some((tbl) => tbl.templateId === id);
  if (inUse) return { ok: false, msg: "该模板已被考核表引用，无法删除" };
  const i = PA_TEMPLATES.findIndex((x) => x.id === id);
  if (i === -1) return { ok: false, msg: "模板不存在" };
  PA_TEMPLATES.splice(i, 1); savePaTemplates();
  return { ok: true };
}

/** 创建模板新版本（基于现有激活模板的 items，适用于"编辑 → 保存为新版本"场景） */
function createPaTemplateNewVersion(type, patch) {
  const current = findActivePaTemplate(type);
  const now = Date.now();
  const baseItems = current ? current.items.map((it) => ({ ...it })) : [];
  const baseTargetRoles = current ? current.targetRoles || [] : ["员工"];
  const baseSubType = current ? current.subType || "" : "";
  const baseTypeLabel = current ? current.typeLabel || type : type;
  const baseDeletable = current ? current.deletable : true;
  // 旧版停用（同 type + subType 维度）
  if (current) { current.active = false; savePaTemplates(); }
  const newVersion = {
    id: "pa_tpl_" + type + "_" + (baseSubType || "custom") + "_v" + (current ? current.version + 1 : 1),
    type, typeLabel: baseTypeLabel, subType: baseSubType,
    targetRoles: baseTargetRoles,
    version: current ? current.version + 1 : 1,
    name: (patch && patch.name) || (current ? current.name : (baseTypeLabel || type) + " 模板") + " v" + (current ? current.version + 1 : 1),
    active: true, deletable: baseDeletable,
    updatedAt: now,
    items: (patch && Array.isArray(patch.items)) ? patch.items : baseItems,
  };
  PA_TEMPLATES.push(newVersion); savePaTemplates(); return newVersion;
}
/** 激活指定版本（同 type + subType 互斥） */
function activatePaTemplate(id) {
  const t = findPaTemplate(id); if (!t) return false;
  (PA_TEMPLATES || []).forEach((x) => { if (x.type === t.type && (x.subType || "") === (t.subType || "")) x.active = false; });
  t.active = true; savePaTemplates(); return true;
}
/** 编辑当前激活模板（保存为新版本） */
function editPaTemplateAsNewVersion(type, items, name) {
  return createPaTemplateNewVersion(type, { items, name });
}
function resetPaTemplates() {
  PA_TEMPLATES = DEFAULT_PA_TEMPLATES.map((x) => ({ ...x, items: x.items.map((i) => ({ ...i })) }));
  savePaTemplates();
}

/* ---------- 任务导入 CRUD（项目经理用） ---------- */

function findPaTaskImport(id) { return (PA_TASKS || []).find((t) => t.id === id); }
function listPaTaskImportByPeriod(period) { return (PA_TASKS || []).filter((t) => t.period === period); }
/** 导入一批任务（新增一次导入记录，或追加到已有） */
function importPaTasks(period, importedBy, tasks) {
  let rec = listPaTaskImportByPeriod(period)[0];
  if (!rec) {
    rec = { id: "pa_tsk_" + Date.now(), period, importedBy, importedAt: Date.now(), tasks: [] };
    PA_TASKS.push(rec);
  }
  tasks.forEach((tk) => {
    rec.tasks.push({
      ownerId: tk.ownerId || "",
      ownerName: tk.ownerName || "",
      category: tk.category || "其他",
      plan: tk.plan || "",
      result: tk.result || "",
      weight: Number(tk.weight) || 20,
    });
  });
  rec.importedAt = Date.now();
  savePaTasks(); return rec;
}
/** 撤销某个周期的任务导入 */
function deletePaTaskImportByPeriod(period) {
  const i = (PA_TASKS || []).findIndex((t) => t.period === period);
  if (i === -1) return false;
  PA_TASKS.splice(i, 1); savePaTasks(); return true;
}
function resetPaTasks() {
  PA_TASKS = DEFAULT_PA_TASKS.map((x) => ({ ...x, tasks: x.tasks.map((t) => ({ ...t })) }));
  savePaTasks();
}

/* ---------- 考核表 CRUD ---------- */

function findPaTable(id) { return (PA_TABLES || []).find((t) => t.id === id); }
function findPaTableByPeriod(period, ownerId, type) {
  return (PA_TABLES || []).find((t) =>
    t.period === period && t.ownerId === ownerId && (!type || t.type === type)
  );
}
/** 创建一张考核表 */
function createPaTable(options) {
  const { type, period, ownerId, ownerName, templateId, peerReviewers, items } = options || {};
  if (!type || !period || !ownerId) return null;
  if (findPaTableByPeriod(period, ownerId, type)) return null;
  const owner = findPaPerson(ownerId);
  const tpl = templateId ? findPaTemplate(templateId) : findActivePaTemplate(type, owner ? owner.role : null);
  const tplItems = tpl ? tpl.items.map((it) => ({ ...it, pm: "", sup: "", leader: "", pmComment: "", supComment: "", leaderComment: "" })) : [];
  const now = Date.now();
  const item = {
    id: "pa_tbl_" + now + "_" + ownerId,
    type, typeLabel: (tpl && tpl.typeLabel) || type, period,
    ownerId,
    ownerName: owner ? owner.name : (ownerName || ""),
    templateId: tpl ? tpl.id : "",
    templateVersion: tpl ? tpl.version : 1,
    items: items || tplItems,
    status: "pending",
    peerReviewers: peerReviewers || [],
    peerScoreDetails: {},
    peerScores: null,
    score: null,
    grade: null,
    comment: "",
    gradedBy: { pm: "", sup: "", leader: "" },
    gradedAt: null,
    createdAt: now,
  };
  PA_TABLES.push(item); savePaTables(); return item;
}

/** 批量创建考核表
 * @param {object} options
 * @param {string} options.type            考核类型 monthly / yearly
 * @param {string} options.period          考核周期
 * @param {string[]} options.ownerIds      被考核人工号数组
 * @param {string} [options.templateId]    可选：统一指定的模板 ID（优先级最高）
 * @param {string[]} [options.peerReviewers] 互评人工号
 */
function batchCreatePaTables(options) {
  const { type, period, ownerIds, templateId, peerReviewers } = options || {};
  if (!type || !period || !ownerIds || ownerIds.length === 0) return [];
  const created = [];
  const skipped = [];
  const unifiedTpl = templateId ? findPaTemplate(templateId) : null;
  ownerIds.forEach((oid) => {
    const owner = findPaPerson(oid);
    if (!owner) { skipped.push({ oid, reason: "人员不存在" }); return; }
    const existing = findPaTableByPeriod(period, oid, type);
    if (existing) { skipped.push({ oid, reason: "考核表已存在" }); return; }
    const tpl = unifiedTpl || findActivePaTemplate(type, owner.role);
    if (!tpl) { skipped.push({ oid, reason: "无匹配模板" }); return; }
    const tplItems = tpl ? tpl.items.map((it) => ({ ...it, pm: "", sup: "", leader: "", pmComment: "", supComment: "", leaderComment: "" })) : [];
    // 如果是月度，尝试从任务导入里填充 items
    let items = tplItems;
    if (type === "monthly") {
      const imports = listPaTaskImportByPeriod(period);
      const ownerTasks = [];
      imports.forEach((imp) => imp.tasks.forEach((tk) => { if (tk.ownerId === oid) ownerTasks.push(tk); }));
      if (ownerTasks.length > 0) {
        items = ownerTasks.map((tk, idx) => ({
          id: "task_" + idx, group: tk.group || "工作业绩", category: tk.category || "其他", standard: tk.plan || tk.result || "", weight: tk.weight || 20,
          task: tk.plan || "", plan: tk.plan || "", result: tk.result || "",
          pm: "", sup: "", leader: "", pmComment: "", supComment: "", leaderComment: "",
        }));
      }
    }
    // 年终表：自动汇总当年月度考核平均分填入"平时考核结果"项
    if (type === "yearly") {
      const year = period.replace("-年终", "");
      const yearResults = (PA_RESULTS || []).filter((r) =>
        r.ownerId === oid && r.type === "monthly" && r.period.startsWith(year + "-")
      );
      if (yearResults.length > 0) {
        const avgScore = Math.round((yearResults.reduce((s, r) => s + r.score, 0) / yearResults.length) * 10) / 10;
        // 同时兼容新结构（group+category）和旧结构（仅 category）
        items.forEach((it) => {
          if ((it.category === "平时考核结果") || (it.group && it.group.includes("平时"))) it.pm = "auto:" + avgScore;
        });
        items._yearlyAvg = avgScore;
      }
    }
    const now = Date.now();
    const tbl = {
      id: "pa_tbl_" + now + "_" + oid,
      type, typeLabel: (tpl && tpl.typeLabel) || type, period, ownerId: oid, ownerName: owner.name,
      templateId: tpl ? tpl.id : "", templateVersion: tpl ? tpl.version : 1,
      items,
      status: "pending",
      peerReviewers: peerReviewers || [],
      peerScoreDetails: {},
      peerScores: null,
      score: null, grade: null, comment: "",
      gradedBy: { pm: "", sup: "", leader: "" }, gradedAt: null,
      createdAt: now,
    };
    PA_TABLES.push(tbl); created.push(tbl);
  });
  savePaTables();
  created._skipped = skipped;
  return created;
}

/** 撤销/删除考核表 */
function deletePaTable(id) {
  const i = (PA_TABLES || []).findIndex((t) => t.id === id);
  if (i === -1) return false;
  PA_TABLES.splice(i, 1);
  // 如果已 finalized 同时删除结果
  const t = PA_TABLES[i];
  if (t && t.status === "finalized") {
    const ri = (PA_RESULTS || []).findIndex((r) =>
      r.ownerId === t.ownerId && r.period === t.period && (!t.type || r.type === t.type)
    );
    if (ri !== -1) PA_RESULTS.splice(ri, 1); savePaResults();
  }
  savePaTables(); return true;
}
/** 撤销指定周期的所有考核表 */
function deletePaTablesByPeriod(period, type) {
  let cnt = 0;
  (PA_TABLES || []).forEach((t) => {
    if (t.period === period && (!type || t.type === type)) {
      deletePaTable(t.id); cnt++;
    }
  });
  return cnt;
}

/** 更新考核表（items、peerReviewers 等） */
function updatePaTable(id, patch) {
  const t = findPaTable(id); if (!t) return false;
  ["items", "peerReviewers", "peerScores", "peerScoreDetails", "templateId"].forEach((k) => { if (patch[k] !== undefined) t[k] = patch[k]; });
  savePaTables(); return true;
}

/** 被考核人确认任务项（pending → selfFilled） */
function selfFillPaTable(id) {
  const t = findPaTable(id); if (!t) return false;
  if (t.status !== "pending") return false;
  t.status = "selfFilled";
  savePaTables(); return true;
}
/** 主管提交打分（selfFilled → supDone） */
function submitPaTableSup(id, graderId, graderName) {
  const t = findPaTable(id); if (!t) return false;
  if (t.status !== "selfFilled") return false;
  const allGraded = t.items.every((it) => it.sup !== "" && it.sup !== null && it.sup !== undefined);
  if (!allGraded) return false;
  t.status = "supDone";
  t.gradedBy.sup = graderName || graderId || "直接主管";
  savePaTables(); return true;
}
/** PM 提交打分（supDone → pmDone） */
function submitPaTablePM(id, graderId, graderName) {
  const t = findPaTable(id); if (!t) return false;
  if (t.status !== "supDone") return false;
  const allGraded = t.items.every((it) => it.pm !== "" && it.pm !== null && it.pm !== undefined);
  if (!allGraded) return false;
  t.status = "pmDone";
  t.gradedBy.pm = graderName || graderId || "项目经理";
  savePaTables(); return true;
}
/** 领导提交打分（pmDone → finalized，自动计算得分/等级/结果） */
function finalizePaTableByLeader(id, leaderId, leaderName, comment) {
  const t = findPaTable(id); if (!t) return false;
  if (t.status !== "pmDone") return false;
  const allGraded = t.items.every((it) => it.leader !== "" && it.leader !== null && it.leader !== undefined);
  if (!allGraded) return false;
  t.status = "finalized";
  t.gradedBy.leader = leaderName || leaderId || "部门领导";
  t.gradedAt = Date.now();
  if (comment !== undefined) t.comment = comment;
  // 自动计算得分
  const calc = _calcPaTableScore(t);
  t.score = calc.score; t.grade = calc.grade;
  // 自动生成结果
  _generatePaResultFromTable(t);
  savePaTables(); return calc;
}

/** 计算考核表加权得分 */
function _calcPaTableScore(table) {
  let totalWeight = 0, weightedSum = 0;
  table.items.forEach((it) => {
    const score = Number(it.leader);
    const w = Number(it.weight) || 0;
    if (!isNaN(score)) { weightedSum += score * w; totalWeight += w; }
  });
  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
  let grade = "C";
  if (score >= 90) grade = "S";
  else if (score >= 85) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else grade = "D";
  return { score, grade };
}

/** 从考核表生成/更新最终结果 */
function _generatePaResultFromTable(table) {
  let res = (PA_RESULTS || []).find((r) =>
    r.ownerId === table.ownerId && r.period === table.period && r.type === table.type
  );
  if (!res) {
    res = {
      id: "pa_res_" + Date.now() + "_" + table.ownerId,
      type: table.type, period: table.period,
      ownerId: table.ownerId, ownerName: table.ownerName,
      score: table.score, grade: table.grade,
      comment: table.comment || "",
      finalizedAt: table.gradedAt || Date.now(),
    };
    PA_RESULTS.push(res);
  } else {
    res.score = table.score; res.grade = table.grade;
    res.comment = table.comment || res.comment;
    res.finalizedAt = table.gradedAt || Date.now();
  }
  savePaResults(); return res;
}

/** 打回考核表到指定状态 */
function rollbackPaTable(id, targetStatus) {
  const t = findPaTable(id); if (!t) return false;
  const validTargets = ["pending", "selfFilled", "supDone", "pmDone"];
  if (!validTargets.includes(targetStatus)) return false;
  t.status = targetStatus;
  // 根据目标状态清除对应的后续打分
  if (targetStatus === "pending") {
    t.items.forEach((it) => { it.pm = ""; it.sup = ""; it.leader = ""; });
    t.gradedBy = { pm: "", sup: "", leader: "" };
  } else if (targetStatus === "selfFilled") {
    t.items.forEach((it) => { it.pm = ""; it.sup = ""; it.leader = ""; });
    t.gradedBy = { pm: "", sup: "", leader: "" };
  } else if (targetStatus === "supDone") {
    t.items.forEach((it) => { it.pm = ""; it.leader = ""; });
    t.gradedBy.pm = ""; t.gradedBy.leader = "";
  } else if (targetStatus === "pmDone") {
    t.items.forEach((it) => { it.leader = ""; });
    t.gradedBy.leader = "";
  }
  t.score = null; t.grade = null;
  savePaTables();
  const ri = (PA_RESULTS || []).findIndex((r) =>
    r.ownerId === t.ownerId && r.period === t.period && r.type === t.type
  );
  if (ri !== -1) PA_RESULTS.splice(ri, 1); savePaResults();
  return true;
}

/** 年终考核：保存单个互评人的打分 */
function savePeerReviewerScore(tableId, reviewerId, scoreData) {
  const t = findPaTable(tableId); if (!t) return false;
  if (!t.peerReviewers || !t.peerReviewers.includes(reviewerId)) return false;
  t.peerScoreDetails = t.peerScoreDetails || {};
  t.peerScoreDetails[reviewerId] = Object.assign({ submittedAt: Date.now() }, scoreData);
  savePaTables();
  autoCalcPeerScores(tableId);
  return true;
}

/** 年终考核：自动计算互评平均分 */
function autoCalcPeerScores(tableId) {
  const t = findPaTable(tableId); if (!t) return false;
  if (!t.peerReviewers || t.peerReviewers.length === 0) return false;
  const details = t.peerScoreDetails || {};
  const submittedIds = Object.keys(details);
  const submittedCount = submittedIds.length;

  let avgScore = null;
  if (submittedCount > 0) {
    let sum = 0;
    submittedIds.forEach((rid) => {
      const d = details[rid];
      if (d && typeof d.score === "number") sum += d.score;
    });
    avgScore = Math.round((sum / submittedCount) * 10) / 10;
  }

  t.peerScores = {
    avg: avgScore !== null ? avgScore : 0,
    n: submittedCount,
    total: t.peerReviewers.length,
    pending: t.peerReviewers.filter((rid) => !details[rid]).length,
    auto: true,
    calcAt: Date.now(),
  };

  if (avgScore !== null) {
    t.items.forEach((it) => {
      if (it.category === "互评结果") it.leader = avgScore;
    });
  }
  savePaTables(); return true;
}

/** 年终考核：强制手动赋等级 */
function assignYearlyGrade(tableId, grade) {
  const t = findPaTable(tableId); if (!t) return false;
  if (t.type !== "yearly") return false;
  if (!t.score) { const c = _calcPaTableScore(t); t.score = c.score; t.grade = c.grade; }
  t.grade = grade;
  t.status = "finalized"; t.gradedAt = Date.now();
  _generatePaResultFromTable(t);
  savePaTables(); return true;
}

function resetPaTables() {
  PA_TABLES = DEFAULT_PA_TABLES.map((x) => ({ ...x, items: x.items.map((i) => ({ ...i })) }));
  savePaTables();
}
function resetPaResults() {
  PA_RESULTS = DEFAULT_PA_RESULTS.map((x) => ({ ...x }));
  savePaResults();
}

/** 统一重置绩效管理模块 */
function resetAllPa() {
  resetPaTemplates(); resetPaTasks(); resetPaTables(); resetPaResults();
}

/* ---------- 绩效管理：按工号 + 时间区间检索本人数据 ---------- */

function searchPaByOwnerAndPeriod(ownerId, options) {
  const { type, startPeriod, endPeriod, keyword, itemFilter } = options || {};
  let results = (PA_RESULTS || []).filter((r) => r.ownerId === ownerId);
  if (type) results = results.filter((r) => r.type === type);
  if (startPeriod) results = results.filter((r) => r.period >= startPeriod);
  if (endPeriod) results = results.filter((r) => r.period <= endPeriod);
  if (keyword) {
    const k = keyword.toLowerCase();
    results = results.filter((r) =>
      (r.grade || "").toLowerCase().includes(k) ||
      (r.comment || "").toLowerCase().includes(k) ||
      String(r.score).includes(k) ||
      r.period.includes(k)
    );
  }
  // 同时返回匹配的考核表（含每项得分详情）
  let tables = (PA_TABLES || []).filter((t) => t.ownerId === ownerId && t.status === "finalized");
  if (type) tables = tables.filter((t) => t.type === type);
  if (startPeriod) tables = tables.filter((t) => t.period >= startPeriod);
  if (endPeriod) tables = tables.filter((t) => t.period <= endPeriod);
  if (keyword) {
    const k = keyword.toLowerCase();
    tables = tables.filter((t) =>
      t.items.some((it) =>
        (it.task || "").toLowerCase().includes(k) ||
        (it.category || "").toLowerCase().includes(k) ||
        (it.standard || "").toLowerCase().includes(k)
      )
    );
  }
  if (itemFilter === "itemScore") {
    tables = tables.map((t) => ({
      ...t,
      items: t.items.map((it) => ({ task: it.task || it.category, leader: it.leader, category: it.category, weight: it.weight })),
    }));
  }
  return { results, tables };
}


/* ---------- 绩效管理 window 挂载 + 全局数据 getter ---------- */
window.loadAllPa = loadAllPa;
window._paBuildPeople = _paBuildPeople;
/** 全局数据（供 views.js 读取渲染） */
Object.defineProperty(window, "PA_TEMPLATES", { get: () => PA_TEMPLATES, configurable: true });
Object.defineProperty(window, "PA_TASKS", { get: () => PA_TASKS, configurable: true });
Object.defineProperty(window, "PA_TABLES", { get: () => PA_TABLES, configurable: true });
Object.defineProperty(window, "PA_RESULTS", { get: () => PA_RESULTS, configurable: true });
window.findPaPerson = findPaPerson;
window.findPaTemplate = findPaTemplate;
window.findActivePaTemplate = findActivePaTemplate;
window.listPaTemplateVersions = listPaTemplateVersions;
window.listPaTemplateTypes = listPaTemplateTypes;
window.listPaTemplateSubTypes = listPaTemplateSubTypes;
window.createPaTemplate = createPaTemplate;
window.updatePaTemplateMeta = updatePaTemplateMeta;
window.updatePaTemplateItems = updatePaTemplateItems;
window.deletePaTemplate = deletePaTemplate;
window.createPaTemplateNewVersion = createPaTemplateNewVersion;
window.activatePaTemplate = activatePaTemplate;
window.editPaTemplateAsNewVersion = editPaTemplateAsNewVersion;
window.resetPaTemplates = resetPaTemplates;
window.findPaTaskImport = findPaTaskImport;
window.listPaTaskImportByPeriod = listPaTaskImportByPeriod;
window.importPaTasks = importPaTasks;
window.deletePaTaskImportByPeriod = deletePaTaskImportByPeriod;
window.resetPaTasks = resetPaTasks;
window.findPaTable = findPaTable;
window.findPaTableByPeriod = findPaTableByPeriod;
window.createPaTable = createPaTable;
window.batchCreatePaTables = batchCreatePaTables;
window.deletePaTable = deletePaTable;
window.deletePaTablesByPeriod = deletePaTablesByPeriod;
window.updatePaTable = updatePaTable;
window.selfFillPaTable = selfFillPaTable;
window.submitPaTableSup = submitPaTableSup;
window.submitPaTablePM = submitPaTablePM;
window.finalizePaTableByLeader = finalizePaTableByLeader;
window.rollbackPaTable = rollbackPaTable;
window.resetPaTables = resetPaTables;
window.autoCalcPeerScores = autoCalcPeerScores;
window.savePeerReviewerScore = savePeerReviewerScore;
window.assignYearlyGrade = assignYearlyGrade;
window.resetPaResults = resetPaResults;
window.searchPaByOwnerAndPeriod = searchPaByOwnerAndPeriod;
window._calcPaTableScore = _calcPaTableScore;
window._isLongText = _isLongText;
window._shortText = _shortText;
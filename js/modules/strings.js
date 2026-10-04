/* ========== 文案常量统一管理 ========== */

/**
 * 页面标题与描述
 * key 对应 VIEWS 中的 viewName
 */
const PAGES = {
  home: {
    title: '平台总览',
    desc: '统一部署 · 统一入口 · 统一账号权限 · 两级日志审计。下方板块与子系统入口均按当前角色权限动态展示。',
    quickEntry: '板块快捷入口（仅展示您有权限的 {n} 个板块）',
    quickDesc: '当前角色「{role}」可访问的板块；无权限板块不会出现在导航中。',
  },
  stdHome: {
    title: '标准库',
    desc: '看板 · 智能检索 · 多维度筛选 · 在线阅览（动态水印）· 版本并存 · 标准维护（新建/升级/废止）',
  },
  ec: {
    title: '经验案例库',
    desc: '五段式经验沉淀 · 三级审核入库 · 点赞评论 · 查阅排名 · 动态水印',
  },
  ecSubmit: {
    title: '提交经验案例',
    desc: '提交后系统自动查重（标题 + 附件）；审核链：直接主管 → 部门领导 → 副总工',
  },
  paPeople: {
    title: '考核人员库',
    desc: '部门领导维护：工号 / 姓名 / 属性（员工/主管/项目经理）/ 部门小组 / 直接主管 / 部门领导',
  },
  paTemplate: {
    title: '考核表单模板管理',
    desc: '编辑月度/年终考核表单模板（分类、考核标准、权重），自动保存历史版本，启用最新版本',
  },
  paTableMonthly: {
    title: '月度绩效考核',
    desc: '项目经理 → 直接主管 → 部门领导 三级月度打分流程，高分自动预填，提交后不可修改',
  },
  paTableYearly: {
    title: '年度绩效考核',
    desc: '项目经理 → 直接主管 → 部门领导 三级年度打分流程，高分自动预填，支持互评与年度汇总',
  },
  paYearly: {
    title: '年终考核汇总',
    desc: '自动汇总当年月度成绩、生成互评分、强制生成年终得分、排序后手工赋等级',
  },
  paPeerMgmt: {
    title: '互评管理',
    desc: '批量配置互评人、查看互评提交进度、计算互评平均分（主管/项目经理年终考核专属）',
  },
  paPeerReview: {
    title: '年终绩效互评',
    desc: '主管 / 项目经理互评打分入口 — 对待评价的同事完成互评表单后，系统自动汇总为平均分',
  },
  paResult: {
    title: '考核结果查询 / 检索',
    desc: '按工号 + 时间区间 + 关键字检索月度/年终考核表、每项得分、汇总总分、等级、评价（数据永久保存）',
  },
  sysAcct: {
    title: '账号管理（系统管理员）',
    desc: '创建 / 维护登录账号，分配平台与子系统两级权限；操作全程留痕',
  },
  sysDept: {
    title: '部门管理（系统管理员）',
    desc: '维护组织架构部门，支持多级嵌套；部门数据供绩效、资产等模块引用',
  },
  sysRole: {
    title: '角色管理（系统管理员）',
    desc: '维护系统角色及其菜单权限范围；角色新增/删除影响全局，操作前请评估',
  },
  sysMenu: {
    title: '菜单管理（系统管理员）',
    desc: '维护系统的菜单模块和子菜单结构；修改后角色权限配置将自动同步，新增菜单默认对所有角色不可见',
  },
  sysLog: {
    title: '日志与审计（两级日志）',
    desc: '平台登录日志 + 子系统操作日志；防篡改留存，支持按人员 / 时间 / 动作筛选',
  },
  sysDict: {
    title: '数据字典管理',
    desc: '统一维护系统中各类下拉选项和分类标签（标准级别、所属领域、归口组织、状态等）；所有改动自动持久化',
  },
  placeholder: {
    title: '{name}（内部功能入口）',
    desc: '该功能暂未实现或已下线，占位用于演示导航与权限联动效果。',
  },
  'sub-spec': {
    title: '开发规范',
    desc: '研发过程中的各类规范文档集中管理，支持分类筛选、在线预览、版本对比与下载',
  },
  'sub-tpl': {
    title: '文档模板',
    desc: '可复用的文档模板库，覆盖产品/研发/测试/运维/管理全角色',
  },
  'sub-design': {
    title: '设计规范',
    desc: '统一视觉、组件、交互、布局规范，保障多端体验一致性',
  },
  'sub-check': {
    title: '评审 Checklist',
    desc: '研发、测试、需求、发布各环节评审检查项模板，支持勾选演示',
  },
};

/* ---------- 按钮文本 ---------- */
const BTN = {
  search: '检索标准',
  newStd: '+ 新建标准',
  newStdEntry: '+ 新建标准条目',
  view: '查看',
  searchAction: '搜索',
  reset: '重置',
  upgrade: '升级新版本',
  abolish: '废止',
  maintain: '维护',
  shareCase: '+ 分享案例',
  review: '审核管理（主管）',
  approve: '通过',
  reject: '退回',
  addPerson: '+ 新增人员',
  edit: '编辑',
  submitScore: '提交打分',
  rollback: '打回（领导）',
  addAcct: '+ 新增账号',
  resetPwd: '重置密码',
  permission: '权限',
  enable: '启用',
  disable: '停用',
  cancel: '取消',
  confirmSubmit: '确认提交并锁定',
  confirmNonDup: '确认非重复并提交',
  backAndEdit: '返回修改',
  confirmReturn: '确认退回',
  download: '下载（带水印）',
  preview: '预览/下载',
  viewOld: '查看旧版',
  submit: '提交',
  submitCase: '提交案例',
  query: '查询',
  addRole: '+ 新增角色',
  copyRole: '复制角色',
  viewMembers: '查看成员',
  builtin: '内置角色',
  custom: '自定义角色',
};

/* ---------- 表格表头 ---------- */
const TH = {
  std: {
    search: ['标准号', '中文名称', '级别', '性质', '状态', '实施日期', '操作'],
    maint: ['标准号', '名称', '发布日期', '实施日期', '版本', '状态', '操作'],
  },
  paPeople: ['工号', '姓名', '属性', '部门小组', '直接主管', '部门领导', '操作'],
  paTemplate: ['小类', '版本', '名称', '适用角色', '状态', '更新时间', '操作'],
  paTableMonthly: ['大类', '小类', '考核标准', '权重', '任务项', 'PM打分', '主管打分', '领导打分', 'PM评价', '主管评价', '领导评价'],
  paTableYearly: ['大类', '小类', '考核标准', '权重', '任务项', 'PM打分', '主管打分', '领导打分', 'PM评价', '主管评价', '领导评价'],
  paYearly: ['工号', '姓名', '全年月度平均分', '互评平均分', '综合得分', '排序', '最终等级', '操作'],
  paPeerMgmt: ['被考核人', '角色', '部门', '互评人', '状态', '互评平均分', '操作'],
  paPeerReview: ['被考核人', '期次', '状态', '操作'],
  paResult: ['类型', '期次', '被考核人', '汇总总分', '考核结果等级', '总评价', '生成时间'],
  sysAcct: ['账号', '姓名', '部门小组', '手机号码', '角色', '状态', '操作'],
  sysDept: ['部门编码', '部门名称', '操作'],
  sysRole: ['角色编码', '角色名称', '操作'],
  sysLog: ['时间', '人员', '类型', '动作', '对象'],
};

/* ---------- 状态标签 ---------- */
const STATUS = {
  current: '现行',
  obsolete: '已作废',
  replaced: '已被代替',
  aboutToExpire: '即将废止',
  pending: '待初审',
  deptReview: '部门审核中',
  chiefReview: '副总工审批中',
  returned: '已退回',
  enabled: '启用',
  disabled: '停用',
  loginLog: '登录日志',
  opLog: '操作日志',
};

/* 状态 → CSS class 映射 */
const STATUS_CLS = {
  current: 'ok',
  obsolete: 'danger',
  replaced: 'danger',
  aboutToExpire: 'warn',
  pending: 'p2',
  deptReview: 'p2',
  chiefReview: 'p2',
  returned: 'p3',
  enabled: 'ok',
  disabled: 'danger',
  loginLog: 'g',
  opLog: 'warn',
};

/* ---------- Toast 提示消息 ---------- */
const TOAST = {
  stdNew: '标准管理员入口：新建标准条目',
  stdNewForm: '打开新建标准条目表单：编号/名称/级别/性质/领域/归口/起草单位/附件…',
  stdUpgrade: '上传新版本文件；保存后老版本自动留存并记录替代关系',
  stdAbolish: '已标记废止：动态提醒将推送至订阅人员',
  stdViewHistory: '查看历史文本',
  dictMaintain: '增删改「{name}」字典项',
  addPersonForm: '打开新增人员表单（工号/姓名/属性…）',
  editPerson: '编辑 {name} 字段',
  addAcctForm: '打开新增账号表单：工号/姓名/角色/初始密码',
  resetPwd: '重置 {name} 的密码（将通知本人）',
  configPerm: '配置 {name} 的两级权限',
  toggleAcct: '{action}账号：{name}',
  ecSubmitOk: '已确认非重复，提交成功 → 进入主管初审',
  ecReturnOk: '已退回，提交人可修改重提',
  ecApprove: '已通过初审（质量：优秀，推广：大）',
  pwdReset: '已重置为默认密码（{pwd}），请通知本人尽快修改',
  scoreSubmitOk: '已提交，自动汇总至部门领导，本表锁定',
  rollbackOnly: '仅领导可打回：退回指定考核人重改',
  bellNotify: '您有 3 条标准上新提醒、2 条案例待审核',
  placeholderIntercept: '生产环境中该链接将被登录拦截器拦截，跳转至登录页',
  downloadDone: '已下载 PDF（服务端写入 张工+时间 水印）',
  loginSuccess: '登录成功！',
  logoutSuccess: '已退出登录',
  permSaved: '权限配置已保存（刷新页面后对所有角色生效）',
  permConfigOnly: '仅系统管理员可配置菜单权限',
  unknownRole: '未知角色，保存失败',
  noPermAccess: '当前角色「{role}」无权限访问「{module}」板块',
  addRoleForm: '打开新增角色表单：角色编码 / 显示名称 / 描述 / 权限范围',
  editRole: '编辑角色「{name}」的基本信息',
  copyRole: '复制角色「{name}」及其全部权限配置为新角色',
  roleBuiltin: '内置角色不可删除，仅可调整关联账号与权限范围',
  viewRoleMembers: '查看角色「{name}」下的全部 {n} 名成员',
  roleDesc: '角色说明（权限范围摘要）',
};

/* ---------- UI 通用文案 ---------- */
const UI = {
  // 弹窗
  returnTitle: '退回原因',
  returnPlaceholder: '请说明退回修改原因',
  submitConfirmTitle: '提交确认',
  submitConfirmText: '提交后以下人员将锁定打分，无法自行修改：',
  duplicateCheckTitle: '自动查重结果',
  duplicateCheckText: '系统已按「标题指纹 + 附件哈希」比对，发现 1 条疑似相似案例：',
  duplicateCheckAdvice: '如确认非重复，可继续提交；否则请修改标题或补充差异化内容。',
  similarity: '相似度 {pct}',
  scoreLockTip: '双方提交后本表自动流转至部门领导并锁定，提交后不可修改（需打回才能重改）。',
  // 表单占位
  keywordPlaceholder: '🔍 关键词：名称 / 编号 / 摘要（如 密封性试验）',
  caseTitlePlaceholder: '如：超声波燃气表计量漂移问题排查',
  productPlaceholder: '如：超声波燃气表 UG-200',
  addKeyword: '+ 添加关键字',
  datePlaceholder: '如 2026-09-17',
  // 标签/描述
  devSubDesc1: '标准管理员专属',
  devSubDesc2: '三级审核入库',
  devSubDesc3: '子系统入口',
  shortcutLabel: '快捷进入 · 仅显示您可见的子系统',
  clickEntry: '点击进入板块',
  // 角色标签
  roleStaff: '一般人员',
  roleStdAdmin: '标准管理员',
  roleSysAdmin: '系统管理员',
  roleLeader: '部门领导',
  roleDeptHead: '部门领导为本系统默认系统管理员，可对未提交者打回重改；提交后任何人不可再修改打分。',
  // 水印提示
  readerHint: '在线预览叠加「用户名+时间」动态水印，防止截屏泄密；翻页 / 放大缩小 / 全屏可用。',
  // 纳秒级时间戳弹窗
  nanoTitle: '高精度时间戳（纳秒级）',
  // 标准状态看板
  statusBoardTitle: '📊 标准状态看板',
  statusBoardTags: ['国标 312', '行标 168', '团标 45', '地标 22', '国际 18'],
  statusBoardOrgs: ['归口：中燃协 240', '住建部 156', '工程建设协会 89', '其他 80'],
  // 标准动态提醒
  alertTitle: '🔔 标准动态提醒',
  alertNewStd: '标准上新 · 近 1 月 5 条',
  alertNewStdItem: 'GB/T 6968-2026 膜式燃气表（现行）',
  alertExpire: '即将废止 2 条',
  alertExpireItem: 'CJ/T 112-2016（替代倒计时）',
  // 标准元数据
  metaLabels: ['标准编号', '中文名称', '发布日期', '实施日期', '状态', '级别 / 性质', '所属领域', '归口组织', '起草单位', '代替标准号'],
  metaValues: ['GB/T 6968-2026', '膜式燃气表', '2025-09-30', '2026-03-01', '', '国标 / 推荐', '膜式燃气表', '住建部', '中国城市燃气协会', 'GB/T 6968-2019'],
  pdfLabel: 'PDF 主文件',
  wordLabel: 'Word 附件',
  // 标准维护 - 字段字典
  fieldDictTitle: '所属领域字典',
  fieldDictDesc: '膜式燃气表 · 超声波燃气表 · MEMS热式燃气表 · 机械流量计 · 物联网 · 调压器 · 管网 · 场站…',
  orgDictTitle: '标准归口组织字典',
  orgDictDesc: '中燃协 · 住建部 · 中国工程建设协会…',
  dictMaintTitle: '标准条目维护',
  dictMaintLabel: '后台字段维护',
  // 案例提交 5 段式
  phases: ['① 问题描述', '② 问题分析过程', '③ 问题根因', '④ 解决方法', '⑤ 经验总结'],
  phasePlaceholders: ['描述现象与影响范围', '排查路径', '根本原因', '解决方案与验证', '可复用的经验'],
  // 案例提交敏感脱敏提示
  lockNoteCase: '⚠ 提交前请对正文与附件中的客户信息、用户信息、数量信息等敏感信息脱敏；主管初审将复核把关。',
  // 案例查重结果
  dupCaseTitle: '超声波燃气表计量漂移问题排查',
  dupCaseInfo: '分享人：王工 · 2025-08 · 硬件 · 查阅 642 次',
  // 考核流程
  paFlowSteps: ['进入考核表逐项打分', '项目经理/主管打分', '领导评分定级', '完成锁定'],
  paFlowTitle: '📊 当前考核流程状态',
  // 考核阶段描述
  paPeopleHint: '工号/姓名/属性/小组/主管维护',
  paTableHint: '创建/导入/逐项打分/汇总',
  paResultHint: '本人月度/年终结果',
  // 考核结果占位评价
  paResultComment: '工作质量稳定，重点项目贡献突出',
  // 考核确认
  paConfirmName: '张工 · 2026-02 月度',
  paConfirmDesc: '项目经理、主管已提交；领导评分待定（高分已预填）',
  // 日志类型
  logType: {
    platform: '平台登录日志',
    subsystem: '子系统操作日志',
  },
  // 日志动作
  logActions: {
    loginOk: '平台登录成功（Chrome 最新版）',
    preview: '在线预览（叠加水印）',
    download: '下载（已写入水印）',
    upload: '上传新版本',
    resetPwd: '重置账号密码',
  },
  // 日志对象
  logTargets: {
    cjt112: 'CJ/T 112-2016 → 2026 修订稿',
  },
  // 每页显示条数下拉
  perPageOptions: ['每页显示 20 条', '每页显示 50 条', '每页显示 100 条'],
  // 标准状态映射：数据库英文 key → 中文 label
  // 字典可选项（5 项）+ 系统内部流转状态（aboutToExpire/replaced 不出现在下拉，仅渲染用）
  statusMap: {
    current: '现行',
    abolished: '废止',
    draft: '草案',
    soliciting: '征求意见',
    submitted: '报批',
    aboutToExpire: '即将废止',
    replaced: '已被代替',
  },
  statusClsMap: {
    current: 'ok',
    abolished: 'bad',
    draft: 'warn',
    soliciting: 'warn',
    submitted: 'ok',
    aboutToExpire: 'warn',
    replaced: 'muted',
  },
};

/* ---------- 登录页文案 ---------- */
const LOGIN = {
  brand: '前卫表业',
  title: '研发OA综合平台',
  enTitle: 'R&D OA Integrated Platform',
  tip: '请先登录后才能访问本系统（未登录已拦截子系统访问）',
  userLabel: '用户名 Account',
  userPlaceholder: '请输入工号 / 账号',
  pwdLabel: '密码 Password',
  pwdPlaceholder: '请输入密码',
  btn: '登 录',
  warm: '温馨提示：如密码遗失，请联系工程技术研究中心！',
  demoLabel: '演示账号（点击自动填充账号与密码，角色由工号自动识别）：',
  demoStaff: '8001 一般人员',
  demoStdAdmin: '8002 标准管理员',
  demoSysAdmin: 'admin 系统管理员',
  emptyTip: '请输入工号 / 账号与密码后再登录',
  roleLabel: '角色：{name}',
  watermark: '研发OA综合平台 · 张工 · {date}',
};

/* ---------- 导航/菜单文案 ---------- */
const NAV = {
  brand: '研发OA综合平台',
  bell: '🔔',
  bellTitle: '收起/展开',
  avatarStaff: '张工 (8001)',
  roleLabel: '角色：{name}',
  permConfig: '⚙️ 权限配置',
  logout: '切换角色 / 退出登录',
  crumbHome: '首页 / <b>平台总览</b>',
};

/* ---------- 模块名称 ---------- */
const MODULE_NAMES = {
  home: '首页',
  proj: '项目管理',
  dev: '研发公共',
  asset: '过程资产',
  perf: '绩效管理',
  sys: '系统管理',
};

/* ---------- 空状态/占位 ---------- */
const EMPTY = {
  placeholderHint: '该子菜单对应的页面暂未开发实现，点击下方按钮可返回首页。',
  placeholderBtn: '返回首页',
};

/* ---------- 权限配置弹窗 ---------- */
const PERM = {
  title: '⚙️ 权限配置（系统管理员）',
  tip: '选择角色，勾选其可访问的模块与子菜单。配置持久化到 sessionStorage，刷新页面仍有效。',
  readonlyLabel: '🔒 只读',
  moduleCol: '模块 / 子系统',
  currentRole: '当前角色',
  staffLabel: '一般人员',
  stdAdminLabel: '标准管理员',
  sysAdminLabel: '系统管理员（内置）',
  save: '💾 保存配置',
  reset: '↻ 恢复默认',
  note: '系统管理员默认拥有所有菜单权限，不可修改。',
  saved: '角色「{role}」权限已保存',
  resetConfirm: '已恢复为默认权限配置',
};
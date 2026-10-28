/* ========== 文案常量统一管理 ========== */

/**
 * 页面标题与描述
 * key 对应 VIEWS 中的 viewName
 */
const PAGES = {
  home: {
    title: '工作台',
    desc: '统一入口 · 统一账号 · 统一权限',
  },
  portal: {
    title: '研发 OA 平台',
    en: 'R&D OA PLATFORM',
    desc: '统一入口 · 统一账号 · 统一权限 —— 各业务子系统的统一门户',
  },
  search: {
    title: '搜索结果',
    desc: '关键词「{q}」共命中 {n} 条结果，点击查看详情',
  },
  stdHome: {
    title: '标准库',
    desc: '看板 · 检索筛选 · 在线阅览 · 版本维护',
  },
  ec: {
    title: '经验案例库',
    desc: '五段式沉淀 · 三级审核 · 点赞评论',
  },
  ecSubmit: {
    title: '提交经验案例',
    desc: '提交后自动查重；审核链：主管 → 部门领导 → 副总工',
  },
  paPeople: {
    title: '考核人员库',
    desc: '维护工号、姓名、属性与汇报关系',
  },
  paTemplate: {
    title: '考核模板管理',
    desc: '维护考核表单模板，自动留存历史版本',
  },
  paTableMonthly: {
    title: '月度绩效考核',
    desc: 'PM → 主管 → 领导 三级月度打分',
  },
  paTableYearly: {
    title: '年度绩效考核',
    desc: 'PM → 主管 → 领导 三级年度打分',
  },
  paYearly: {
    title: '年终考核汇总',
    desc: '汇总月度与互评成绩，排序赋等级',
  },
  paPeerMgmt: {
    title: '互评管理',
    desc: '配置互评人，查看进度与平均分',
  },
  paPeerReview: {
    title: '我的互评任务',
    desc: '对待评价同事完成互评打分',
  },
  paResult: {
    title: '结果查询 / 检索',
    desc: '按工号与时间区间检索历史考核结果',
  },
  sysAcct: {
    title: '账号管理',
    desc: '创建与维护登录账号',
  },
  sysDept: {
    title: '部门管理',
    desc: '维护多级嵌套组织架构',
  },
  sysRole: {
    title: '角色管理',
    desc: '维护角色、菜单权限范围与门户可见卡片',
  },
  sysMenu: {
    title: '菜单管理',
    desc: '「门户配置」维护门户卡片（上架 / 排序 / 主题 / 角色），「子系统菜单」维护子系统菜单树',
  },
  sysLog: {
    title: '日志与审计',
    desc: '登录日志 · 操作日志',
  },
  sysDict: {
    title: '数据字典',
    desc: '维护下拉选项与分类标签',
  },
  sysNotice: {
    title: '通知公告',
    desc: '发布与维护通知、公告、制度',
  },
  placeholder: {
    title: '{name}（内部功能入口）',
    desc: '功能暂未实现，此处仅作导航与权限演示',
  },
  'sub-spec': {
    title: '开发规范',
    desc: '规范文档集中管理，支持筛选、预览与下载',
  },
  'sub-tpl': {
    title: '文档模板',
    desc: '可复用文档模板，覆盖全角色',
  },
  'sub-design': {
    title: '设计规范',
    desc: '统一视觉、组件与交互规范',
  },
  'sub-check': {
    title: '评审 Checklist',
    desc: '各环节评审检查项模板',
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
  newNotice: '+ 新增公告',
  publish: '发布',
  revoke: '撤回',
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
  sysRole: ['角色编码', '角色名称', '门户可见卡片', '操作'],
  sysLog: ['时间', '人员', '类型', '动作', '对象'],
  sysNotice: ['标题', '类型', '发布人', '发布时间', '置顶', '状态', '操作'],
  portalCfg: ['排序', '门户卡', '类型', '状态', '可见角色', '描述', '操作'],
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
  stdNew: '新建标准条目',
  stdNewForm: '新建标准条目表单',
  stdUpgrade: '上传新版本，老版本自动留存',
  stdAbolish: '已标记废止',
  stdViewHistory: '查看历史文本',
  dictMaintain: '增删改「{name}」字典项',
  addPersonForm: '新增人员表单',
  editPerson: '编辑 {name} 字段',
  addAcctForm: '新增账号表单',
  resetPwd: '重置 {name} 的密码',
  configPerm: '配置 {name} 的权限',
  toggleAcct: '{action}账号：{name}',
  ecSubmitOk: '已提交，进入主管初审',
  ecReturnOk: '已退回，提交人可修改重提',
  ecApprove: '已通过初审（质量：优秀，推广：大）',
  pwdReset: '已重置为默认密码 {pwd}',
  scoreSubmitOk: '已提交，本表已锁定',
  rollbackOnly: '仅领导可打回：退回指定考核人重改',
  bellNotify: '您有 3 条标准上新提醒、2 条案例待审核',
  placeholderIntercept: '生产环境将跳转至登录页',
  downloadDone: '已下载（已写入水印）',
  loginSuccess: '登录成功！',
  logoutSuccess: '已退出登录',
  permSaved: '权限已保存',
  permConfigOnly: '仅系统管理员可配置菜单权限',
  unknownRole: '未知角色，保存失败',
  noPermAccess: '「{role}」无权访问「{module}」',
  addRoleForm: '新增角色表单',
  editRole: '编辑角色「{name}」的基本信息',
  copyRole: '复制角色「{name}」及全部权限',
  roleBuiltin: '内置角色不可删除',
  viewRoleMembers: '查看「{name}」的 {n} 名成员',
  roleDesc: '角色说明',
};

/* ---------- UI 通用文案 ---------- */
const UI = {
  // 弹窗
  returnTitle: '退回原因',
  returnPlaceholder: '请说明退回修改原因',
  submitConfirmTitle: '提交确认',
  submitConfirmText: '提交后以下人员将锁定，无法自行修改：',
  duplicateCheckTitle: '自动查重结果',
  duplicateCheckText: '发现 1 条疑似相似案例：',
  duplicateCheckAdvice: '确认非重复可继续提交，否则请修改标题或补充差异内容。',
  similarity: '相似度 {pct}',
  scoreLockTip: '双方提交后本表将锁定，需打回才能重改。',
  // 表单占位
  keywordPlaceholder: '🔍 关键词：名称 / 编号 / 摘要',
  caseTitlePlaceholder: '如：超声波燃气表计量漂移问题排查',
  productPlaceholder: '如：超声波燃气表 UG-200',
  addKeyword: '+ 添加关键字',
  datePlaceholder: '如 2026-09-17',
  // 角色标签
  roleStaff: '一般人员',
  roleStdAdmin: '标准管理员',
  roleSysAdmin: '系统管理员',
  roleLeader: '部门领导',
  roleDeptHead: '部门领导即默认系统管理员，可打回未提交者',
  // 水印提示
  readerHint: '预览叠加「用户名+时间」动态水印，防截屏泄密',
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
  tip: '请先登录后访问本系统',
  userLabel: '用户名 Account',
  userPlaceholder: '请输入工号 / 账号',
  pwdLabel: '密码 Password',
  pwdPlaceholder: '请输入密码',
  btn: '登 录',
  warm: '如密码遗失，请联系工程技术研究中心',
  demoLabel: '演示账号（点击自动填充）：',
  demoStaff: '8001 一般人员',
  demoStdAdmin: '8002 标准管理员',
  demoSysAdmin: 'admin 系统管理员',
  emptyTip: '请输入工号与密码',
  roleLabel: '角色：{name}',
  watermark: '研发OA综合平台 · 张工 · {date}',
};

/* ---------- 通知公告 ---------- */
const NOTICE = {
  types: { notice: '通知', announce: '公告', policy: '制度' },
  statusPublished: '已发布',
  statusDraft: '草稿',
  publish: '发布',
  revoke: '撤回',
  addTitle: '📢 新增公告',
  editTitle: '✏️ 编辑公告',
  labelTitle: '标题',
  labelType: '类型',
  labelContent: '正文内容',
  labelTop: '置顶展示',
  labelStatus: '状态',
  titlePlaceholder: '请输入公告标题',
  contentPlaceholder: '请输入公告正文内容…',
  delConfirm: '确定删除公告「{name}」吗？删除后不可恢复。',
  saved: '公告已保存',
  deleted: '公告已删除',
  topTip: '置顶后在工作台公告面板最前方展示',
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
  crumbHome: '<b>工作台</b>',
  crumbPortal: '主系统',
  backToModule: '← 返回{module}',
  backToGroup: '← 返回{group}',
  backToPortal: '← 返回主系统',
  portalHelloSub: '今日是努力工作的好日子，祝你工作顺利！',
  /* crumb 公告条（v4：侧栏公告下线，最新一条置顶于面包屑行；v5.9 去掉「查看更多」） */
  /* 首页左侧栏（v3）：侧栏仅留用户卡与常用应用，主区纯系统入口 */
  sideFav: '🧭 常用应用',
  sideFavManage: '管理',
  sideFavEmpty: '暂无常用应用',
  /* 侧栏系统管理入口（v5：原主区平台入口卡迁入侧栏，仅 sysAdmin 可见） */
  sideSys: '⚙️ 系统管理',
  sideAdminTag: '管理员',
  /* 侧栏待办摘要行（v5.2：紧凑摘要徽标，点击弹铃铛待办面板；非完整列表） */
  sideTd: '⏳ 我的待办',
  sideTdUnit: '条待办',
  sideTdNone: '暂无待办',
  /* 侧栏最近访问（v5.2：自动记录最近进入的子系统，按账号隔离，最多 8 条） */
  sideRecent: '🕘 最近访问',
  sideRecentEmpty: '暂无访问记录',
  /* 用户卡日期进度小字（v5.2） */
  sideDateProgress: '本周第 {wd} 天 · 今年第 {yd} 天 · 距月末 {left} 天',
};

/* ---------- 板块主题色（OA 门户磁贴用） ---------- */
const MODULE_THEME = {
  proj: '#1677ff',
  dev: '#52c41a',
  asset: '#13c2c2',
  perf: '#722ed1',
  sys: '#fa8c16',
};

/* ---------- 模块描述（工作台「全部板块」卡片副标题；自定义模块无描述时不显示该行） ---------- */
const MODULE_DESC = {
  proj: '研发项目计划、进度看板与任务协同',
  dev: '标准信息、经验沉淀与研发工具集',
  asset: '开发规范、文档模板与设计 Checklist',
  sys: '账号权限、两级日志与审计',
};

/* ---------- 子系统描述（板块首页 / 三级分组页磁贴副标题；运行时新增菜单无描述时不显示该行） ---------- */
const SUB_DESC = {
  pdr: '研发设计方案提交、评审与归档',
  psr: '项目阶段里程碑评审跟踪',
  stdHome: '标准文档看板、检索与在线阅读',
  ec: '研发问题案例沉淀与三级审核',
  'sub-spec': '结构设计、接口定义、编码风格等规范',
  'sub-tpl': '可复用文档模板，覆盖全角色',
  'sub-design': '统一视觉、组件、交互与布局规范',
  'sub-check': '研发、测试、需求、发布评审检查项',
  paTemplate: '维护月度 / 年度考核表单模板',
  paTableMonthly: 'PM → 主管 → 领导三级打分',
  paYearlyMgmt: '年度打分、互评任务与年终汇总的一站式管理',
  paTableYearly: '年度模板三级打分，考核全年',
  paPeerMgmt: '批量配置互评人，查看提交进度',
  paPeerReview: '分配给自己的互评任务列表',
  paResult: '按工号与时间区间查询历史结果',
  paYearly: '汇总月度与互评分，排序赋等级',
  sysAcct: '管理登录账号、密码与启用状态',
  sysDept: '维护多级嵌套组织架构',
  sysRole: '维护角色与权限配置',
  sysMenu: '维护系统菜单树结构',
  sysDict: '维护系统数据字典',
  sysLog: '查看操作日志与审计记录',
  sysNotice: '发布与维护通知公告',
};

/* ---------- 模块名称 ---------- */
const MODULE_NAMES = {
  home: '工作台',
  proj: '项目管理',
  dev: '研发公共',
  asset: '过程资产',
  perf: '绩效管理',
  sys: '系统管理',
};

/* ---------- 空状态/占位 ---------- */
const EMPTY = {
  placeholderHint: '该页面暂未实现',
  placeholderBtn: '返回工作台',
};

/* ---------- 权限配置弹窗 ---------- */
const PERM = {
  title: '⚙️ 权限配置（系统管理员）',
  tip: '选择角色，勾选其可访问的模块与子菜单',
  readonlyLabel: '🔒 只读',
  moduleCol: '模块 / 子系统',
  currentRole: '当前角色',
  staffLabel: '一般人员',
  stdAdminLabel: '标准管理员',
  sysAdminLabel: '系统管理员（内置）',
  save: '💾 保存配置',
  note: '系统管理员默认拥有所有菜单权限，不可修改。',
  saved: '角色「{role}」权限已保存',
};
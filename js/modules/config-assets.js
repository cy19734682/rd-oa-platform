/* ========== 过程资产模块 · config-assets.js ========== */
/* 包含：开发规范 / 文档模板 / 设计规范 / 评审 Checklist 4 类种子与 CRUD */
/* 依赖基座 config.js 中的 _loadArr / _save 辅助函数 */

/* ================================================================
*  过程资产模块：开发规范 / 文档模板 / 设计规范 / 评审 Checklist
*  统一使用 sessionStorage 持久化，关闭浏览器标签页即清除
* ================================================================ */

/* ---------- 开发规范 ---------- */

/** 默认种子：首次启动写入 sessionStorage */
const DEFAULT_ASSET_SPECS = [
  {
    id: "spec_001",
    title: "JavaScript 编码规范",
    category: "编码规范",
    version: "v1.2",
    desc: "统一研发团队 JavaScript 编码风格，涵盖命名、格式、异步、错误处理等核心规则",
    content: "## 1. 命名规范\n\n- 变量 / 函数：小驼峰（camelCase）\n- 常量：全大写下划线（UPPER_CASE）\n- 类 / 构造函数：大驼峰（PascalCase）\n- 私有属性：下划线前缀 _private\n\n## 2. 格式规范\n\n- 缩进：2 空格，不使用 Tab\n- 单行长度上限：120 字符\n- 分号：语句结尾必须加分号\n\n## 3. 异步规范\n\n- 优先使用 async/await 代替 .then()\n- Promise 必须 catch，禁止裸 Promise\n- 禁止在循环中使用 await（改用 Promise.all）",
    tags: ["JS", "前端", "团队"],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "spec_002",
    title: "Git 提交规范",
    category: "Git规范",
    version: "v1.0",
    desc: "统一 Git Commit Message 格式，支持自动生成变更日志",
    content: "## Commit Message 格式\n\n`<type>(<scope>): <subject>`\n\n### type 取值\n\n- feat：新功能\n- fix：Bug 修复\n- docs：文档\n- style：格式（不影响代码运行）\n- refactor：重构\n- test：测试\n- chore：构建 / 工具\n\n### 示例\n\n```\nfeat(auth): 新增 SSO 单点登录\nfix(std): 修复标准检索分页越界问题\n```",
    tags: ["Git", "协作"],
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: "spec_003",
    title: "代码注释规范",
    category: "注释规范",
    version: "v1.1",
    desc: "什么时候注释、怎么注释、什么不该注释",
    content: "## 原则\n\n- 好的代码本身就是最好的注释\n- 注释应解释「为什么」，而非「做什么」\n\n## 必填注释\n\n- 公共函数 / 组件：JSDoc\n- 复杂业务逻辑：块级注释\n- Hack / 临时 workaround：标记 TODO + 关联 Issue\n\n## 禁止注释\n\n- 被注释掉的代码（Git 可追溯）\n- 显而易见的代码：`i++ // i 加 1`",
    tags: ["通用"],
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: "spec_004",
    title: "安全编码规范",
    category: "编码规范",
    version: "v2.0",
    desc: "XSS、注入、敏感信息等安全红线",
    content: "## 1. 输入校验\n\n- 所有外部输入必须校验白名单\n- 前端展示使用 textContent 而非 innerHTML\n- URL 参数使用 encodeURIComponent\n\n## 2. 敏感信息\n\n- 禁止在前端代码中硬编码密钥 / 密码\n- 日志中脱敏敏感字段\n\n## 3. 依赖安全\n\n- 定期扫描 npm audit\n- 引入新依赖前评估维护状态",
    tags: ["安全"],
    createdAt: Date.now() - 86400000 * 45,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: "spec_005",
    title: "分支管理规范",
    category: "Git规范",
    version: "v1.3",
    desc: "基于 GitFlow 的分支模型",
    content: "## 分支类型\n\n- main：生产分支，保护分支\n- develop：开发集成分支\n- feature/*：功能分支，从 develop 切出\n- hotfix/*：紧急修复，从 main 切出\n- release/*：预发布分支\n\n## 命名规则\n\n`feature/模块-简短描述`\n`hotfix/issue123-描述`",
    tags: ["Git", "流程"],
    createdAt: Date.now() - 86400000 * 60,
    updatedAt: Date.now() - 86400000 * 12,
  },
];

let ASSET_SPECS = null;

function loadAssetSpecs() {
  let stored = null;
  try {
    const raw = sessionStorage.getItem(ASSET_SPEC_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}
  if (Array.isArray(stored) && stored.length > 0) {
    ASSET_SPECS = stored;
  } else {
    ASSET_SPECS = DEFAULT_ASSET_SPECS.map((x) => ({ ...x }));
    saveAssetSpecs();
  }
}
function saveAssetSpecs() {
  try {
    sessionStorage.setItem(ASSET_SPEC_KEY, JSON.stringify(ASSET_SPECS));
  } catch (e) {}
}
function findAssetSpec(id) {
  return (ASSET_SPECS || []).find((x) => x.id === id);
}
function addAssetSpec(data) {
  if (!data.title) return null;
  const id = "spec_" + Date.now();
  const now = Date.now();
  const item = {
    id,
    title: data.title,
    category: data.category || "编码规范",
    version: data.version || "v1.0",
    desc: data.desc || "",
    content: data.content || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: now,
    updatedAt: now,
  };
  ASSET_SPECS.push(item);
  saveAssetSpecs();
  return item;
}
function updateAssetSpec(id, patch) {
  const a = findAssetSpec(id);
  if (!a) return false;
  const allowed = ["title", "category", "version", "desc", "content", "tags"];
  allowed.forEach((k) => {
    if (patch[k] !== undefined) a[k] = patch[k];
  });
  a.updatedAt = Date.now();
  saveAssetSpecs();
  return true;
}
function deleteAssetSpec(id) {
  const i = (ASSET_SPECS || []).findIndex((x) => x.id === id);
  if (i === -1) return false;
  ASSET_SPECS.splice(i, 1);
  saveAssetSpecs();
  return true;
}
function resetAssetSpecs() {
  ASSET_SPECS = DEFAULT_ASSET_SPECS.map((x) => ({ ...x }));
  saveAssetSpecs();
}
function getAssetSpecCategories() {
  const cats = new Set();
  (ASSET_SPECS || []).forEach((x) => x.category && cats.add(x.category));
  return Array.from(cats);
}

/* ---------- 文档模板 ---------- */

const DEFAULT_ASSET_TPLS = [
  {
    id: "tpl_001",
    title: "需求规格说明书",
    category: "产品",
    fileType: "Markdown",
    desc: "标准产品需求文档模板，含背景、目标、功能需求、非功能需求",
    content: "# 需求规格说明书\n\n## 1. 引言\n### 1.1 编写目的\n### 1.2 项目背景\n### 1.3 术语与缩写\n\n## 2. 总体描述\n### 2.1 产品视角\n### 2.2 用户特征\n### 2.3 运行环境\n\n## 3. 功能需求\n### 3.1 功能模块划分\n### 3.2 功能点详述\n\n## 4. 非功能需求\n### 4.1 性能需求\n### 4.2 安全需求\n### 4.3 兼容性需求\n\n## 5. 验收标准",
    createdAt: Date.now() - 86400000 * 40,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: "tpl_002",
    title: "技术方案设计",
    category: "研发",
    fileType: "Markdown",
    desc: "技术选型、架构设计、接口定义、风险评估",
    content: "# 技术方案设计\n\n## 1. 需求分析\n### 1.1 业务背景\n### 1.2 技术挑战\n\n## 2. 总体方案\n### 2.1 技术选型\n### 2.2 架构图\n### 2.3 关键流程\n\n## 3. 详细设计\n### 3.1 模块划分\n### 3.2 接口定义\n### 3.3 数据结构\n\n## 4. 风险与应对\n\n## 5. 里程碑计划",
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "tpl_003",
    title: "测试用例模板",
    category: "测试",
    fileType: "Excel",
    desc: "结构化测试用例，含用例ID、前置条件、步骤、预期结果",
    content: "| 用例ID | 模块 | 用例标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 |\n|--------|------|----------|----------|----------|----------|--------|\n| TC-001 | 登录 | 正常登录 | 用户已注册 | 1. 打开登录页 2. 输入账号密码 3. 点击登录 | 跳转首页 | P0 |",
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "tpl_004",
    title: "发布 Checklist",
    category: "运维",
    fileType: "Markdown",
    desc: "上线前检查清单，覆盖代码、配置、数据、回滚预案",
    content: "# 发布 Checklist\n\n## 代码\n- [ ] 所有 Merge Request 已合并\n- [ ] CI 流水线全绿\n- [ ] 无已知 P0/P1 Bug\n\n## 配置\n- [ ] 环境变量已更新\n- [ ] 数据库变更脚本已准备\n- [ ] 第三方依赖版本确认\n\n## 回滚\n- [ ] 回滚方案已文档化\n- [ ] 数据回滚脚本已测试",
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: "tpl_005",
    title: "周会汇报模板",
    category: "管理",
    fileType: "Markdown",
    desc: "标准周报格式：本周完成、下周计划、风险阻塞",
    content: "# 周报 — {姓名} {日期}\n\n## 本周完成\n1. \n2. \n\n## 下周计划\n1. \n2. \n\n## 风险与阻塞\n- \n\n## 需要的支持\n- ",
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 1,
  },
];

let ASSET_TPLS = null;

function loadAssetTpls() {
  let stored = null;
  try {
    const raw = sessionStorage.getItem(ASSET_TPL_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}
  if (Array.isArray(stored) && stored.length > 0) {
    ASSET_TPLS = stored;
  } else {
    ASSET_TPLS = DEFAULT_ASSET_TPLS.map((x) => ({ ...x }));
    saveAssetTpls();
  }
}
function saveAssetTpls() {
  try {
    sessionStorage.setItem(ASSET_TPL_KEY, JSON.stringify(ASSET_TPLS));
  } catch (e) {}
}
function findAssetTpl(id) {
  return (ASSET_TPLS || []).find((x) => x.id === id);
}
function addAssetTpl(data) {
  if (!data.title) return null;
  const id = "tpl_" + Date.now();
  const now = Date.now();
  const item = {
    id,
    title: data.title,
    category: data.category || "产品",
    fileType: data.fileType || "Markdown",
    desc: data.desc || "",
    content: data.content || "",
    createdAt: now,
    updatedAt: now,
  };
  ASSET_TPLS.push(item);
  saveAssetTpls();
  return item;
}
function updateAssetTpl(id, patch) {
  const a = findAssetTpl(id);
  if (!a) return false;
  const allowed = ["title", "category", "fileType", "desc", "content"];
  allowed.forEach((k) => {
    if (patch[k] !== undefined) a[k] = patch[k];
  });
  a.updatedAt = Date.now();
  saveAssetTpls();
  return true;
}
function deleteAssetTpl(id) {
  const i = (ASSET_TPLS || []).findIndex((x) => x.id === id);
  if (i === -1) return false;
  ASSET_TPLS.splice(i, 1);
  saveAssetTpls();
  return true;
}
function resetAssetTpls() {
  ASSET_TPLS = DEFAULT_ASSET_TPLS.map((x) => ({ ...x }));
  saveAssetTpls();
}
function getAssetTplCategories() {
  const cats = new Set();
  (ASSET_TPLS || []).forEach((x) => x.category && cats.add(x.category));
  return Array.from(cats);
}

/* ---------- 设计规范 ---------- */

const DEFAULT_ASSET_DESIGNS = [
  {
    id: "design_001",
    title: "色彩系统规范",
    category: "视觉规范",
    version: "v2.0",
    desc: "统一平台主色、语义色、中性色定义与使用规则",
    coverColor: "#1890ff",
    content: "## 主色\n\n- Primary：#1890ff（品牌蓝）\n- Hover：#40a9ff\n- Active：#096dd9\n- Light：#e6f7ff\n\n## 语义色\n\n- 成功：#52c41a\n- 警告：#faad14\n- 错误：#ff4d4f\n- 信息：#1890ff\n\n## 中性色\n\n- 标题：#1f1f1f\n- 正文：#333333\n- 次要：#666666\n- 辅助：#999999\n- 边框：#e8e8e8",
    createdAt: Date.now() - 86400000 * 60,
    updatedAt: Date.now() - 86400000 * 15,
  },
  {
    id: "design_002",
    title: "字体与排版",
    category: "视觉规范",
    version: "v1.0",
    desc: "字号层级、行高、字重、字体族统一约定",
    coverColor: "#333333",
    content: "## 字体族\n\n```\nfont-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',\n  'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;\n```\n\n## 字号层级\n\n| 层级 | 字号 | 字重 | 用途 |\n|------|------|------|------|\n| H1 | 24px | 600 | 页面大标题 |\n| H2 | 20px | 600 | 区块标题 |\n| H3 | 16px | 600 | 卡片标题 |\n| Body | 14px | 400 | 正文 |\n| Caption | 12px | 400 | 辅助文字 |\n\n## 行高\n\n- 正文：1.6\n- 标题：1.4",
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: "design_003",
    title: "按钮组件规范",
    category: "组件规范",
    version: "v1.2",
    desc: "按钮尺寸、类型、状态、组合使用规则",
    coverColor: "#52c41a",
    content: "## 类型\n\n- Primary：主操作实心\n- Default：次级操作描边\n- Danger：危险操作\n- Link：链接型\n\n## 尺寸\n\n- Large：高度 40px，字号 16px\n- Medium：高度 32px，字号 14px（默认）\n- Small：高度 24px，字号 12px\n\n## 状态\n\n- Default / Hover / Active / Disabled / Loading",
    createdAt: Date.now() - 86400000 * 35,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: "design_004",
    title: "间距与栅格",
    category: "布局规范",
    version: "v1.0",
    desc: "8px 基础栅格系统，内外边距统一规则",
    coverColor: "#722ed1",
    content: "## 基础单位\n\n8px 栅格系统，所有间距为 8 的倍数：\n- 紧凑：4px\n- 标准：8px / 16px\n- 宽松：24px / 32px\n\n## 页面栅格\n\n- 最大宽度：1440px\n- 主栏：24 栅格（左 6 + 右 18）\n- 卡片内边距：24px",
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "design_005",
    title: "表单交互规范",
    category: "交互规范",
    version: "v1.1",
    desc: "表单布局、校验反馈、键盘导航、错误提示",
    coverColor: "#faad14",
    content: "## 布局\n\n- 标签在上（移动端 / 短表单）\n- 标签在左（桌面端 / 长表单）\n- 必填项：红色 * 标记\n\n## 校验\n\n- 失焦触发校验\n- 错误信息紧跟字段下方\n- 提交时全量校验\n\n## 键盘\n\n- Tab 顺序与视觉顺序一致\n- Enter 提交表单（多行文本除外）\n- Esc 关闭弹窗 / 取消操作",
    createdAt: Date.now() - 86400000 * 18,
    updatedAt: Date.now() - 86400000 * 4,
  },
];

let ASSET_DESIGNS = null;

function loadAssetDesigns() {
  let stored = null;
  try {
    const raw = sessionStorage.getItem(ASSET_DESIGN_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}
  if (Array.isArray(stored) && stored.length > 0) {
    ASSET_DESIGNS = stored;
  } else {
    ASSET_DESIGNS = DEFAULT_ASSET_DESIGNS.map((x) => ({ ...x }));
    saveAssetDesigns();
  }
}
function saveAssetDesigns() {
  try {
    sessionStorage.setItem(ASSET_DESIGN_KEY, JSON.stringify(ASSET_DESIGNS));
  } catch (e) {}
}
function findAssetDesign(id) {
  return (ASSET_DESIGNS || []).find((x) => x.id === id);
}
function addAssetDesign(data) {
  if (!data.title) return null;
  const id = "design_" + Date.now();
  const now = Date.now();
  const item = {
    id,
    title: data.title,
    category: data.category || "视觉规范",
    version: data.version || "v1.0",
    desc: data.desc || "",
    content: data.content || "",
    coverColor: data.coverColor || "#1890ff",
    createdAt: now,
    updatedAt: now,
  };
  ASSET_DESIGNS.push(item);
  saveAssetDesigns();
  return item;
}
function updateAssetDesign(id, patch) {
  const a = findAssetDesign(id);
  if (!a) return false;
  const allowed = ["title", "category", "version", "desc", "content", "coverColor"];
  allowed.forEach((k) => {
    if (patch[k] !== undefined) a[k] = patch[k];
  });
  a.updatedAt = Date.now();
  saveAssetDesigns();
  return true;
}
function deleteAssetDesign(id) {
  const i = (ASSET_DESIGNS || []).findIndex((x) => x.id === id);
  if (i === -1) return false;
  ASSET_DESIGNS.splice(i, 1);
  saveAssetDesigns();
  return true;
}
function resetAssetDesigns() {
  ASSET_DESIGNS = DEFAULT_ASSET_DESIGNS.map((x) => ({ ...x }));
  saveAssetDesigns();
}
function getAssetDesignCategories() {
  const cats = new Set();
  (ASSET_DESIGNS || []).forEach((x) => x.category && cats.add(x.category));
  return Array.from(cats);
}

/* ---------- 评审 Checklist ---------- */

const DEFAULT_ASSET_CHECKS = [
  {
    id: "check_001",
    title: "代码评审 Checklist",
    category: "研发",
    desc: "代码提交前的评审检查项，研发团队通用",
    items: [
      { text: "代码符合项目编码规范", checked: false },
      { text: "变量 / 函数命名清晰，无歧义缩写", checked: false },
      { text: "无硬编码的敏感信息（密钥、密码）", checked: false },
      { text: "无重复代码，可复用部分已抽取", checked: false },
      { text: "复杂逻辑有注释说明", checked: false },
      { text: "异常路径有处理，无裸 catch", checked: false },
      { text: "单元测试覆盖核心分支", checked: false },
      { text: "依赖版本已确认无安全漏洞", checked: false },
    ],
    createdAt: Date.now() - 86400000 * 50,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: "check_002",
    title: "UI 评审 Checklist",
    category: "设计",
    desc: "界面走查 / 视觉还原度 / 交互一致性",
    items: [
      { text: "设计稿还原度 ≥ 95%（间距/颜色/字号）", checked: false },
      { text: "所有元素对齐栅格线", checked: false },
      { text: "颜色使用规范色板内的值", checked: false },
      { text: "按钮 / 表单 / 弹窗交互一致", checked: false },
      { text: "空状态 / 加载中 / 错误态已处理", checked: false },
      { text: "长文本 / 极端数据下布局不崩溃", checked: false },
      { text: "主流浏览器兼容性已测试", checked: false },
      { text: "暗色模式（如有）已适配", checked: false },
    ],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "check_003",
    title: "需求评审 Checklist",
    category: "需求",
    desc: "需求文档评审，确保可开发、可测试、可验收",
    items: [
      { text: "业务目标清晰，价值可量化", checked: false },
      { text: "用户故事完整（As a... I want... So that...）", checked: false },
      { text: "功能边界明确，异常流已覆盖", checked: false },
      { text: "非功能需求（性能/安全/兼容性）有定义", checked: false },
      { text: "验收标准可测试、无歧义", checked: false },
      { text: "依赖的外部系统 / 数据已确认", checked: false },
      { text: "上线节奏与发布窗口已对齐", checked: false },
    ],
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: "check_004",
    title: "发布 Checklist",
    category: "发布",
    desc: "生产环境上线前的最终检查",
    items: [
      { text: "所有 MR 已合并到目标分支", checked: false },
      { text: "CI / CD 流水线全部通过", checked: false },
      { text: "无已知 P0 / P1 级 Bug", checked: false },
      { text: "数据库变更脚本已准备并测试", checked: false },
      { text: "环境变量 / 配置文件已更新", checked: false },
      { text: "回滚方案已文档化并演练", checked: false },
      { text: "监控告警已配置", checked: false },
      { text: "相关文档已同步更新", checked: false },
    ],
    createdAt: Date.now() - 86400000 * 40,
    updatedAt: Date.now() - 86400000 * 12,
  },
];

let ASSET_CHECKS = null;

function loadAssetChecks() {
  let stored = null;
  try {
    const raw = sessionStorage.getItem(ASSET_CHECK_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}
  if (Array.isArray(stored) && stored.length > 0) {
    ASSET_CHECKS = stored;
  } else {
    ASSET_CHECKS = DEFAULT_ASSET_CHECKS.map((x) => ({
      ...x,
      items: x.items.map((i) => ({ ...i })),
    }));
    saveAssetChecks();
  }
}
function saveAssetChecks() {
  try {
    sessionStorage.setItem(ASSET_CHECK_KEY, JSON.stringify(ASSET_CHECKS));
  } catch (e) {}
}
function findAssetCheck(id) {
  return (ASSET_CHECKS || []).find((x) => x.id === id);
}
function addAssetCheck(data) {
  if (!data.title) return null;
  const id = "check_" + Date.now();
  const now = Date.now();
  const item = {
    id,
    title: data.title,
    category: data.category || "研发",
    desc: data.desc || "",
    items: Array.isArray(data.items) ? data.items.map((i) => ({ text: i.text || "", checked: !!i.checked })) : [],
    createdAt: now,
    updatedAt: now,
  };
  ASSET_CHECKS.push(item);
  saveAssetChecks();
  return item;
}
function updateAssetCheck(id, patch) {
  const a = findAssetCheck(id);
  if (!a) return false;
  const allowed = ["title", "category", "desc", "items"];
  allowed.forEach((k) => {
    if (patch[k] !== undefined) {
      if (k === "items") {
        a.items = patch[k].map((i) => ({ text: i.text || "", checked: !!i.checked }));
      } else {
        a[k] = patch[k];
      }
    }
  });
  a.updatedAt = Date.now();
  saveAssetChecks();
  return true;
}
function deleteAssetCheck(id) {
  const i = (ASSET_CHECKS || []).findIndex((x) => x.id === id);
  if (i === -1) return false;
  ASSET_CHECKS.splice(i, 1);
  saveAssetChecks();
  return true;
}
function resetAssetChecks() {
  ASSET_CHECKS = DEFAULT_ASSET_CHECKS.map((x) => ({
    ...x,
    items: x.items.map((i) => ({ ...i })),
  }));
  saveAssetChecks();
}
function getAssetCheckCategories() {
  const cats = new Set();
  (ASSET_CHECKS || []).forEach((x) => x.category && cats.add(x.category));
  return Array.from(cats);
}

/** 统一初始化过程资产模块（应用启动时调用一次） */
function loadAllAssets() {
  loadAssetSpecs();
  loadAssetTpls();
  loadAssetDesigns();
  loadAssetChecks();
}


/* ---------- 过程资产 window 挂载 ---------- */
/* 过程资产模块统一初始化入口（在 app.js 启动时调用） */
window.loadAllAssets = loadAllAssets;
window.findAssetSpec = findAssetSpec;
window.addAssetSpec = addAssetSpec;
window.updateAssetSpec = updateAssetSpec;
window.deleteAssetSpec = deleteAssetSpec;
window.resetAssetSpecs = resetAssetSpecs;
window.getAssetSpecCategories = getAssetSpecCategories;
window.findAssetTpl = findAssetTpl;
window.addAssetTpl = addAssetTpl;
window.updateAssetTpl = updateAssetTpl;
window.deleteAssetTpl = deleteAssetTpl;
window.resetAssetTpls = resetAssetTpls;
window.getAssetTplCategories = getAssetTplCategories;
window.findAssetDesign = findAssetDesign;
window.addAssetDesign = addAssetDesign;
window.updateAssetDesign = updateAssetDesign;
window.deleteAssetDesign = deleteAssetDesign;
window.resetAssetDesigns = resetAssetDesigns;
window.getAssetDesignCategories = getAssetDesignCategories;
window.findAssetCheck = findAssetCheck;
window.addAssetCheck = addAssetCheck;
window.updateAssetCheck = updateAssetCheck;
window.deleteAssetCheck = deleteAssetCheck;
window.resetAssetChecks = resetAssetChecks;
window.getAssetCheckCategories = getAssetCheckCategories;

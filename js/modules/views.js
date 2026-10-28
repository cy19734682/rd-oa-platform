/* ========== Views 基座 · views.js ========== */
/* 提供通用工具函数 + 首页渲染 + replaceView */
/* 业务子模块：views-std.js / views-ec.js / views-pa-*.js / views-sys.js / views-assets.js */

/* ---------- 跨模块通用工具函数（从各业务模块上提） ---------- */

/** 通用：格式化时间戳为 YYYY-MM-DD */
function _fmtDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 通用：超长文本折叠（>10 字截断 + 点击展开详情） */
function _foldText(text, cls) {
  if (!text) return '<span class="muted">—</span>';
  if (text.length <= 10) return `<span class="${cls || ""}" title="${_escape(text)}">${_escape(text)}</span>`;
  const short = text.slice(0, 10) + "…";
  return `<span class="fold-text" data-short="${_escape(short)}" data-full="${_escape(text)}" title="${_escape(text)}" onclick="this.classList.toggle('expanded');this.textContent=this.classList.contains('expanded')?this.dataset.full:this.dataset.short">${_escape(short)}</span>`;
}

/** 通用：考核状态标签 */
function _paStatusTag(s) {
  const map = {
    pending: ['tag muted', '考核表已创建'],
    selfFilled: ['tag', '待主管打分'],
    supDone: ['tag', '主管已打分，待PM打分'],
    pmDone: ['tag', 'PM已打分，待领导归档'],
    finalized: ['tag ok', '已完成'],
    rolledBack: ['tag warn', '已打回'],
  };
  const [cls, text] = map[s] || ['tag', s];
  return `<span class="${cls}">${text}</span>`;
}


/* ---------- OA 门户 · 工作台与板块页 ---------- */

/** 按时段问候语 */
function _greeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 9) return "早上好";
  if (h < 12) return "上午好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

/** 统计某板块下当前角色可见的子系统数量 */
function _visibleSubCount(modKey) {
  return _visibleSubs(modKey).length;
}

/** 子系统磁贴（板块首页 / 三级分组页共用）
 *  @param {string} modKey    板块 key
 *  @param {Object} sub       子系统菜单节点
 *  @param {string} parentKey 父级 key（三级分组页传二级 key，否则传 ""）
 */
function _portalSubTile(modKey, sub, parentKey) {
  const isExt = sub.type === "external" && sub.url;
  const children = _visibleChildren(modKey, sub.key);
  const onClick = isExt
    ? `window.open('${sub.url}', '_blank')`
    : (sub.action
      ? `selectActionSub('${parentKey ? parentKey + "','" : ""}${sub.key}')`
      : (parentKey ? `selectSubSub('${parentKey}', '${sub.key}')` : `selectSub('${sub.key}')`));
  const badge = isExt ? '<span class="tag ext">外链</span>' : "";
  // 菜单描述（SUB_DESC 静态文案；运行时新增菜单无描述时不显示该行）
  const desc = (typeof SUB_DESC !== "undefined" && SUB_DESC[sub.key]) || "";
  // 外链卡的 meta 留空（「外链」徽章已表意，避免与「外部系统」文案重复），内部卡显示子项数
  const meta = !isExt && children.length > 0 ? `${children.length} 个子项` : "";
  return `<div class="portal-tile portal-sub-tile" onclick="${onClick}">
    <div class="portal-tile-head">
      <div class="portal-tile-icon">${sub.icon || "📄"}</div>
      <div class="portal-tile-name">${_escape(sub.name)}</div>
      ${badge}
    </div>
    ${desc ? `<div class="portal-tile-desc">${_escape(desc)}</div>` : ""}
    ${meta ? `<div class="portal-tile-meta">${meta}</div>` : ""}
  </div>`;
}

/** 收集当前用户的跨模块待办（按角色 + 模块权限），返回待办对象数组 */
function _collectTodos() {
  const myId = window.CURR_ACCT_ID || "";
  const myName = window.CURR_ACCT_NAME || "";
  const roleKey = window.CURR_ACCT_ROLE_KEY || CUR_ROLE || "staff";
  const todos = [];

  const tables = (typeof PA_TABLES !== "undefined" && PA_TABLES) || [];
  const cases = (typeof EC_CASES !== "undefined" && EC_CASES) || [];
  const accts = (typeof ACCOUNTS !== "undefined" && ACCOUNTS) || [];
  const people = window._paBuildPeople ? window._paBuildPeople() : [];
  const canPerf = canAccessModule("perf");
  const canDev = canAccessModule("dev");
  const canSys = canAccessModule("sys");
  const canReviewEc = canDev && window.currentCanAction ? window.currentCanAction("dev", "ec", "admin") : false;

  if (canPerf) {
    const myPaTables = tables.filter((t) => t.ownerId === myId);
    const myPendingTables = myPaTables.filter((t) => t.status !== "finalized");
    if (myPendingTables.length > 0) {
      myPendingTables.slice(0, 5).forEach((t) => {
        const label = t.type === "monthly" ? "月度" : t.type === "yearly" ? "年度" : "互评";
        const stage = t.status === "pending" ? "待自评" : t.status === "selfFilled" ? "待主管打分" : t.status === "supDone" ? "待PM打分" : t.status === "pmDone" ? "待领导归档" : "进行中";
        todos.push({
          icon: "📅",
          mod: "perf",
          title: `${label}考核 · ${t.period}`,
          desc: `${t.ownerName} · ${stage}`,
          color: "#1677ff",
          onClick: _todoOnClick("perf", "paTableMonthly", `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`),
        });
      });
    }

    if (roleKey === "supervisor" || roleKey === "deptLeader") {
      const mySubordinates = people.filter((p) => p.manager === myName && p.id !== myId);
      const subIds = mySubordinates.map((p) => p.id);
      const supTodos = tables.filter((t) => subIds.includes(t.ownerId) && t.status === "selfFilled");
      supTodos.slice(0, 5).forEach((t) => {
        todos.push({
          icon: "✍️",
          mod: "perf",
          title: `待打分 · ${t.ownerName}`,
          desc: `${t.type === "monthly" ? "月度" : "年度"}考核 ${t.period}`,
          color: "#faad14",
          onClick: _todoOnClick("perf", "paTableMonthly", `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`),
        });
      });
    }

    if (roleKey === "projManager") {
      const pmVisible = people.filter((p) => p.manager === myName || p.leader === myName);
      const pmIds = pmVisible.map((p) => p.id);
      const pmTodos = tables.filter((t) => pmIds.includes(t.ownerId) && t.status === "supDone");
      pmTodos.slice(0, 5).forEach((t) => {
        todos.push({
          icon: "✍️",
          mod: "perf",
          title: `待PM打分 · ${t.ownerName}`,
          desc: `${t.type === "monthly" ? "月度" : "年度"}考核 ${t.period}`,
          color: "#faad14",
          onClick: _todoOnClick("perf", "paTableMonthly", `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`),
        });
      });
    }

    if (roleKey === "deptLeader" || roleKey === "sysAdmin") {
      const leaderVisible = roleKey === "sysAdmin" ? people : people.filter((p) => p.leader === myName || p.manager === myName);
      const leaderIds = leaderVisible.map((p) => p.id);
      const leaderTodos = tables.filter((t) => leaderIds.includes(t.ownerId) && t.status === "pmDone");
      leaderTodos.slice(0, 5).forEach((t) => {
        todos.push({
          icon: "🏆",
          mod: "perf",
          title: `待归档 · ${t.ownerName}`,
          desc: `${t.type === "monthly" ? "月度" : "年度"}考核 ${t.period}`,
          color: "#722ed1",
          onClick: _todoOnClick("perf", "paTableMonthly", `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`),
        });
      });
    }
  }

  if (canDev) {
    if (canReviewEc) {
      const ecPending = cases.filter((c) => c.reviewStatus === "pending");
      const ecDept = cases.filter((c) => c.reviewStatus === "firstReviewed");
      const ecFinal = cases.filter((c) => c.reviewStatus === "deptReviewed");
      const ecTodos = [...ecPending, ...ecDept, ...ecFinal].slice(0, 5);
      ecTodos.forEach((c) => {
        const stage = c.reviewStatus === "pending" ? "初审" : c.reviewStatus === "firstReviewed" ? "部门审核" : "副总工批准";
        todos.push({
          icon: "💡",
          mod: "dev",
          title: `案例${stage} · ${c.title}`,
          desc: `${c.shareName}（${c.shareDept || ""}）`,
          color: "#52c41a",
          onClick: _todoOnClick("dev", "ec", `openEcReviewModal('${c.id}','${c.reviewStatus === "pending" ? "first" : c.reviewStatus === "firstReviewed" ? "dept" : "final"}')`),
        });
      });
    }

    const myCases = cases.filter((c) => (c.shareEmpId || "") === myId && c.reviewStatus !== "finalApproved");
    myCases.slice(0, 3).forEach((c) => {
      const stageMap = { pending: "待初审", firstReviewed: "待部门审核", deptReviewed: "待副总工批准", returned: "已退回" };
      todos.push({
        icon: "📝",
        mod: "dev",
        title: `我的案例 · ${c.title}`,
        desc: stageMap[c.reviewStatus] || c.reviewStatus,
        color: "#13c2c2",
        onClick: _todoOnClick("dev", "ec", `openEcDetail('${c.id}')`),
      });
    });
  }

  if (canSys && roleKey === "sysAdmin") {
    const disabled = accts.filter((a) => a.st === "停用").length;
    if (disabled > 0) {
      todos.push({
        icon: "👤",
        mod: "sys",
        title: `停用账号（${disabled}）`,
        desc: "前往账号管理处理",
        color: "#ff4d4f",
        onClick: _todoOnClick("sys", "sysAcct", "selectModule('sys');selectSub('sysAcct')"),
      });
    }
  }

  return todos;
}

/** 更新右上角铃铛角标数字（显示待办数量） */
function updateBellBadge() {
  const numEl = document.querySelector(".bell .num");
  if (!numEl) return;
  const count = _collectTodos().length;
  if (count > 0) {
    numEl.style.display = "inline";
    numEl.innerText = count > 99 ? "99+" : count;
  } else {
    numEl.style.display = "none";
  }
}

/** 登录后弹窗提醒当前用户的待办事项
 *  @param {boolean} force - true 时忽略"已关闭"标记，强制展示（点击铃铛时使用）
 */
function showLoginTodoModal(force) {
  if (!force) {
    try {
      if (localStorage.getItem("oa_todo_dismissed") === "1") return;
    } catch (e) {}
  }
  const todos = _collectTodos();
  if (todos.length === 0) return;
  const name = window.CURR_ACCT_NAME || "";
  const count = todos.length;
  const list = todos.slice(0, 10).map((t) => `
    <div class="home-todo" style="cursor:pointer" onclick="closeModal();localStorage.setItem('oa_todo_dismissed','1');${t.onClick}">
      <div class="home-todo-icon" style="background:${t.color}1a;color:${t.color}">${t.icon}</div>
      <div class="home-todo-body">
        <div class="home-todo-title">${_escape(t.title)}</div>
        <div class="home-todo-desc">${_escape(t.desc)}</div>
      </div>
      <div class="home-todo-arrow">›</div>
    </div>`).join("");
  const body = `
    <div style="margin-bottom:12px;color:var(--sub);font-size:13px">
      你好，<b style="color:var(--title)">${_escape(name)}</b>，你有 <b style="color:var(--iconBlue)">${count}</b> 条待办事项：
    </div>
    <div class="home-todos" style="max-height:60vh;overflow-y:auto">${list}</div>
  `;
  const foot = `<button class="btn" onclick="localStorage.setItem('oa_todo_dismissed','1');closeModal()">知道了</button>`;
  openModal(modalContent(`🔔 待办提醒（${count}）`, body, foot), "520px");
}

/* ========== 主系统门户（平台首页 = 各子系统入口） ==========
 * 门户卡可见性过滤统一使用 config-portal.js 的 _portalAppAllowed
 * （roles 过滤 + 内部卡模块权限 + 上架状态），避免双份实现漂移。
 * 首页构成（v5）：左侧栏 portal-side（用户卡 / 常用应用 / 系统管理〔仅
 * sysAdmin〕，紧凑渲染函数在 views-portal.js，经 window 守卫调用）
 * + 右侧主区 portal-main-col（hero 标题 → 业务子系统卡网格 → 外部系统卡网格）。
 * v5 起调整：crumb 去掉「主系统」一级只保留公告条（公告去掉发布人/时间）；
 * 操作说明书入口下线；系统管理由主区「平台入口」卡片区迁入侧栏。
 * v5.2 起侧栏扩充：用户卡加日期进度小字；新增待办摘要行（紧凑徽标，点击弹
 * 铃铛面板）与最近访问（自动记录，按账号隔离，最多 8 条展示 5 条）。
 */

/** 单张子系统卡（内部卡新窗口打开独立子系统页；外部卡新窗口打开外链）
 * 内部卡使用门户配置的主题配色（theme，portal-config 维护；缺省回落默认色）
 * v6.0：内部卡首个字段由「子系统 N 个」改为「编码」（取门户卡 key，即 subs/<key>.html 的文件名） */
function _subAppCardHtml(app) {
  const isExt = app.kind === "external";
  const mod = app.mod || "";
  const statusText = (typeof _portalStatusText === "function") ? _portalStatusText(app.status) : "正常";
  const theme = (!isExt && typeof getPortalTheme === "function") ? getPortalTheme(app) : null;
  const tc = theme ? theme.base : "";
  const iconStyle = tc ? ` style="background:${tc}1f;color:${tc}"` : "";
  const pill = isExt
    ? '<span class="sub-card-pill external">外部系统</span>'
    : `<span class="sub-card-pill internal" style="color:${tc || "#0f6e56"};border-color:${tc ? tc + "66" : "#5dcaa5"};background:${tc ? tc + "14" : "#e1f5ee"}">内部系统</span>`;
  const fields = isExt
    ? [["类型", "外部系统"], ["打开方式", "新窗口"], ["状态", statusText]]
    : [["编码", app.key || "-", "sub-card-field-code"], ["类型", "内部系统"], ["状态", statusText]];
  const onClick = isExt
    ? `window.open('${app.url}', '_blank')`
    : `openSubsystem('${mod}')`;
  const enterStyle = tc ? ` style="color:${tc}"` : "";
  const cardStyle = tc ? ` style="--card-theme:${tc}"` : "";
  return `<div class="sub-card${isExt ? " ext" : ""}"${cardStyle} onclick="${onClick}">
    <div class="sub-card-head">
      <div class="sub-card-icon"${iconStyle}>${app.icon || "📦"}</div>
      <div class="sub-card-name">${_escape(app.name)}</div>
      ${pill}
    </div>
    <div class="sub-card-desc">${_escape(app.desc || "")}</div>
    <div class="sub-card-fields">${fields.map(([k, v, cls]) => `<div class="sub-card-field${cls ? " " + cls : ""}"><span>${k}</span><b>${_escape(String(v))}</b></div>`).join("")}</div>
    <div class="sub-card-enter"${enterStyle}>${isExt ? "新窗口打开 ↗" : "进入系统 →"}</div>
  </div>`;
}

/* ---------- 跨窗口跳转助手（v2 窗口级分离） ----------
 * 子系统为独立窗口：待办 / 搜索进入等跨模块跳转一律新开目标窗口落地，
 * 同窗口内则保持原站内行为（模态 / 站内导航）。 */

/** 新开对应子系统窗口，并落到指定二级页（?m=viewKey） */
function __jumpSub(appKey, viewKey) {
  const prefix = (typeof window !== "undefined" && window.__SUB_KEY) ? "../" : "";
  window.open(prefix + "subs/" + appKey + ".html" + (viewKey ? "?m=" + encodeURIComponent(viewKey) : ""), "_blank");
}

/** 跳主系统模块（系统管理等留在主门户的模块）：新开主门户深链落地 */
function __jumpMain(modKey, viewKey) {
  const prefix = (typeof window !== "undefined" && window.__SUB_KEY) ? "../" : "";
  window.open(prefix + "index.html?m=" + encodeURIComponent(modKey) + (viewKey ? "&v=" + encodeURIComponent(viewKey) : ""), "_blank");
}

/** 待办条目 onclick 构造：同窗口走 modalJs（模态/站内导航），跨窗口走新开落地 */
function _todoOnClick(appKey, viewKey, modalJs) {
  const cur = (typeof window !== "undefined" && window.__SUB_KEY) || "";
  if (cur === appKey) return modalJs;
  if (!cur && appKey === "sys") return modalJs;
  if (appKey === "sys") return `__jumpMain('sys','sysAcct')`;
  return `__jumpSub('${appKey}','${viewKey}')`;
}

function renderHome() {
  const apps = (typeof getPortalApps === "function" ? getPortalApps() : [])
    .filter(_portalAppAllowed);
  const internalApps = apps.filter((a) => a.kind !== "external");
  const externalApps = apps.filter((a) => a.kind === "external");
  const cards = (list) => list.map(_subAppCardHtml).join("");
  /* 左侧栏：用户卡（含日期进度）+ 待办摘要行 + 常用应用 + 最近访问 + 系统管理
 * （仅 sysAdmin；v5 起由主区平台入口迁入侧栏；渲染函数在 views-portal.js，
 * 经 window 守卫调用） */
  const side = `
    ${window._portalSideUser ? _portalSideUser() : ""}
    ${window._portalSideTd ? _portalSideTd() : ""}
    ${window._portalSideFav ? _portalSideFav() : ""}
    ${window._portalSideRecent ? _portalSideRecent() : ""}
    ${window._portalSideSys ? _portalSideSys() : ""}`;
  const body = `
  <div class="portal-home">
    <aside class="portal-side">${side}</aside>
    <div class="portal-main-col">
      <div class="portal-hero">
        <div class="portal-hero-text">
          <div class="portal-hero-title">${PAGES.portal.title}<span class="portal-hero-en">${_escape(PAGES.portal.en)}</span></div>
          <div class="portal-hero-desc">${PAGES.portal.desc}</div>
        </div>
      </div>
      ${internalApps.length
        ? `<div class="portal-section-title">🚪 业务子系统</div>
           <div class="sub-grid">${cards(internalApps)}</div>`
        : '<div class="empty" style="margin-top:16px">🔒 暂无可访问的子系统，请联系管理员开通权限</div>'}
      ${externalApps.length
        ? `<div class="portal-section-title">🔗 外部系统</div>
           <div class="sub-grid">${cards(externalApps)}</div>`
        : ""}
    </div>
  </div>`;
  return body;
}

/* ========== OA 门户 · 子系统首页（工作台式，v6.3） ==========
 * 结构：定位条 → 数据摘要 → 功能入口卡。
 * v6.3 按反馈精简：去掉右栏（我的待办 / 通知公告）、定位条的新增与搜索按钮、
 * 卡片内的最近内容摘要——首页只保留「我在哪个系统 / 整体规模多少 / 有哪些入口」。
 * 指标由既有数据层实时计算（STANDARDS / EC_CASES / PA_* / ASSET_*），不新增存储字段；
 * 无对应数据源的模块（项目管理）只给结构性指标，页面结构保持一致。
 * 主题色统一走 CSS 变量（--btBlue 等），四子系统随 applySubsystemTheme 各自换肤。 */

/** 子系统首页定位语（一句话说明这个系统解决什么问题） */
const SUB_HOME_TAGLINE = {
  proj: "研发设计与阶段评审的线上流转与归档",
  dev: "标准与经验案例的统一检索、阅读与沉淀",
  asset: "规范、模板与评审检查项的统一资产库",
  perf: "月度 / 年度考核的模板、打分与结果",
};

/** 数据层安全读取：脚本未加载或尚未初始化时返回空数组，避免子系统首页整体报错 */
function _shList(v) {
  return Array.isArray(v) ? v : [];
}
function _shStds() {
  return typeof STANDARDS !== "undefined" ? _shList(STANDARDS) : [];
}
function _shEcs() {
  return typeof EC_CASES !== "undefined" ? _shList(EC_CASES) : [];
}
function _shPaTpls() {
  return typeof PA_TEMPLATES !== "undefined" ? _shList(PA_TEMPLATES) : [];
}
function _shPaResults() {
  return typeof PA_RESULTS !== "undefined" ? _shList(PA_RESULTS) : [];
}
/** 过程资产四类内容（键顺序即「开发规范 / 文档模板 / 设计规范 / 评审 Checklist」） */
function _shAssets() {
  return [
    { key: "sub-spec", list: typeof ASSET_SPECS !== "undefined" ? _shList(ASSET_SPECS) : [], },
    { key: "sub-tpl", list: typeof ASSET_TPLS !== "undefined" ? _shList(ASSET_TPLS) : [], },
    { key: "sub-design", list: typeof ASSET_DESIGNS !== "undefined" ? _shList(ASSET_DESIGNS) : [], },
    { key: "sub-check", list: typeof ASSET_CHECKS !== "undefined" ? _shList(ASSET_CHECKS) : [], },
  ];
}

/** 最近 N 天（时间戳缺失时视为不满足） */
function _shWithin(ts, days) {
  return !!ts && Date.now() - ts < days * 86400000;
}

/** 数据摘要：返回 [{ label, value, hint }]
 *  v6.4：hint 不再带计量单位（条 / 个 / 篇 / 套 / 人 / 份）——label 已说明统计对象，
 *  数字本身足够；纯单位 hint 直接留空，节点不渲染。hint 仅保留有信息量的说明。 */
function _shKpis(mk) {
  const myId = window.CURR_ACCT_ID || "";
  if (mk === "dev") {
    const stds = _shStds();
    const ecs = _shEcs();
    const cur = stds.filter((s) => s.status === "current").length;
    const approved = ecs.filter((c) => c.reviewStatus === "finalApproved").length;
    const added = stds.filter((s) => _shWithin(s.createdAt, 30)).length + ecs.filter((c) => _shWithin(c.createdAt, 30)).length;
    /* 审核岗看全局待审，普通岗看自己待过审的 */
    const canReview = !!(window.currentCanAction && window.currentCanAction("dev", "ec", "admin"));
    const pending = canReview
      ? ecs.filter((c) => ["pending", "firstReviewed", "deptReviewed"].indexOf(c.reviewStatus) >= 0).length
      : ecs.filter((c) => (c.shareEmpId || "") === myId && c.reviewStatus !== "finalApproved").length;
    return [
      { label: "标准总数", value: stds.length, hint: "现行 " + cur },
      { label: "经验案例", value: approved, hint: "共 " + ecs.length },
      { label: "近 30 天新增", value: added, hint: "标准 + 案例" },
      { label: canReview ? "待我审核" : "我的待审", value: pending, hint: pending ? "案例待处理" : "暂无积压" },
    ];
  }
  if (mk === "asset") {
    const a = _shAssets();
    const n = (k) => (a.find((x) => x.key === k) || {}).list.length || 0;
    return [
      { label: "开发规范", value: n("sub-spec") },
      { label: "文档模板", value: n("sub-tpl") },
      { label: "设计规范", value: n("sub-design") },
      { label: "评审检查", value: n("sub-check") },
    ];
  }
  if (mk === "perf") {
    const people = window._paBuildPeople ? window._paBuildPeople() : [];
    /* 考核指标 = 启用模板的评分项合计（无考核表数据时也能反映配置规模） */
    const items = _shPaTpls()
      .filter((t) => t.active)
      .reduce((n, t) => n + _shList(t.items).length, 0);
    return [
      { label: "考核模板", value: _shPaTpls().length },
      { label: "考核覆盖", value: people.length },
      { label: "考核指标", value: items, hint: "启用模板评分项" },
      { label: "考核结果", value: _shPaResults().length },
    ];
  }
  /* 无独立数据层的模块（项目管理）：没有可统计的真实指标，不摆占位数字，
     数据摘要整段省略（v6.3 起「我的待办」不再出现在子系统首页） */
  return [];
}

/** 定位条（v6.3：不再放新增/搜索按钮，只交代「这是哪个系统、解决什么问题」） */
function _shHero(mk, m, subsCount) {
  const tagline = SUB_HOME_TAGLINE[mk] || "";
  return `<div class="sy-hero">
    <div class="sy-hero-main">
      <div class="sy-hero-icon">${m.icon || "📦"}</div>
      <div class="sy-hero-text">
        <div class="sy-hero-title">${_escape(m.name)}<span class="sy-hero-tag">${subsCount} 个功能入口</span></div>
        <div class="sy-hero-desc">${_escape(tagline || "本子系统的功能入口一览")}</div>
      </div>
    </div>
  </div>`;
}

/** 单个功能入口卡（v6.5）：沿用主系统首页业务子系统卡的视觉体系
 *  （白卡 + 12px 圆角 + 40px 主题渐变图标底座 + 名称 + 描述 + 细线底栏），
 *  但只保留入口真正需要的三样东西：图标 / 名称 / 描述，底栏左侧放子项数胶囊、
 *  右侧放「进入 →」。v6.5 去掉「编码 / 类型」属性格——6 列栅格下卡宽约 210px，
 *  属性格会把卡片撑得很碎，且对内使用者来说菜单 key 与列表形态没有决策价值。 */
function _shCardHtml(mk, sub) {
  const isExt = sub.type === "external" && sub.url;
  const onClick = isExt
    ? `window.open('${sub.url}', '_blank')`
    : (sub.action ? `selectActionSub('${sub.key}')` : `selectSub('${sub.key}')`);
  const desc = (typeof SUB_DESC !== "undefined" && SUB_DESC[sub.key]) || "";
  const children = _visibleChildren(mk, sub.key);
  const pill = isExt
    ? '<span class="sub-card-pill external">外部链接</span>'
    : (children.length ? `<span class="sub-card-pill">${children.length} 个子项</span>` : "<span></span>");
  return `<div class="sub-card sy-card${isExt ? " ext" : ""}" onclick="${onClick}">
    <div class="sub-card-head">
      <div class="sub-card-icon">${sub.icon || "📄"}</div>
      <div class="sub-card-name">${_escape(sub.name)}</div>
    </div>
    <div class="sub-card-desc">${_escape(desc || "本子系统的功能入口")}</div>
    <div class="sy-card-foot">${pill}<span class="sub-card-enter">进入${sub.action ? "办理" : ""} →</span></div>
  </div>`;
}

/** 子系统首页（renderModuleHome 的实现入口）
 *  v6.2：仅**子系统窗口**（window.__SUB_KEY 存在）使用工作台式布局；
 *  主系统窗口内的模块页（系统管理）仍为原「磁贴铺开」形态，保持主系统观感不变。
 *  v6.3：整页三段落——定位条 / 数据摘要 / 功能入口，无右栏。 */
function renderModuleHome() {
  const mk = window.curModule || curModule;
  const m = MODULES[mk];
  const subs = _visibleSubs(mk);
  if (!m) return renderPlaceholder();

  if (!(typeof window !== "undefined" && window.__SUB_KEY)) {
    const tiles = subs.map((s) => _portalSubTile(mk, s, "")).join("");
    /* 列数钳制在 6~8：不足 6 个也至少 6 列，最多 8 个一行 */
    const cols = Math.max(6, Math.min(Math.max(subs.length, 1), 8));
    return `
  ${pageHeader(`${m.icon || "📦"} ${m.name}`, `共 ${subs.length} 个子系统`)}
  <div class="portal-grid portal-grid-subs" style="--cols:${cols}">${tiles}</div>`;
  }

  /* 数据摘要整段可缺席：项目管理子系统没有数据层时不出这一段，避免空白指标 */
  const kpiList = _shKpis(mk);
  const kpisHtml = kpiList.length
    ? `<div class="sy-kpis">${kpiList
        .map(
          (k) =>
            `<div class="sy-kpi"><div class="sy-kpi-label">${_escape(k.label)}</div><div class="sy-kpi-value">${k.value}</div>` +
            `${k.hint ? `<div class="sy-kpi-hint">${_escape(k.hint)}</div>` : ""}</div>`
        )
        .join("")}</div>`
    : "";
  const cards = subs.map((s) => _shCardHtml(mk, s)).join("");
  /* v6.5：栅格统一 6 列（入口数不足也保持 6 列，卡片宽度一致、左对齐），
     窄屏由 CSS 断点降列 */
  return `
  <div class="sy-page">
    ${_shHero(mk, m, subs.length)}
    ${kpisHtml}
    <div class="sy-section-title">功能入口</div>
    <div class="sy-cards" style="--sy-cols:6">${cards}</div>
  </div>`;
}


/* ========== OA 门户 · 二级分组页（三级子系统磁贴铺开） ========== */

function renderSubGroupHome() {
  const mk = window.curModule || curModule;
  const sub = findMenuNode(mk, window.curView || curView);
  if (!sub) return renderPlaceholder();
  const children = _visibleChildren(mk, sub.key);
  const tiles = children.map((ss) => _portalSubTile(mk, ss, sub.key)).join("");
  // 列数钳制在 6~8：不足 6 个也至少 6 列，最多 8 个一行
  const cols = Math.max(6, Math.min(Math.max(children.length, 1), 8));
  return `
  ${pageHeader(`${sub.icon || "📄"} ${sub.name}`, `共 ${children.length} 个子项`)}
  <div class="portal-grid portal-grid-subs" style="--cols:${cols}">${tiles}</div>`;
}



/** 刷新当前路由视图（账号操作后调用） */
function replaceView() {
  if (typeof window.renderCurView === "function") window.renderCurView();
}


/* ---------- 通用工具 ---------- */
/* ---------- 通用工具 ---------- */

/** 简易 HTML 转义，防 XSS */
function _escape(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 时间戳格式化为 YYYY-MM-DD */
function _date(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const p = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 简易 Markdown → HTML，覆盖常用语法（无第三方依赖） */
function _renderMd(text) {
  if (!text) return "";
  // 统一换行符，处理 Windows 环境下的 \r\n 和旧 Mac 的 \r
  let s = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // 先处理代码块 ```，占位替换防止后续正则干扰
  const codeBlocks = [];
  s = s.replace(/^```(\w*)\n([\s\S]*?)```\s*$/gm, (match, lang, code) => {
    const idx = codeBlocks.length;
    // 用 HTML 实体 &#10; 替换代码块内的换行，防止后续 split("\n") 拆散代码块
    codeBlocks.push(
      `<pre><code data-lang="${_escape(lang)}">${_escape(code.trim()).replace(/\n/g, "&#10;")}</code></pre>`
    );
    return `__CODE_BLOCK_${idx}__`;
  });
  // 再做 HTML 转义（代码块已占位，不受影响）
  s = _escape(s);
  // 恢复代码块（此时是单行 HTML，不会被后续 split 拆散）
  s = s.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[+idx]);
  // 行内代码 `xxx`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // 粗体 **xxx**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // 斜体 *xxx*
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // H1-H6 标题（必须独占一行且不在代码块内）
  s = s.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  s = s.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  s = s.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  s = s.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  s = s.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  // 勾选框 - [ ] / - [x] 必须在无序列表之前处理，直接加 md-ul 标记
  s = s.replace(/^([ \t]*)- \[ \]\s+(.+)$/gm, "$1<li class='md-ul check-off'>☐ $2</li>");
  s = s.replace(/^([ \t]*)- \[[xX]\]\s+(.+)$/gm, "$1<li class='md-ul check-on'>☑ $2</li>");
  // 无序列表 - 或 *，加 md-ul 标记防止被有序列表包裹正则误匹配
  s = s.replace(/^([ \t]*)[-*]\s+(.+)$/gm, "$1<li class='md-ul'>$2</li>");
  // 有序列表，加 md-ol 标记
  s = s.replace(/^([ \t]*)\d+\.\s+(.+)$/gm, "$1<li class='md-ol'>$2</li>");
  // 按行扫描，将连续的同类型 li 分别包裹成 ul 或 ol
  const listLines = s.split("\n");
  let listOut = [];
  let ulBuf = [];
  let olBuf = [];
  const flushUl = () => {
    if (ulBuf.length) { listOut.push("<ul>" + ulBuf.join("") + "</ul>"); ulBuf = []; }
  };
  const flushOl = () => {
    if (olBuf.length) { listOut.push("<ol>" + olBuf.join("") + "</ol>"); olBuf = []; }
  };
  for (let i = 0; i < listLines.length; i++) {
    const line = listLines[i];
    if (/^<li class='md-ul/.test(line)) {
      flushOl();
      ulBuf.push(line);
    } else if (/^<li class='md-ol/.test(line)) {
      flushUl();
      olBuf.push(line);
    } else {
      flushUl();
      flushOl();
      listOut.push(line);
    }
  }
  flushUl();
  flushOl();
  s = listOut.join("\n");
  // 表格行（简单管道表）
  const tLines = s.split("\n");
  let tOut = [];
  let inTable = false;
  for (let i = 0; i < tLines.length; i++) {
    const line = tLines[i];
    if (/^\|.*\|$/.test(line)) {
      if (!inTable) { tOut.push("<table>"); inTable = true; }
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (i + 1 < tLines.length && /^\|[\s:|-]+\|$/.test(tLines[i + 1])) {
        tOut.push(
          "<thead><tr>" + cells.map((c) => `<th>${c}</th>`).join("") +
          "</tr></thead><tbody>"
        );
        i++;
      } else {
        tOut.push("<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>");
      }
    } else {
      if (inTable) { tOut.push("</tbody></table>"); inTable = false; }
      tOut.push(line);
    }
  }
  if (inTable) tOut.push("</tbody></table>");
  s = tOut.join("\n");
  // 段落：连续的纯文本行（不是 HTML 标签或闭合标签开头）包 <p>
  s = s.replace(/^(?!<[a-z]|<li|<pre|<table|<ul|<ol|<h|<\/)(.+)$/gm, "<p>$1</p>");
  // 清理多余空行
  s = s.replace(/\n{2,}/g, "\n");
  return `<div class="md-preview">${s}</div>`;
}

/** 将 JSON 数据触发下载 */
function _downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/* ---------- VIEWS 基座填充 ---------- */
VIEWS.home = renderHome;

/* ---------- 基座 window 挂载 ---------- */
window.replaceView = replaceView;
window.__jumpSub = __jumpSub;
window.__jumpMain = __jumpMain;
window._fmtDate = _fmtDate;
window._foldText = _foldText;
window._paStatusTag = _paStatusTag;
window._escape = _escape;
window._date = _date;
window._renderMd = _renderMd;
window._downloadJson = _downloadJson;
window.showLoginTodoModal = showLoginTodoModal;
window.updateBellBadge = updateBellBadge;
window.renderModuleHome = renderModuleHome;
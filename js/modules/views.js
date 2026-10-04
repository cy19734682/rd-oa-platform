/* ========== Views 基座 · views.js ========== */
/* 提供通用工具函数 + 首页渲染 + replaceView */
/* 业务子模块：views-std.js / views-ec.js / views-pa.js / views-sys.js / views-assets.js */

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


/* ---------- Home / 研发工作台 ---------- */

/** 相对时间格式化（日志用） */
function _relativeTime(tsOrStr) {
  const ts = typeof tsOrStr === "number" ? tsOrStr : new Date(String(tsOrStr).replace(/-/g, "/")).getTime();
  if (!ts || isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return min + "分钟前";
  const hour = Math.floor(min / 60);
  if (hour < 24) return hour + "小时前";
  const day = Math.floor(hour / 24);
  if (day < 30) return day + "天前";
  return _fmtDate(ts);
}

/** ② 全局数据看板（按模块权限过滤卡片） */
function _homeStats() {
  const accts = (typeof ACCOUNTS !== "undefined" && ACCOUNTS) || [];
  const stds = (typeof STANDARDS !== "undefined" && STANDARDS) || [];
  const cases = (typeof EC_CASES !== "undefined" && EC_CASES) || [];
  const tables = (typeof PA_TABLES !== "undefined" && PA_TABLES) || [];
  const specs = (typeof ASSET_SPECS !== "undefined" && ASSET_SPECS) || [];
  const tpls = (typeof ASSET_TPLS !== "undefined" && ASSET_TPLS) || [];
  const designs = (typeof ASSET_DESIGNS !== "undefined" && ASSET_DESIGNS) || [];
  const checks = (typeof ASSET_CHECKS !== "undefined" && ASSET_CHECKS) || [];

  const canSys = canAccessModule("sys");
  const canDev = canAccessModule("dev");
  const canPerf = canAccessModule("perf");
  const canAsset = canAccessModule("asset");

  const activeAccts = canSys ? accts.filter((a) => a.st === "启用").length : 0;
  const currentStds = canDev ? stds.filter((s) => s.status === "current").length : 0;
  const approvedCases = canDev ? cases.filter((c) => c.reviewStatus === "finalApproved").length : 0;
  const ongoingPa = canPerf ? tables.filter((t) => t.status !== "finalized").length : 0;
  const assetTotal = canAsset ? specs.length + tpls.length + designs.length + checks.length : 0;

  const pendingCases = canDev ? cases.filter((c) => c.reviewStatus === "pending" || c.reviewStatus === "firstReviewed" || c.reviewStatus === "deptReviewed").length : 0;
  const pendingPa = canPerf ? tables.filter((t) => t.status === "pmDone").length : 0;
  const pendingTotal = pendingCases + pendingPa;

  const cards = [];
  if (canSys) cards.push({ icon: "👥", v: activeAccts, k: "启用账号", color: "#1677ff", onClick: "selectModule('sys');selectSub('sysAcct')" });
  if (canDev) cards.push({ icon: "📚", v: currentStds, k: "现行标准", color: "#52c41a", onClick: "selectModule('dev');selectSub('stdHome')" });
  if (canDev) cards.push({ icon: "💡", v: approvedCases, k: "入库案例", color: "#faad14", onClick: "selectModule('dev');selectSub('ec')" });
  if (canPerf) cards.push({ icon: "📈", v: ongoingPa, k: "进行中考核", color: "#722ed1", onClick: "selectModule('perf');selectSub('paTableMonthly')" });
  if (canAsset) cards.push({ icon: "📐", v: assetTotal, k: "过程资产", color: "#13c2c2", onClick: "selectModule('asset');selectSub('sub-spec')" });
  if ((canDev || canPerf) && pendingTotal > 0) cards.push({ icon: "⚠️", v: pendingTotal, k: "待处理事项", color: "#ff4d4f", onClick: "" });

  if (cards.length === 0) return "";
  return `<div class="home-stats">${cards.map((c) => `
    <div class="home-stat"${c.onClick ? ` onclick="${c.onClick}"` : ""}>
      <div class="home-stat-icon" style="background:${c.color}1a;color:${c.color}">${c.icon}</div>
      <div class="home-stat-info">
        <div class="home-stat-v">${c.v}</div>
        <div class="home-stat-k">${c.k}</div>
      </div>
    </div>`).join("")}</div>`;
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
          title: `${label}考核 · ${t.period}`,
          desc: `${t.ownerName} · ${stage}`,
          color: "#1677ff",
          onClick: `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`,
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
          title: `待打分 · ${t.ownerName}`,
          desc: `${t.type === "monthly" ? "月度" : "年度"}考核 ${t.period}`,
          color: "#faad14",
          onClick: `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`,
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
          title: `待PM打分 · ${t.ownerName}`,
          desc: `${t.type === "monthly" ? "月度" : "年度"}考核 ${t.period}`,
          color: "#faad14",
          onClick: `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`,
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
          title: `待归档 · ${t.ownerName}`,
          desc: `${t.type === "monthly" ? "月度" : "年度"}考核 ${t.period}`,
          color: "#722ed1",
          onClick: `__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')`,
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
          title: `案例${stage} · ${c.title}`,
          desc: `${c.shareName}（${c.shareDept || ""}）`,
          color: "#52c41a",
          onClick: `openEcReviewModal('${c.id}','${c.reviewStatus === "pending" ? "first" : c.reviewStatus === "firstReviewed" ? "dept" : "final"}')`,
        });
      });
    }

    const myCases = cases.filter((c) => (c.shareEmpId || "") === myId && c.reviewStatus !== "finalApproved");
    myCases.slice(0, 3).forEach((c) => {
      const stageMap = { pending: "待初审", firstReviewed: "待部门审核", deptReviewed: "待副总工批准", returned: "已退回" };
      todos.push({
        icon: "📝",
        title: `我的案例 · ${c.title}`,
        desc: stageMap[c.reviewStatus] || c.reviewStatus,
        color: "#13c2c2",
        onClick: `openEcDetail('${c.id}')`,
      });
    });
  }

  if (canSys && roleKey === "sysAdmin") {
    const disabled = accts.filter((a) => a.st === "停用").length;
    if (disabled > 0) {
      todos.push({
        icon: "👤",
        title: `停用账号（${disabled}）`,
        desc: "前往账号管理处理",
        color: "#ff4d4f",
        onClick: "selectModule('sys');selectSub('sysAcct')",
      });
    }
  }

  return todos;
}

/** ③ 我的待办（按角色 + 模块权限聚合跨模块待办） */
function _homeTodos() {
  const todos = _collectTodos();
  if (todos.length === 0) {
    return `<div class="home-empty">🎉 暂无待办事项，享受轻松的一天吧～</div>`;
  }
  return `<div class="home-todos">${todos.slice(0, 8).map((t) => `
    <div class="home-todo" onclick="${t.onClick}">
      <div class="home-todo-icon" style="background:${t.color}1a;color:${t.color}">${t.icon}</div>
      <div class="home-todo-body">
        <div class="home-todo-title">${_escape(t.title)}</div>
        <div class="home-todo-desc">${_escape(t.desc)}</div>
      </div>
      <div class="home-todo-arrow">›</div>
    </div>`).join("")}</div>`;
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
      if (sessionStorage.getItem("oa_todo_dismissed") === "1") return;
    } catch (e) {}
  }
  const todos = _collectTodos();
  if (todos.length === 0) return;
  const name = window.CURR_ACCT_NAME || "";
  const count = todos.length;
  const list = todos.slice(0, 10).map((t) => `
    <div class="home-todo" style="cursor:pointer" onclick="closeModal();sessionStorage.setItem('oa_todo_dismissed','1');${t.onClick}">
      <div class="home-todo-icon" style="background:${t.color}1a;color:${t.color}">${t.icon}</div>
      <div class="home-todo-body">
        <div class="home-todo-title">${_escape(t.title)}</div>
        <div class="home-todo-desc">${_escape(t.desc)}</div>
      </div>
      <div class="home-todo-arrow">›</div>
    </div>`).join("");
  const body = `
    <div style="margin-bottom:12px;color:var(--sub);font-size:13px">
      你好，<b style="color:var(--title)">${_escape(name)}</b>，你当前共有 <b style="color:var(--iconBlue)">${count}</b> 条待办事项，请及时处理：
    </div>
    <div class="home-todos" style="max-height:60vh;overflow-y:auto">${list}</div>
  `;
  const foot = `<button class="btn" onclick="sessionStorage.setItem('oa_todo_dismissed','1');closeModal()">知道了</button>`;
  openModal(modalContent(`🔔 待办提醒（${count}）`, body, foot), "520px");
}

/** ④ 最近动态（系统日志） */
function _homeRecentLogs() {
  const logs = (MOCK && MOCK.sysLogs) || [];
  const recent = logs.slice(0, 8);
  if (recent.length === 0) return `<div class="home-empty">暂无动态</div>`;
  return `<div class="home-logs">${recent.map((l) => `
    <div class="home-log">
      <div class="home-log-time">${_relativeTime(l.time)}</div>
      <div class="home-log-body">
        <span class="home-log-who">${_escape(l.who)}</span>
        <span class="tag ${l.typeCls || ''}" style="font-size:10px;margin:0 4px">${l.type}</span>
        <span class="home-log-action">${_escape(l.action)}</span>
        ${l.target ? `<div class="home-log-target">${_escape(l.target)}</div>` : ""}
      </div>
    </div>`).join("")}</div>`;
}

/** ⑤ 知识速览（按模块权限过滤列） */
function _homeKnowledge() {
  const stds = (typeof STANDARDS !== "undefined" && STANDARDS) || [];
  const cases = (typeof EC_CASES !== "undefined" && EC_CASES) || [];
  const specs = (typeof ASSET_SPECS !== "undefined" && ASSET_SPECS) || [];
  const tpls = (typeof ASSET_TPLS !== "undefined" && ASSET_TPLS) || [];
  const designs = (typeof ASSET_DESIGNS !== "undefined" && ASSET_DESIGNS) || [];
  const checks = (typeof ASSET_CHECKS !== "undefined" && ASSET_CHECKS) || [];

  const canDev = canAccessModule("dev");
  const canAsset = canAccessModule("asset");

  const cols = [];

  if (canDev) {
    const latestStds = [...stds].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
    const colStd = latestStds.length === 0
      ? `<div class="home-empty small">暂无标准</div>`
      : latestStds.map((s) => `
        <div class="home-know-item" onclick="selectModule('dev');selectSub('stdHome')">
          <div class="home-know-title" title="${_escape(s.nameCn || s.name || '')}">${_escape(s.nameCn || s.name || '')}</div>
          <div class="home-know-meta">${_escape(s.stdNo || "")} · ${_fmtDate(s.createdAt)}</div>
        </div>`).join("");
    cols.push(`<div class="home-know-col"><div class="home-know-head">📚 最新标准</div>${colStd}</div>`);

    const hotCases = cases.filter((c) => c.reviewStatus === "finalApproved").sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);
    const colCase = hotCases.length === 0
      ? `<div class="home-empty small">暂无案例</div>`
      : hotCases.map((c) => `
        <div class="home-know-item" onclick="openEcDetail('${c.id}')">
          <div class="home-know-title" title="${_escape(c.title)}">${_escape(c.title)}</div>
          <div class="home-know-meta">👁 ${c.viewCount || 0} · 👍 ${c.likeCount || 0}</div>
        </div>`).join("");
    cols.push(`<div class="home-know-col"><div class="home-know-head">💡 热门案例</div>${colCase}</div>`);
  }

  if (canAsset) {
    const allAssets = [
      ...specs.map((s) => ({ ...s, _type: "开发规范" })),
      ...tpls.map((s) => ({ ...s, _type: "文档模板" })),
      ...designs.map((s) => ({ ...s, _type: "设计规范" })),
      ...checks.map((s) => ({ ...s, _type: "评审Checklist" })),
    ].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)).slice(0, 5);
    const colAsset = allAssets.length === 0
      ? `<div class="home-empty small">暂无资产</div>`
      : allAssets.map((a) => `
        <div class="home-know-item" onclick="selectModule('asset')">
          <div class="home-know-title" title="${_escape(a.title || a.name || '')}">${_escape(a.title || a.name || '')}</div>
          <div class="home-know-meta">${_escape(a._type)} · ${_fmtDate(a.updatedAt || a.createdAt)}</div>
        </div>`).join("");
    cols.push(`<div class="home-know-col"><div class="home-know-head">📐 最近资产</div>${colAsset}</div>`);
  }

  if (cols.length === 0) return "";
  return `<div class="home-know">${cols.join("")}</div>`;
}

/** ⑥ 快捷入口（仅第三方系统 · 外链） */
function _homeQuickEntries() {
  const items = [];
  for (const mk in MODULES) {
    if (mk === "home") continue;
    if (!canAccessModule(mk)) continue;
    const m = MODULES[mk];
    (m.subs || []).forEach((s) => {
      if (s.type !== "external") return;
      if (!hasRole(mk, s.key)) return;
      items.push({
        moduleKey: mk,
        moduleName: m.name,
        moduleIcon: m.icon,
        key: s.key,
        name: s.name,
        icon: s.icon || "🔗",
        url: s.url || "#",
      });
    });
  }
  if (items.length === 0) return `<div class="home-empty">暂无第三方系统入口</div>`;
  return `<div class="home-quick">${items.map((it) => `
    <div class="home-quick-card" onclick="window.open('${it.url}','_blank')">
      <div class="home-quick-card-icon">${it.icon}</div>
      <div class="home-quick-card-body">
        <div class="home-quick-card-name">${_escape(it.name)}</div>
        <div class="home-quick-card-mod">${it.moduleIcon} ${_escape(it.moduleName)}</div>
      </div>
      <span class="home-quick-card-arrow">↗</span>
    </div>`).join("")}</div>`;
}

/** 绩效考核概览（状态分布 + 我的考核 + 最近结果） */
function _homePerformance() {
  if (!canAccessModule("perf")) return "";
  const tables = (typeof PA_TABLES !== "undefined" && PA_TABLES) || [];
  const results = (typeof PA_RESULTS !== "undefined" && PA_RESULTS) || [];
  const myId = window.CURR_ACCT_ID || "";

  const statusMeta = [
    { key: "pending", label: "待自评", color: "#8c8c8c" },
    { key: "selfFilled", label: "待主管打分", color: "#1677ff" },
    { key: "supDone", label: "待PM打分", color: "#faad14" },
    { key: "pmDone", label: "待领导归档", color: "#722ed1" },
    { key: "finalized", label: "已完成", color: "#52c41a" },
  ];
  const total = tables.length;
  const statsBar = statusMeta.map((s) => {
    const count = tables.filter((t) => t.status === s.key).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `<div class="home-pa-stat" style="--c:${s.color}">
      <div class="home-pa-stat-top"><span class="home-pa-stat-label">${s.label}</span><span class="home-pa-stat-num">${count}</span></div>
      <div class="home-pa-stat-bar"><div class="home-pa-stat-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");

  const myTables = tables
    .filter((t) => t.ownerId === myId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);
  const colMy = myTables.length === 0
    ? `<div class="home-empty small">暂无考核表</div>`
    : myTables.map((t) => {
        const typeLabel = t.typeLabel || (t.type === "monthly" ? "月度考核" : t.type === "yearly" ? "年终考核" : "互评考核");
        const score = t.status === "finalized" && t.score != null ? t.score : "-";
        const grade = t.status === "finalized" && t.grade ? `<span class="home-pa-grade g-${t.grade}">${t.grade}</span>` : "";
        return `<div class="home-pa-row" onclick="__paType='${t.type}';openPaTableDetail('${t.ownerId}','${t.period}')">
          <div class="home-pa-row-main">
            <div class="home-pa-row-title">${_escape(typeLabel)} · ${_escape(t.period)}</div>
            <div class="home-pa-row-sub">${_paStatusTag(t.status)}</div>
          </div>
          <div class="home-pa-row-score">${grade}<span class="home-pa-score-num">${score}</span></div>
        </div>`;
      }).join("");

  const recent = [...results]
    .sort((a, b) => (b.finalizedAt || 0) - (a.finalizedAt || 0))
    .slice(0, 5);
  const colRecent = recent.length === 0
    ? `<div class="home-empty small">暂无考核结果</div>`
    : recent.map((r) => {
        const typeLabel = r.type === "monthly" ? "月度" : r.type === "yearly" ? "年终" : "互评";
        return `<div class="home-pa-row">
          <div class="home-pa-row-main">
            <div class="home-pa-row-title">${_escape(r.ownerName)} · ${_escape(r.period)}</div>
            <div class="home-pa-row-sub">${typeLabel}考核 · ${_fmtDate(r.finalizedAt)}</div>
          </div>
          <div class="home-pa-row-score"><span class="home-pa-grade g-${r.grade}">${r.grade || "-"}</span><span class="home-pa-score-num">${r.score != null ? r.score : "-"}</span></div>
        </div>`;
      }).join("");

  return `<div class="home-pa">
    <div class="home-pa-stats">${statsBar}</div>
    <div class="home-pa-cols">
      <div class="home-pa-col">
        <div class="home-pa-col-head">📅 我的考核</div>
        ${colMy}
      </div>
      <div class="home-pa-col">
        <div class="home-pa-col-head">🏆 最近考核结果</div>
        ${colRecent}
      </div>
    </div>
  </div>`;
}

/* ---------- Home / 平台总览 ---------- */
function renderHome() {
  const stats = _homeStats();
  const quick = _homeQuickEntries();
  const todos = _homeTodos();
  const logs = _homeRecentLogs();
  const perf = _homePerformance();
  const know = _homeKnowledge();

  const parts = [];
  if (stats) parts.push(stats);
  if (perf) parts.push(zone(perf, "📊 绩效考核"));
  if (quick) parts.push(zone(quick, "🔗 第三方系统"));
  if (todos || logs) {
    parts.push(`<div class="home-main-grid">
      <div class="home-main-left">${todos ? zone(todos, "📋 我的待办") : ""}</div>
      <div class="home-main-right">${logs ? zone(logs, "📜 最近动态") : ""}</div>
    </div>`);
  }
  if (know) parts.push(zone(know, "🧠 知识速览"));

  if (parts.length === 0) {
    return `<div class="home-empty" style="margin-top:40px">🔒 暂无可展示的内容，请联系管理员开通模块权限</div>`;
  }
  return parts.join("");
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
window._fmtDate = _fmtDate;
window._foldText = _foldText;
window._paStatusTag = _paStatusTag;
window._escape = _escape;
window._date = _date;
window._renderMd = _renderMd;
window._downloadJson = _downloadJson;
window.showLoginTodoModal = showLoginTodoModal;
window.updateBellBadge = updateBellBadge;
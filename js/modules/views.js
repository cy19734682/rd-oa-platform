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

/** 板块磁贴（工作台首页用）：竖排大卡片——头部（图标+名称+子系统计数）→ 描述 → 底部进入链接 */
function _portalModuleTile(modKey, m) {
  const color = (typeof MODULE_THEME !== "undefined" && MODULE_THEME[modKey]) || "#1677ff";
  const n = _visibleSubCount(modKey);
  const desc = (typeof MODULE_DESC !== "undefined" && MODULE_DESC[modKey]) || "";
  return `<div class="portal-tile portal-module-tile" style="--tc:${color}" onclick="selectModule('${modKey}')">
    <div class="portal-tile-head">
      <div class="portal-tile-icon" style="background:${color}1a;color:${color}">${m.icon || "📦"}</div>
      <div class="portal-tile-name">${_escape(m.name)}</div>
      <div class="portal-tile-count">${n} 个子系统</div>
    </div>
    ${desc ? `<div class="portal-tile-desc">${_escape(desc)}</div>` : ""}
    <div class="portal-tile-enter" style="color:${color}">进入板块 →</div>
  </div>`;
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

/* ========== OA 门户 · 工作台（平台首页） ==========
 * 构成：问候语 + 角色标签 → 我的待办 | 通知公告 → 全部板块磁贴（大卡片）→ 我的常用应用
 */

/** 工作台「我的待办」面板（数据复用 _collectTodos，与铃铛弹窗同源） */
function _portalTodoPanel() {
  const todos = _collectTodos();
  const list = todos.slice(0, 5).map((t) => `
    <div class="portal-todo" onclick="${t.onClick}">
      <div class="home-todo-icon" style="background:${t.color}1a;color:${t.color}">${t.icon}</div>
      <div class="home-todo-body">
        <div class="home-todo-title">${_escape(t.title)}</div>
        <div class="home-todo-desc">${_escape(t.desc)}</div>
      </div>
      <div class="home-todo-arrow">›</div>
    </div>`).join("");
  return `<div class="portal-panel">
    <div class="portal-panel-head">
      <span class="portal-panel-title">⚡ 我的待办${todos.length > 0 ? `<span class="portal-panel-badge">${todos.length} 条</span>` : ""}</span>
    </div>
    <div class="portal-panel-body">${list || '<div class="portal-panel-empty">🎉 暂无待办事项</div>'}</div>
  </div>`;
}

function renderHome() {
  const name = window.CURR_ACCT_NAME || "";
  const mods = _sortedMenus().filter(([k]) => k !== "home" && canAccessModule(k));
  const tiles = mods.map(([k, m]) => _portalModuleTile(k, m)).join("");
  // 列数钳制在 4~6：不足 4 个板块也至少 4 列（卡片拉宽），最多 6 个一行
  const modCols = Math.max(4, Math.min(mods.length, 6));
  const body = tiles
    ? `<div class="portal-grid portal-grid-modules" style="--cols:${modCols}">${tiles}</div>`
    : `<div class="empty" style="margin-top:24px">🔒 暂无可访问的板块，请联系管理员开通权限</div>`;
  return `
  <div class="portal-home">
    <div class="portal-hello">
      <div class="portal-hello-avatar">${_escape((name || "👤").charAt(0))}</div>
      <div class="portal-hello-text">
        <div class="portal-hello-hi">${_greeting()}，${_escape(name) || "同学"} 👋</div>
        <div class="portal-hello-sub">${PAGES.home.desc}</div>
      </div>
    </div>
    <div class="portal-section-title">📦 全部板块<span class="portal-section-sub">（按当前角色权限显示，共 ${mods.length} 个板块）</span></div>
    ${body}
    ${window._portalFavSection ? _portalFavSection() : ""}
    <div class="portal-panel-row">
      ${_portalTodoPanel()}
      ${window._portalNoticePanel ? _portalNoticePanel() : ""}
    </div>
  </div>`;
}

/* ========== OA 门户 · 板块首页（子系统磁贴一次性铺开） ========== */

function renderModuleHome() {
  const mk = window.curModule || curModule;
  const m = MODULES[mk];
  const subs = _visibleSubs(mk);
  const tiles = subs.map((s) => _portalSubTile(mk, s, "")).join("");
  // 列数钳制在 6~8：不足 6 个也至少 6 列，最多 8 个一行
  const cols = Math.max(6, Math.min(Math.max(subs.length, 1), 8));
  return `
  ${pageHeader(`${m.icon || "📦"} ${m.name}`, `共 ${subs.length} 个子系统`)}
  <div class="portal-grid portal-grid-subs" style="--cols:${cols}">${tiles}</div>`;
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
window._fmtDate = _fmtDate;
window._foldText = _foldText;
window._paStatusTag = _paStatusTag;
window._escape = _escape;
window._date = _date;
window._renderMd = _renderMd;
window._downloadJson = _downloadJson;
window.showLoginTodoModal = showLoginTodoModal;
window.updateBellBadge = updateBellBadge;
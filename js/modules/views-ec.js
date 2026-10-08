/* ========== 案例库模块视图 · views-ec.js ========== */
/* 包含：主列表 / 详情 / 提交（新增/编辑）/ 审核 */

/* ---------- 状态映射渲染辅助 ---------- */
function __ecStatusTag(status) {
  const m = window.EC_REVIEW_STATUS_MAP[status] || { label: status, cls: "p2" };
  return tag(m.label, m.cls);
}

/* ---------- 格式化 ---------- */
function __fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ---------- 当前筛选查询参数 ---------- */
let __ecQuery = {
  keyword: "",
  source: "全部",
  category: "全部",
  quality: "全部",
  promotionValue: "全部",
  dateRange: "全部",
  searchBody: false,
};
let __ecSortBy = "submittedAt"; // submittedAt | viewCount | likeCount
let __ecSortDir = "desc";      // asc | desc
let __ecSelectedId = null;

/* ---------- 经验案例库主列表页 ---------- */
function renderEcList() {
  const canAdd = window.currentCanAction("dev", "ec", "add") || window.currentCanAction("dev", "ec", "edit");
  const canExport = window.currentCanAction("dev", "ec", "export");

  // 右上角操作按钮
  const actions = [
    canAdd ? btn("+ 新建案例", "sm", "openEcSubmitForm()") : "",
    canExport ? btn("⇣ 导出已入库案例", "gray sm", "exportEcCases()") : "",
    btn("↻ 恢复默认数据", "gray sm", "confirmResetAllEc()"),
  ].filter(Boolean).join("");

  // 来源 / 分类 / 质量 / 推广价值 下拉
  const sourceOpts = ["全部", ...window.getStdDict("ecSources")];
  const categoryOpts = ["全部", ...window.getStdDict("ecCategories")];
  const qualityOpts = ["全部", ...window.getStdDict("ecQualities")];
  const valueOpts = ["全部", ...window.getStdDict("ecValues")];

  return `
  ${pageHeader(PAGES.ec.title, PAGES.ec.desc, actions)}

  ${card(`
    ${filterGroup([
      { label: "关键字", html: `<input class="ipt" id="ec_kw" placeholder="🔍 标题/分享人/关键字/产品/部门" value="${_escape(__ecQuery.keyword)}" />` },
      { label: "案例来源", html: select(sourceOpts, __ecQuery.source) },
      { label: "案例分类", html: select(categoryOpts, __ecQuery.category) },
      { label: "质量评价", html: select(qualityOpts, __ecQuery.quality) },
      { label: "推广价值", html: select(valueOpts, __ecQuery.promotionValue) },
      { label: "提交时间段", html: select(["全部", "近7天", "近30天", "近90天", "近1年"], __ecQuery.dateRange) },
      { label: "高级检索", html: `<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" ${__ecQuery.searchBody ? "checked" : ""} id="ec_body" /> 同时搜索案例正文</label>` },
      { label: " ", html: `${btn("🔍 搜索", "sm", "doEcSearch()")} ${btn(BTN.reset, "gray sm", "doEcReset()")}` },
    ])}
  `)}

  <div style="height:16px"></div>

  ${__renderEcResultList()}
  `;
}

function __renderEcResultList() {
  // 构建搜索 query
  const query = {
    keyword: __ecQuery.keyword,
    source: __ecQuery.source !== "全部" ? __ecQuery.source : null,
    category: __ecQuery.category !== "全部" ? __ecQuery.category : null,
    quality: __ecQuery.quality !== "全部" ? __ecQuery.quality : null,
    promotionValue: __ecQuery.promotionValue !== "全部" ? __ecQuery.promotionValue : null,
    searchBody: __ecQuery.searchBody,
  };
  // 时间段
  const now = Date.now();
  const DAY = 86400000;
  if (__ecQuery.dateRange === "近7天") query.dateStart = new Date(now - 7 * DAY).toISOString().slice(0, 10);
  else if (__ecQuery.dateRange === "近30天") query.dateStart = new Date(now - 30 * DAY).toISOString().slice(0, 10);
  else if (__ecQuery.dateRange === "近90天") query.dateStart = new Date(now - 90 * DAY).toISOString().slice(0, 10);
  else if (__ecQuery.dateRange === "近1年") query.dateStart = new Date(now - 365 * DAY).toISOString().slice(0, 10);

  let list = window.searchEcCases(query);

  // 排序（支持升/降序切换）
  const dirMul = __ecSortDir === "asc" ? 1 : -1;
  if (__ecSortBy === "viewCount") list.sort((a, b) => ((a.viewCount || 0) - (b.viewCount || 0)) * dirMul);
  else if (__ecSortBy === "likeCount") list.sort((a, b) => ((a.likeCount || 0) - (b.likeCount || 0)) * dirMul);
  else list.sort((a, b) => ((a.submittedAt || 0) - (b.submittedAt || 0)) * dirMul);

  if (list.length === 0) return zone(`<div class="empty">没有匹配的案例，请调整检索条件</div>`, `📑 检索结果（0 条）`);

  const canEdit = window.currentCanAction("dev", "ec", "edit");
  const canEditOwn = window.currentCanAction("dev", "ec", "edit");
  const canDel = window.currentCanAction("dev", "ec", "delete");
  const canReview = window.currentCanAction("dev", "ec", "admin");

  // 当前用户信息（用于判断是否是自己提交的）
  const curEmpId = window.CURR_ACCT_EMP_ID || "";

  const rows = list.map((c) => {
    // 质量/推广 tag
    const qTag = c.quality ? tag(c.quality, c.quality === "优秀" ? "ok" : (c.quality === "良好" ? "p2" : "muted")) : tag("—", "muted");
    const vTag = c.promotionValue ? tag(`推广：${c.promotionValue}`, c.promotionValue === "大" ? "ok" : (c.promotionValue === "中" ? "p2" : "muted")) : tag("—", "muted");
    // 操作按钮
    const ops = [btn("查看详情", "sm", `openEcDetail('${c.id}')`)];
    const isMyOwn = (c.shareEmpId || "") === curEmpId;
    // 编辑权限：管理员可编辑所有；普通成员只能编辑自己提交的且未被终审的
    if (canEdit || (canEditOwn && isMyOwn && c.reviewStatus !== "finalApproved")) {
      ops.push(btn("编辑", "ghost sm", `openEcSubmitForm('${c.id}')`));
    }
    if (canDel) {
      ops.push(btn("删除", "danger ghost sm", `confirmDeleteEcCase('${c.id}')`));
    }
    // 审核按钮（根据权限和状态）
    if (canReview && c.reviewStatus === "pending") {
      ops.push(btn("初审", "ghost sm", `openEcReviewModal('${c.id}', 'first')`));
    }
    if (canReview && c.reviewStatus === "firstReviewed") {
      ops.push(btn("部门审核", "ghost sm", `openEcReviewModal('${c.id}', 'dept')`));
    }
    if (canReview && c.reviewStatus === "deptReviewed") {
      ops.push(btn("副总工批准", "ghost sm", `openEcReviewModal('${c.id}', 'final')`));
    }
    if (c.reviewStatus === "returned" && (canEdit || (canEditOwn && isMyOwn))) {
      ops.push(btn("修改重提", "sm", `openEcResubmitForm('${c.id}')`));
    }
    return `<tr>
      <td><b style="cursor:pointer;color:var(--blue)" onclick="openEcDetail('${c.id}')">${_escape(c.title)}</b></td>
      <td>${_escape(c.shareName)}<div class="small muted">${_escape(c.shareDept || "")}</div></td>
      <td>${_escape(c.source)}</td>
      <td>${_escape(c.category)}</td>
      <td>${__ecStatusTag(c.reviewStatus)}</td>
      <td>${qTag}</td>
      <td>${vTag}</td>
      <td>👁 ${c.viewCount || 0}</td>
      <td>👍 ${c.likeCount || 0}</td>
      <td>${__fmtTime(c.submittedAt)}</td>
      <td style="white-space:nowrap">${ops.join(" ")}</td>
    </tr>`;
  }).join("");

  // 排序表头辅助
  const sortArrow = (colKey) => {
    if (__ecSortBy !== colKey) return '<span class="muted" style="opacity:.3;font-size:10px">▲▼</span>';
    return __ecSortDir === "asc"
      ? '<span style="color:var(--blue);font-size:11px">▲</span>'
      : '<span style="color:var(--blue);font-size:11px">▼</span>';
  };
  const sortTh = (colKey, inner) => `<th style="cursor:pointer;user-select:none;white-space:nowrap" onclick="doEcSortHeader('${colKey}')">${inner}</th>`;

  return zone(
    `<table class="tb tb-auto">
      <thead><tr>
        <th>案例标题</th>
        <th>分享人</th>
        <th>案例来源</th>
        <th>案例分类</th>
        <th>审核状态</th>
        <th>质量评价</th>
        <th>推广价值</th>
        ${sortTh("viewCount", `查阅次数 ${sortArrow("viewCount")}`)}
        ${sortTh("likeCount", `点赞数 ${sortArrow("likeCount")}`)}
        ${sortTh("submittedAt", `提交时间 ${sortArrow("submittedAt")}`)}
        <th>操作</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    `📑 检索结果（${list.length} 条）`
  );
}

/* ---------- 搜索 / 重置 / 排序 ---------- */
function doEcSearch() {
  const kwEl = document.getElementById("ec_kw");
  if (kwEl) __ecQuery.keyword = kwEl.value.trim();
  const gps = document.querySelectorAll(".filters");
  if (gps[0]) {
    const sels = gps[0].querySelectorAll("select");
    if (sels[0]) __ecQuery.source = sels[0].value;
    if (sels[1]) __ecQuery.category = sels[1].value;
    if (sels[2]) __ecQuery.quality = sels[2].value;
    if (sels[3]) __ecQuery.promotionValue = sels[3].value;
    if (sels[4]) __ecQuery.dateRange = sels[4].value;
  }
  const bodyCb = document.getElementById("ec_body");
  if (bodyCb) __ecQuery.searchBody = bodyCb.checked;
  replaceView();
}
function doEcReset() {
  __ecQuery = { keyword: "", source: "全部", category: "全部", quality: "全部", promotionValue: "全部", dateRange: "全部", searchBody: false };
  __ecSortBy = "submittedAt";
  __ecSortDir = "desc";
  replaceView();
}
/** 表头点击排序：同列点击切换升/降序；换列则重置为降序 */
function doEcSortHeader(colKey) {
  if (__ecSortBy === colKey) {
    __ecSortDir = __ecSortDir === "asc" ? "desc" : "asc";
  } else {
    __ecSortBy = colKey;
    __ecSortDir = "desc";
  }
  replaceView();
}

/* ---------- 案例详情弹窗 ---------- */
function openEcDetail(id) {
  const c = window.findEcCase(id);
  if (!c) return;
  __ecSelectedId = id;
  // 增加查阅次数 + 写日志
  window.incrementEcView(id);
  // 当前用户信息用于点赞
  const curEmpId = window.CURR_ACCT_EMP_ID || "";
  const isLiked = (c.likedBy || []).includes(curEmpId);

  openModal(modalContent(`📖 ${_escape(c.title)}`, __buildEcDetailFull(c, isLiked),
    `${btn("👍 点赞（" + (c.likeCount || 0) + "）", isLiked ? "ok" : "", `toggleEcLikeInModal('${id}', ${isLiked})`)} ${btn("📥 下载附件（带水印）", "gray", `downloadEcAttachment('${id}')`)} ${btn("关闭", "gray", "closeModal()")}`), "1100px");
}

/** 构建详情完整内容（五段式 + 元数据 + 附件 + 评论） */
function __buildEcDetailFull(c, isLiked) {
  // 元数据区
  const metaRows = [
    ["案例来源", _escape(c.source)],
    ["案例分类", _escape(c.category)],
    ["关联产品", _escape(c.productName || "—")],
    ["分享人", _escape(c.shareName || "—")],
    ["工号", _escape(c.shareEmpId || "—")],
    ["所在部门/小组", _escape(c.shareDept || "—")],
    ["直接主管", _escape(c.shareManager || "—")],
    ["提交时间", __fmtTime(c.submittedAt)],
    ["审核状态", __ecStatusTag(c.reviewStatus)],
    ["质量评价", c.quality ? tag(c.quality, c.quality === "优秀" ? "ok" : (c.quality === "良好" ? "p2" : "muted")) : "—"],
    ["推广价值", c.promotionValue ? tag(c.promotionValue, c.promotionValue === "大" ? "ok" : (c.promotionValue === "中" ? "p2" : "muted")) : "—"],
  ].map(([k, v]) => `<div class="meta-row"><div class="meta-label">${k}</div><div class="meta-value">${v}</div></div>`).join("");

  // 附件
  const attHtml = (c.attachments || []).map((a) => `<span style="font-size:12px;background:#f5f7fa;padding:4px 10px;border-radius:4px;margin-right:6px">📎 ${_escape(a.name)} <span class="muted">(${a.size})</span></span>`).join("") || `<span class="muted">无附件</span>`;

  // 水印
  const now = new Date();
  const wmText = `${window.CURR_ACCT_NAME || "用户"} ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const wmRepeat = Array(5).fill(wmText).join(" · ");

  // 五段式内容
  const sections = [
    { title: "① 问题描述", content: c.problemDesc },
    { title: "② 问题分析过程", content: c.analysis },
    { title: "③ 问题根因", content: c.rootCause },
    { title: "④ 解决方法", content: c.solution },
    { title: "⑤ 经验总结", content: c.summary },
  ].map((s) => s.content ? `
    <div style="margin-bottom:18px">
      <h4 style="margin:0 0 8px 0;color:var(--title);border-left:3px solid var(--blue);padding-left:10px">${s.title}</h4>
      <div style="white-space:pre-wrap;line-height:1.7;color:var(--text);background:#fafbfe;padding:12px 14px;border-radius:6px;border:1px solid #eef2ff">${_escape(s.content)}</div>
    </div>` : "").join("");

  // 审核记录
  const reviewChain = __buildEcReviewChain(c);

  // 点赞 / 评论
  const likeCount = c.likeCount || 0;
  const comments = c.comments || [];
  const commentListHtml = comments.length > 0 ? comments.map((cm) => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:10px">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#165dff,#4080ff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${(cm.userName || "?").slice(-1)}</div>
      <div style="flex:1">
        <div><b>${_escape(cm.userName)}</b> <span class="small muted">${__fmtTime(cm.time)}</span></div>
        <div style="margin-top:3px">${_escape(cm.content)}</div>
      </div>
    </div>`).join("") : `<div class="small muted" style="padding:12px 0;text-align:center">暂无评论，来抢沙发吧～</div>`;

  return `
  <div style="display:flex;gap:16px">
    <!-- 左侧：元数据 + 附件 + 审核链 -->
    <div style="width:280px;flex-shrink:0">
      <h4 style="margin-top:0;color:var(--title)">📋 元数据</h4>
      <div style="max-height:400px;overflow:auto">${metaRows}</div>
      <div style="margin-top:10px">📎 附件：${attHtml}</div>
      <div class="small muted" style="margin-top:4px">水印：${_escape(wmText)}</div>
      <div style="margin-top:14px">
        <h4 style="margin:0 0 8px 0;color:var(--title);font-size:13px">🔗 审核流程</h4>
        ${reviewChain}
      </div>
      <div style="margin-top:14px;padding:10px;background:#f5f7fa;border-radius:6px;font-size:12px;line-height:1.6;color:#666">
        <div>👁 已查阅 <b>${c.viewCount || 0}</b> 次</div>
        <div>👍 当前 <b>${likeCount}</b> 人点赞</div>
      </div>
    </div>
    <!-- 右侧：五段式内容 + 水印 + 评论 -->
    <div style="flex:1;min-width:0">
      <!-- 内容阅读区 + 水印 -->
      <div style="position:relative;border:1px solid var(--border);border-radius:8px;background:#fff;overflow:hidden">
        <!-- 水印层 -->
        <div style="pointer-events:none;position:absolute;inset:0;z-index:1;overflow:hidden">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:18px;color:rgba(22,93,255,.12);font-weight:600;white-space:nowrap;letter-spacing:2px">
            ${_escape(wmRepeat)}
          </div>
        </div>
        <!-- 正文 -->
        <div style="position:relative;z-index:2;padding:24px 28px;max-height:520px;overflow:auto">
          ${sections}
        </div>
      </div>
      <div class="small muted" style="margin-top:6px;text-align:right">🔒 内容已叠加「${_escape(wmText)}」动态水印</div>

      <!-- 评论区 -->
      <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:14px">
        <h4 style="margin:0 0 10px 0;color:var(--title);font-size:14px">💬 评论（${comments.length}）</h4>
        ${commentListHtml}
        <div style="margin-top:10px;display:flex;gap:8px">
          <input id="ec_cmt_input" class="ipt" placeholder="说点什么..." style="flex:1" />
          ${btn("发表评论", "sm", `submitEcCommentInModal('${c.id}')`)}
        </div>
      </div>
    </div>
  </div>
  `;
}

/** 构建审核链（时间线样式） */
function __buildEcReviewChain(c) {
  const stages = [
    { key: "firstReview", label: "直接主管初审", rev: c.firstReview },
    { key: "deptReview", label: "部门领导审核", rev: c.deptReview },
    { key: "finalReview", label: "副总工批准", rev: c.finalReview },
  ];
  // 根据状态确定当前环节
  const status = c.reviewStatus;
  const activeIdx = status === "pending" ? -1 :
    status === "firstReviewed" ? 0 :
    status === "deptReviewed" ? 1 :
    status === "finalApproved" ? 2 :
    status === "returned" ? -2 : -1;

  return stages.map((s, idx) => {
    const rev = s.rev || {};
    const isDone = rev.result === "通过";
    const isCurrent = idx === activeIdx;
    const isReturned = rev.result === "退回";
    let color = "#999"; // 未开始
    let icon = "○";
    if (isDone) { color = "#52c41a"; icon = "✓"; }
    else if (isReturned) { color = "#ff4d4f"; icon = "✗"; }
    else if (isCurrent) { color = "#165dff"; icon = "◎"; }
    return `<div style="display:flex;gap:8px;margin-bottom:8px;font-size:12px">
      <span style="color:${color};font-weight:bold;width:14px;flex-shrink:0">${icon}</span>
      <div style="flex:1">
        <div style="color:${color};font-weight:${isCurrent ? 600 : 400}">${s.label}${isCurrent && !isDone ? "（待审核）" : ""}</div>
        ${rev.reviewedBy ? `<div class="small muted">${_escape(rev.reviewedBy)}</div>` : ""}
        ${rev.comment ? `<div class="small muted" style="color:#888">${_escape(rev.comment)}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}

/* ---------- 详情弹窗内操作（点赞 / 下载 / 评论） ---------- */
function toggleEcLikeInModal(id, wasLiked) {
  const r = window.toggleEcLike(id);
  toast(wasLiked ? "已取消点赞" : "点赞成功！");
  // 刷新弹窗底部按钮和内容
  openEcDetail(id);
}
function downloadEcAttachment(id) {
  const c = window.findEcCase(id);
  if (!c) return;
  const now = new Date();
  const wmName = `${window.CURR_ACCT_NAME || "用户"}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  window.logEcOp("download", id, `下载附件（水印：${wmName}）`);
  toast(`下载成功：已写入水印「${wmName}」`);
}
function submitEcCommentInModal(id) {
  const inp = document.getElementById("ec_cmt_input");
  if (!inp) return;
  const txt = inp.value.trim();
  if (!txt) { toast("评论内容不能为空"); return; }
  window.addEcComment(id, txt);
  toast("评论发表成功");
  openEcDetail(id);
}

/* ---------- 提交案例弹窗（新增 / 编辑 / 退回后重提） ---------- */
function openEcSubmitForm(id) {
  if (id) {
    // 编辑模式
    const canEdit = window.currentCanAction("dev", "ec", "edit");
    const canEditOwn = window.currentCanAction("dev", "ec", "edit");
    const c = window.findEcCase(id);
    if (!c) return;
    const curEmpId = window.CURR_ACCT_EMP_ID || "";
    const isMyOwn = (c.shareEmpId || "") === curEmpId;
    if (!canEdit && !(canEditOwn && isMyOwn)) { toast("您没有编辑权限"); return; }
    openModal(modalContent("编辑案例 · " + _escape(c.title), __buildEcForm(c),
      `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditEcCase('${id}')`)}`), "860px");
  } else {
    // 新增模式
    if (!window.currentCanAction("dev", "ec", "add") && !window.currentCanAction("dev", "ec", "edit")) {
      toast("您没有提交案例的权限"); return;
    }
    openModal(modalContent("+ 分享经验案例", __buildEcForm(),
      `${btn("取消", "gray", "closeModal()")} ${btn("提交", "", "submitAddEcCase()")}`), "860px");
  }
}
function openEcResubmitForm(id) {
  // 退回后重新提交，复用编辑弹窗但按钮文案不同
  const c = window.findEcCase(id);
  if (!c) return;
  openModal(modalContent("修改并重新提交 · " + _escape(c.title), __buildEcForm(c),
    `${btn("取消", "gray", "closeModal()")} ${btn("重新提交", "", `submitResubmitEcCase('${id}')`)}`), "860px");
}

/** 构建案例提交表单 HTML */
function __buildEcForm(c) {
  const src = c || {};
  // 当前用户信息（编辑时保留原分享人，新增时用当前登录人自动填充）
  const curName = src.shareName || window.CURR_ACCT_NAME || "";
  const curEmpId = src.shareEmpId || window.CURR_ACCT_EMP_ID || "";
  const curDept = src.shareDept || "";
  const curManager = src.shareManager || "";

  // 来源 / 分类 / 质量 / 推广价值 下拉
  const sourceOpts = window.getStdDict("ecSources");
  const categoryOpts = window.getStdDict("ecCategories");
  const qualityOpts = window.getStdDict("ecQualities");
  const valueOpts = window.getStdDict("ecValues");

  // 关键字 chip
  const kwArr = src.keywords || [];
  const kwHtml = `
  <div id="kw_chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
    ${kwArr.map((k) => `<span class="chip-in" data-k="${_escape(k)}" style="font-size:13px;background:#eef2ff;color:#165dff;padding:3px 8px;border-radius:12px;display:inline-flex;align-items:center;gap:4px;cursor:default">${_escape(k)}<b style="cursor:pointer;font-weight:bold" onclick="__removeKwChip(this)">×</b></span>`).join("")}
    <input id="ec_kw_input" placeholder="${UI.addKeyword}" style="width:130px;padding:3px 8px;border:1px dashed var(--border);border-radius:12px;font-size:13px;outline:none;background:transparent" onkeydown="__onKwInput(event)" />
  </div>`;

  return `
  ${formRow("案例标题", `<input id="ef_title" class="ipt" value="${_escape(src.title || "")}" placeholder="${UI.caseTitlePlaceholder}" />`, true)}
  <div class="row" style="gap:8px">
    ${formRow("分享人姓名", `<input id="ef_shareName" class="ipt" value="${_escape(curName)}" ${c ? "" : "disabled"} />`, true)}
    ${formRow("工号", `<input id="ef_shareEmpId" class="ipt" value="${_escape(curEmpId)}" ${c ? "" : "disabled"} />`, true)}
  </div>
  <div class="row" style="gap:8px">
    ${formRow("所在部门/小组", `<input id="ef_shareDept" class="ipt" value="${_escape(curDept)}" />`)}
    ${formRow("直接主管", `<input id="ef_shareManager" class="ipt" value="${_escape(curManager)}" />`)}
  </div>
  ${formRow("关键字（3~5 个）", kwHtml, true, "回车添加；点击 × 删除；提交时校验数量")}
  <div class="row" style="gap:8px">
    ${formRow("关联产品名称", `<input id="ef_productName" class="ipt" value="${_escape(src.productName || "")}" placeholder="${UI.productPlaceholder}" />`, true)}
    ${formRow("案例来源", select(sourceOpts, src.source || sourceOpts[0] || "", "width:100%"), true)}
    ${formRow("案例分类", select(categoryOpts, src.category || categoryOpts[0] || "", "width:100%"), true)}
  </div>

  <!-- 五段式 -->
  <div style="margin-top:10px">
    ${UI.phases.map((h, i) => {
      const key = ["problemDesc", "analysis", "rootCause", "solution", "summary"][i];
      const ph = UI.phasePlaceholders[i];
      return `
      <div class="seg" style="margin-bottom:10px">
        ${formRow(h, `<textarea id="ef_${key}" class="ipt" rows="2" placeholder="${ph}">${_escape(src[key] || "")}</textarea>`, i === 0)}
      </div>`;
    }).join("")}
  </div>

  ${formRow("案例文档附件", `<div style="display:flex;gap:8px;align-items:center">
    <input id="ef_attachName" class="ipt" value="${(src.attachments && src.attachments[0] && src.attachments[0].name) || ""}" placeholder="如：分析报告.docx" style="flex:1" />
    <input id="ef_attachSize" class="ipt" value="${(src.attachments && src.attachments[0] && src.attachments[0].size) || "2MB"}" placeholder="文件大小" style="width:120px" />
    <input id="ef_attachType" class="ipt" value="${(src.attachments && src.attachments[0] && src.attachments[0].type) || "docx"}" placeholder="pdf/docx" style="width:80px" />
  </div>
  <div class="small muted" style="margin-top:4px">支持 Word（.docx）或 PDF 格式；原型演示不支持真正文件上传，实际部署对接对象存储。</div>`)}

  ${lockNote(UI.lockNoteCase, "")}
  `;
}

/** 关键字 chip 交互 */
function __removeKwChip(btn) {
  btn.parentElement.remove();
}
function __onKwInput(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const inp = e.target;
    const val = inp.value.trim();
    if (!val) return;
    // 已有 chip 数量
    const chips = document.querySelectorAll("#kw_chips .chip-in");
    if (chips.length >= 5) { toast("关键字最多 5 个"); return; }
    // 去重
    const exists = Array.from(chips).some((c) => c.dataset.k === val);
    if (exists) { toast("关键字已存在"); return; }
    const chip = document.createElement("span");
    chip.className = "chip-in";
    chip.dataset.k = val;
    chip.style = "font-size:13px;background:#eef2ff;color:#165dff;padding:3px 8px;border-radius:12px;display:inline-flex;align-items:center;gap:4px;cursor:default";
    chip.innerHTML = `${val}<b style="cursor:pointer;font-weight:bold" onclick="__removeKwChip(this)">×</b>`;
    inp.before(chip);
    inp.value = "";
  }
}

/** 读取表单值 */
function __readEcForm() {
  const getV = (id) => document.getElementById(id)?.value || "";
  const selects = document.querySelectorAll("#modal select");
  // 读取关键字 chips
  const kwChips = document.querySelectorAll("#kw_chips .chip-in");
  const keywords = Array.from(kwChips).map((c) => c.dataset.k);
  // 五段式
  const sections = ["problemDesc", "analysis", "rootCause", "solution", "summary"];
  const sectionVals = sections.reduce((acc, key) => { acc[key] = getV("ef_" + key); return acc; }, {});

  return Object.assign({
    title: getV("ef_title"),
    shareName: getV("ef_shareName"),
    shareEmpId: getV("ef_shareEmpId"),
    shareDept: getV("ef_shareDept"),
    shareManager: getV("ef_shareManager"),
    keywords,
    productName: getV("ef_productName"),
    source: selects[0]?.value || "",
    category: selects[1]?.value || "",
    attachments: [{
      name: getV("ef_attachName") || "附件.pdf",
      type: getV("ef_attachType") || "pdf",
      size: getV("ef_attachSize") || "1MB",
    }],
  }, sectionVals);
}

/* ---------- 表单提交处理（含查重） ---------- */
function submitAddEcCase() {
  const d = __readEcForm();
  if (!__validateEcForm(d)) return;

  // 查重
  const dupResults = window.checkEcDuplicate(d.title, d.attachments);
  if (dupResults.length > 0) {
    __showEcDupConfirm(d, dupResults, "add");
  } else {
    __doSubmitAddEc(d);
  }
}
function submitEditEcCase(id) {
  const d = __readEcForm();
  if (!d.title) { toast("请填写案例标题"); return; }
  const r = window.updateEcCase(id, d);
  if (!r) { toast("保存失败"); return; }
  toast("已保存：" + r.title);
  closeModal();
  replaceView();
}
function submitResubmitEcCase(id) {
  const d = __readEcForm();
  if (!__validateEcForm(d)) return;

  // 查重（排除自身）
  const dupResults = window.checkEcDuplicate(d.title, d.attachments).filter((r) => r.case.id !== id);
  if (dupResults.length > 0) {
    __showEcDupConfirm(d, dupResults, "resubmit", id);
  } else {
    __doResubmitEc(id, d);
  }
}

function __validateEcForm(d) {
  if (!d.title) { toast("请填写案例标题"); return false; }
  if ((d.keywords || []).length < 3) { toast("关键字至少 3 个，当前 " + d.keywords.length + " 个"); return false; }
  if ((d.keywords || []).length > 5) { toast("关键字最多 5 个，当前 " + d.keywords.length + " 个"); return false; }
  if (!d.productName) { toast("请填写关联产品名称"); return false; }
  if (!d.source) { toast("请选择案例来源"); return false; }
  if (!d.category) { toast("请选择案例分类"); return false; }
  if (!d.problemDesc) { toast("请填写问题描述"); return false; }
  return true;
}

/** 查重结果确认弹窗 */
function __showEcDupConfirm(data, dupResults, mode, editId) {
  const itemsHtml = dupResults.slice(0, 3).map((r) => `
    <div class="card" style="background:#fafbfe;margin-bottom:8px">
      <b>${_escape(r.case.title)}</b>
      <div class="small muted">分享人：${_escape(r.case.shareName || "")} · ${_escape(r.case.category || "")} · 查阅 ${r.case.viewCount || 0} 次</div>
      <div style="margin-top:6px">${pill((r.type === "title" ? "标题相似" : "附件重复") + " " + r.similarity + "%", "p3")}</div>
    </div>`).join("");
  const extra = dupResults.length > 3 ? `<div class="small muted">...另有 ${dupResults.length - 3} 条疑似相似案例</div>` : "";

  openModal(modalContent(UI.duplicateCheckTitle,
    `<p class="muted">${UI.duplicateCheckText}</p>
    ${itemsHtml}${extra}
    <p style="margin-top:12px">${UI.duplicateCheckAdvice}</p>`,
    `${btn("返回修改", "gray", "closeModal()")} ${btn("确认非重复并提交", "", `closeModal();window.__doDupConfirm(${JSON.stringify(mode)}, ${JSON.stringify(editId || null)})`)}`), "620px");
  // 暂存表单数据到 window
  window.__ecFormData = data;
  window.__ecDupMode = mode;
  window.__ecDupEditId = editId;
}

/** 查重确认非重复后真正提交 */
function __doDupConfirm(mode, editId) {
  const d = window.__ecFormData;
  if (mode === "add") __doSubmitAddEc(d);
  else if (mode === "resubmit") __doResubmitEc(editId, d);
  window.__ecFormData = null;
}

function __doSubmitAddEc(d) {
  const r = window.addEcCase(d);
  if (!r) { toast("提交失败"); return; }
  toast(TOAST.ecSubmitOk);
  closeModal();
  replaceView();
}
function __doResubmitEc(id, d) {
  window.updateEcCase(id, d);
  const r = window.submitEcCase(id);
  if (!r) { toast("提交失败"); return; }
  toast(TOAST.ecSubmitOk);
  closeModal();
  replaceView();
}

/* ---------- 删除确认 ---------- */
function confirmDeleteEcCase(id) {
  const c = window.findEcCase(id); if (!c) return;
  openModal(modalContent("确认删除案例",
    `<p>确认删除 <b>${_escape(c.title)}</b>？</p>
     <p class="small muted">此操作不可恢复。</p>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDeleteEcCase('${id}')`)}`));
}
function doDeleteEcCase(id) {
  window.deleteEcCase(id); closeModal(); toast("已删除"); replaceView();
}

/* ---------- 审核弹窗 ---------- */
function openEcReviewModal(id, stage) {
  const c = window.findEcCase(id); if (!c) return;
  const stageLabel = stage === "first" ? "直接主管初审" : (stage === "dept" ? "部门领导审核" : "副总工批准");

  openModal(modalContent(`${stageLabel} · ${_escape(c.title)}`, __buildEcReviewForm(c, stage),
    `${btn("退回修改", "gray", `__preReturnEcReview('${id}', '${stage}')`)} ${btn("审核通过", "", `doEcReviewApprove('${id}', '${stage}')`)}`), "720px");
}

function __buildEcReviewForm(c, stage) {
  const qualityOpts = window.getStdDict("ecQualities");
  const valueOpts = window.getStdDict("ecValues");
  // 已有值（后两个环节可能已有初审的值）
  const curQuality = c.quality || qualityOpts[0];
  const curValue = c.promotionValue || valueOpts[0];
  // 前序环节意见
  const prevReview = stage === "dept" ? c.firstReview : (stage === "final" ? (c.deptReview || c.firstReview) : null);
  const prevHtml = prevReview && prevReview.reviewedBy ? `
    <div style="padding:10px;background:#f5f7fa;border-radius:6px;margin-bottom:10px;font-size:12px;line-height:1.6">
      <b>前序审核意见：</b><br>
      审核人：${_escape(prevReview.reviewedBy)} · 结果：<span style="color:${prevReview.result === "通过" ? "#52c41a" : "#ff4d4f"}">${prevReview.result}</span>
      ${prevReview.comment ? `<br>意见：${_escape(prevReview.comment)}` : ""}
    </div>` : "";

  // 案例摘要（审核时快速了解）
  const summaryHtml = `
    <div style="padding:10px;background:#fafbfe;border-radius:6px;border-left:3px solid var(--blue);margin-bottom:12px;font-size:12px;line-height:1.8">
      <div><b>来源：</b>${_escape(c.source)} · <b>分类：</b>${_escape(c.category)} · <b>产品：</b>${_escape(c.productName || "—")}</div>
      <div><b>关键字：</b>${(c.keywords || []).map((k) => _escape(k)).join("、")}</div>
      <div><b>问题描述：</b>${_escape((c.problemDesc || "").slice(0, 120))}${(c.problemDesc || "").length > 120 ? "..." : ""}</div>
    </div>`;

  return `
  ${prevHtml}
  ${summaryHtml}

  ${formRow("质量评价", select(qualityOpts, curQuality, "width:100%"), true, "初审时填入，后续环节可修改")}
  ${formRow("推广价值", select(valueOpts, curValue, "width:100%"), true, "初审时填入，后续环节可修改")}
  ${formRow("审核意见", `<textarea id="ec_review_comment" class="ipt" rows="3" placeholder="请填写审核意见（选填）"></textarea>`)}
  `;
}

function doEcReviewApprove(id, stage) {
  const c = window.findEcCase(id); if (!c) return;
  const selects = document.querySelectorAll("#modal select");
  const quality = selects[0]?.value || c.quality;
  const promotionValue = selects[1]?.value || c.promotionValue;
  const comment = (document.getElementById("ec_review_comment")?.value || "").trim();

  let r;
  if (stage === "first") r = window.firstReviewEcCase(id, "通过", comment, quality, promotionValue);
  else if (stage === "dept") r = window.deptReviewEcCase(id, "通过", comment, quality, promotionValue);
  else if (stage === "final") r = window.finalReviewEcCase(id, "通过", comment, quality, promotionValue);

  if (!r) { toast("审核失败"); return; }
  const nextLabel = stage === "first" ? "主管初审通过 → 流转至部门审核" :
                    stage === "dept" ? "部门审核通过 → 流转至副总工批准" :
                    "副总工已批准 → 案例入库";
  toast(nextLabel);
  closeModal();
  replaceView();
}

/** 退回（进入退回原因弹窗） */
function __preReturnEcReview(id, stage) {
  const c = window.findEcCase(id); if (!c) return;
  openModal(modalContent("退回修改原因",
    `<p>将退回案例 <b>${_escape(c.title)}</b>，提交人可修改后重新提交。</p>
     ${formRow("退回原因", `<textarea id="ec_return_reason" class="ipt" rows="3" placeholder="${UI.returnPlaceholder}"></textarea>`, true)}`,
    `${btn("取消", "gray", "closeModal()")} ${btn(BTN.confirmReturn, "danger", `doEcReviewReturn('${id}', '${stage}')`)}`));
}

function doEcReviewReturn(id, stage) {
  const reason = (document.getElementById("ec_return_reason")?.value || "").trim();
  if (!reason) { toast("请填写退回原因"); return; }
  let r;
  if (stage === "first") r = window.firstReviewEcCase(id, "退回", reason);
  else if (stage === "dept") r = window.deptReviewEcCase(id, "退回", reason);
  else if (stage === "final") r = window.finalReviewEcCase(id, "退回", reason);
  if (!r) { toast("退回失败"); return; }
  toast(TOAST.ecReturnOk);
  closeModal();
  replaceView();
}

/* ---------- 恢复默认 ---------- */
function confirmResetAllEc() {
  openModal(modalContent("恢复案例库默认数据",
    `<p>将清除所有案例条目、审核记录、操作日志，恢复为系统默认的 10 条种子数据。</p>
     <p class="small muted">当前 localStorage 中的案例库数据将被覆盖（不影响标准库、绩效考核等其他模块）。</p>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认恢复", "danger", `doResetAllEc()`)}`));
}
function doResetAllEc() { window.resetAllEc(); closeModal(); toast("已恢复默认数据"); replaceView(); }

/* ---------- 导出（仅示意） ---------- */
function exportEcCases() {
  const c = window.EC_CASES || [];
  const approved = c.filter((x) => x.reviewStatus === "finalApproved");
  toast(`已导出 ${approved.length} 条已入库案例为 Excel（示意，实际对接后端导出接口）`);
}


/* ---------- 案例库 VIEWS 填充 ---------- */
VIEWS.ec = renderEcList;
VIEWS.ecSubmit = function () { window.go("ec"); openEcSubmitForm(); return ""; };

/* ---------- 案例库 window 挂载 ---------- */
window.doEcSearch = doEcSearch;
window.doEcReset = doEcReset;
window.doEcSortHeader = doEcSortHeader;
window.openEcDetail = openEcDetail;
window.toggleEcLikeInModal = toggleEcLikeInModal;
window.downloadEcAttachment = downloadEcAttachment;
window.submitEcCommentInModal = submitEcCommentInModal;
window.openEcSubmitForm = openEcSubmitForm;
window.openEcResubmitForm = openEcResubmitForm;
window.submitAddEcCase = submitAddEcCase;
window.submitEditEcCase = submitEditEcCase;
window.submitResubmitEcCase = submitResubmitEcCase;
window.__doDupConfirm = __doDupConfirm;
window.__removeKwChip = __removeKwChip;
window.__onKwInput = __onKwInput;
window.confirmDeleteEcCase = confirmDeleteEcCase;
window.doDeleteEcCase = doDeleteEcCase;
window.openEcReviewModal = openEcReviewModal;
window.doEcReviewApprove = doEcReviewApprove;
window.doEcReviewReturn = doEcReviewReturn;
window.confirmResetAllEc = confirmResetAllEc;
window.doResetAllEc = doResetAllEc;
window.exportEcCases = exportEcCases;
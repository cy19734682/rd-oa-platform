/* ========== 标准库模块视图 · views-std.js ========== */
/* 包含：首页看板 / 搜索 / 详情 / 维护 / 字典管理 */

/* ---------- 标准库 ---------- */
/* ---------- 标准库首页（看板 + 检索 + 列表 + 详情） ---------- */
let __stdQuery = { keyword: "", level: "", domain: "", status: "", yearRange: "", searchBody: false };
let __stdSelectedId = null;

function renderStdHome() {
  const canAdd = window.currentCanAction("dev", "stdHome", "add");

  // 右上角操作按钮（仅管理员可见）
  const actions = [
    canAdd ? btn("+ 新建标准", "sm", "openAddStd()") : "",
  ].filter(Boolean).join("");

  // 状态下拉：从数据字典读中文 label，通过 statusMap 反查英文 key 作为 option value
  const statusFilterOpts = [
    { value: "", label: "" },
    ...window.getStdDict("statuses").map((label) => {
      const found = Object.entries(UI.statusMap || {}).find(([, v]) => v === label);
      return found ? { value: found[0], label } : { value: label, label };
    }),
  ];
  return `
  ${pageHeader(PAGES.stdHome.title, PAGES.stdHome.desc, actions)}

  ${card(`
    ${filterGroup([
      { label: "关键词", html: `<input class="ipt" id="std_kw" placeholder="${UI.keywordPlaceholder}" value="${_escape(__stdQuery.keyword)}" />` },
      { label: "标准级别", html: select(["", ...window.getStdDict("levels")], __stdQuery.level) },
      { label: "所属领域", html: select(["", ...window.getStdDict("domains")], __stdQuery.domain) },
      { label: "状态", html: select(statusFilterOpts, __stdQuery.status) },
      { label: "发布年份", html: select(["", "2026", "2025", "2020-2024", "更早"], __stdQuery.yearRange) },
      { label: "高级检索", html: `<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" ${__stdQuery.searchBody ? "checked" : ""} id="std_body" /> 同时搜索标准正文</label>` },
      { label: " ", html: `${btn("🔍 搜索", "sm", "doStdSearch()")} ${btn(BTN.reset, "gray sm", "doStdReset()")}` },
    ])}
  `)}

  <div style="height:16px"></div>

  ${__renderStdResultList()}
  `;
}

function __renderStdResultList() {
  const list = window.searchStandards(__stdQuery);
  if (list.length === 0) return zone(`<div class="empty">没有匹配的标准，请调整检索条件</div>`, `📑 检索结果（0 条）`);
  const canEdit = window.currentCanAction("dev", "stdHome", "edit");
  const canDel = window.currentCanAction("dev", "stdHome", "delete");
  const rows = list.map((s) => {
    const statusLabel = UI.statusMap[s.status] || s.status;
    const statusCls = UI.statusClsMap[s.status] || "ok";
    const ops = [btn("查看详情", "sm", `openStdDetail('${s.id}')`)];
    if (canEdit) {
      ops.push(btn("编辑", "ghost sm", `openEditStd('${s.id}')`));
      ops.push(btn("升级新版本", "ghost sm", `openUpgradeStd('${s.id}')`));
      if (s.status === "current") {
        ops.push(btn("废止", "danger ghost sm", `confirmAbolishStd('${s.id}')`));
      }
    }
    if (canDel) ops.push(btn("删除", "danger ghost sm", `confirmDeleteStd('${s.id}')`));
    return `<tr>
      <td>${_escape(s.stdNo)}</td>
      <td><b>${_escape(s.nameCn)}</b>${s.nameEn ? `<div class="small muted">${_escape(s.nameEn)}</div>` : ""}</td>
      <td>${_escape(s.level)}</td>
      <td>${_escape(s.nature)}</td>
      <td>${tag(statusLabel, statusCls)}</td>
      <td>${_escape(s.implDate)}</td>
      <td style="white-space:nowrap">${ops.join(" ")}</td>
    </tr>`;
  }).join("");
  return zone(
    `<table class="tb tb-auto">
      <thead><tr>${TH.std.search.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    `📑 检索结果（${list.length} 条）`
  );
}

function doStdSearch() {
  __stdQuery.keyword = (document.getElementById("std_kw")?.value || "").trim();
  const gps = document.querySelectorAll(".filters");
  if (gps[0]) {
    const sel1 = gps[0].querySelectorAll("select");
    __stdQuery.level = sel1[0]?.value || "";
    __stdQuery.domain = sel1[1]?.value || "";
    __stdQuery.status = sel1[2]?.value || "";
    __stdQuery.yearRange = sel1[3]?.value || "";
  }
  __stdQuery.searchBody = !!document.getElementById("std_body")?.checked;
  replaceView();
}

function doStdReset() {
  __stdQuery = { keyword: "", level: "", domain: "", status: "", yearRange: "", searchBody: false };
  replaceView();
}

function openStdDetail(id, goReader) {
  __stdSelectedId = id;
  const s = window.findStandard(id); if (!s) return;
  window.logStdOp("preview", id, `在线预览 ${s.stdNo}`);
  // 重开时保留当前全屏状态（如从其他入口再次打开）
  const keepFs = document.getElementById("mask").classList.contains("fullscreen");
  openModal(modalContent(`📖 ${_escape(s.stdNo)} · ${_escape(s.nameCn)}`, __buildStdDetailFull(id, s, goReader),
    `<span id="modal_std_footer"></span>`, btnFullscreen()),
    { width: "1200px", fullscreen: keepFs });
  __updateStdDetail(id, s);
}

/** 构建整个弹窗 body：三列布局——元数据（左·定宽）｜正文预览（中·弹性）｜历史版本（右·定宽），仅打开时调用一次 */
function __buildStdDetailFull(id, s) {
  const rawChain = window.getStdVersionChain(id) || [];
  // 当前版本置顶，其余保持年份升序
  let versionChain = rawChain;
  if (rawChain.length > 1) {
    const curIdx = rawChain.findIndex((v) => v.id === id);
    if (curIdx > 0) {
      versionChain = [rawChain[curIdx], ...rawChain.slice(0, curIdx), ...rawChain.slice(curIdx + 1)];
    }
  }
  let sidebarHtml = "";
  if (versionChain.length > 1) {
    sidebarHtml = `
    <div style="width:168px;flex-shrink:0;border-left:1px solid var(--border);padding-left:12px">
      <h4 style="margin:0 0 8px 0;color:var(--title);font-size:13px">📚 历史版本</h4>
      <div id="modal_std_sidebar" style="display:flex;flex-direction:column;gap:5px">
        ${versionChain.map((v) => __buildVersionSidebarCardHtml(v, id, rawChain)).join("")}
      </div>
    </div>`;
  }
  return `
  <div style="display:flex;gap:16px;align-items:flex-start">
    <div id="modal_std_meta_body" style="width:290px;flex-shrink:0"></div>
    <div id="modal_std_detail_body" style="flex:1;min-width:0"></div>
    ${sidebarHtml}
  </div>
  `;
}

/** 侧栏单张卡片 HTML（带 data-id 属性便于切换高亮） */
function __buildVersionSidebarCardHtml(v, currentId, chain) {
  const vLabel = UI.statusMap[v.status] || v.status;
  const vCls = UI.statusClsMap[v.status] || "ok";
  const isActive = v.id === currentId;
  const isLatest = v.id === chain[chain.length - 1].id;
  return `
  <div class="modal_std_ver_card" data-id="${v.id}" onclick="__switchStdDetail('${v.id}')" style="cursor:pointer;padding:7px 9px;border-radius:6px;border:1px solid ${isActive ? 'var(--blue)' : 'var(--border)'};background:${isActive ? 'rgba(22,93,255,0.06)' : 'transparent'};transition:all .15s">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:${isActive ? 600 : 400};color:${isActive ? 'var(--blue)' : 'var(--text)'};font-size:13px">${_escape(v.version)}</span>
      ${isLatest && !isActive ? `<span style="font-size:11px;background:var(--blue);color:#fff;padding:1px 6px;border-radius:3px">现行</span>` : ""}
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:3px">${_escape(v.stdNo)}</div>
    <div style="margin-top:3px">${tag(vLabel, vCls, "font-size:11px;padding:1px 6px")}</div>
  </div>`;
}

/** 切换历史版本：更新详情内容 + 侧栏高亮 + modal 标题 + 底部按钮 */
function __switchStdDetail(id) {
  __stdSelectedId = id;
  const s = window.findStandard(id); if (!s) return;
  window.logStdOp("preview", id, `切换查看 ${s.stdNo}`);
  __updateStdDetail(id, s);
}

function __updateStdDetail(id, s) {
  // 1. 更新 modal 标题
  const modal = document.getElementById("modal");
  if (modal) {
    const titleEl = modal.querySelector(".modal-title");
    if (titleEl) titleEl.textContent = `📖 ${s.stdNo} · ${s.nameCn}`;
  }

  // 2. 更新侧栏高亮（只改已有卡片的样式，不改 DOM 结构）
  document.querySelectorAll(".modal_std_ver_card").forEach((card) => {
    const cid = card.getAttribute("data-id");
    const isActive = cid === id;
    card.style.borderColor = isActive ? "var(--blue)" : "var(--border)";
    card.style.background = isActive ? "rgba(22,93,255,0.06)" : "transparent";
    const labelEl = card.querySelector("span:first-child");
    if (labelEl) {
      labelEl.style.fontWeight = isActive ? "600" : "400";
      labelEl.style.color = isActive ? "var(--blue)" : "var(--text)";
    }
  });

  // 3. 更新元数据列（左）与正文预览列（中），侧栏结构不动
  const meta = document.getElementById("modal_std_meta_body");
  if (meta) meta.innerHTML = __buildStdMetaOnly(s);
  const body = document.getElementById("modal_std_detail_body");
  if (body) body.innerHTML = __buildStdReaderOnly(s);

  // 4. 更新底部下载按钮
  const footer = document.getElementById("modal_std_footer");
  if (footer) footer.innerHTML = btn("下载 PDF（带水印）", "", `downloadStd('${id}')`);
}

/** 只构建左列元数据（元数据 + 附件 + 水印说明） */
function __buildStdMetaOnly(s) {
  const statusLabel = UI.statusMap[s.status] || s.status;
  const statusCls = UI.statusClsMap[s.status] || "ok";
  const meta = [
    ["标准编号", _escape(s.stdNo)],
    ["中文名称", _escape(s.nameCn)],
    ["英文名称", _escape(s.nameEn) || "—"],
    ["发布日期", _escape(s.pubDate) || "—"],
    ["实施日期", _escape(s.implDate) || "—"],
    ["标准状态", tag(statusLabel, statusCls)],
    ["标准级别", _escape(s.level) + " / " + _escape(s.nature)],
    ["所属领域", _escape(s.domain) || "—"],
    ["归口组织", _escape(s.org) || "—"],
    ["起草单位", _escape(s.drafter) || "—"],
    ["起草人员", _escape(s.drafterPeople) || "—"],
    ["参编单位", _escape(s.coDrafter) || "—"],
    ["参编人员", _escape(s.coDrafterPeople) || "—"],
    ["发布机构", _escape(s.publisher) || "—"],
    ["代替标准号", _escape(s.supersedes) || "—"],
    ["被代替于", s.supersededBy ? _escape(s.supersededBy) : "—"],
  ].map(([k, v]) => `<div class="meta-row"><div class="meta-label">${k}</div><div class="meta-value">${v}</div></div>`).join("");

  const attachHtml = (s.attachments || []).map((a) => tag(`${a.type.toUpperCase()} · ${_escape(a.name)} · ${a.size}`, "g")).join(" ") || tag("无附件", "muted");
  const wmText = __stdWmText();

  return `
    <h4 style="margin:0 0 8px 0;color:var(--title);font-size:13px">📋 元数据</h4>
    <div class="std-detail-meta" style="max-height:520px;overflow:auto">${meta}</div>
    <div style="margin-top:10px">📎 附件：${attachHtml}</div>
    <div class="small muted" style="margin-top:4px">水印：${_escape(wmText)}</div>
  `;
}

/** 只构建中列正文预览（阅读器工具条 + 水印阅读区 + 说明） */
function __buildStdReaderOnly(s) {
  const wmText = __stdWmText();
  const wmRepeat = Array(6).fill(wmText).join("  ·  ");

  return `
    <div class="reader-bar"><span>📄 ${_escape(s.stdNo)}.pdf — 第 1 / ${Math.max(2, Math.ceil((s.body || "").length / 200))} 页</span>
      <span class="zoom"><button onclick="toast('上一页')">◀</button><button onclick="toast('下一页')">▶</button><button onclick="toast('放大')">＋</button><button onclick="toast('缩小')">－</button></span></div>
    <div class="reader">
      <div class="wm"><span>${_escape(wmRepeat)}</span></div>
      <div class="pg">
        <h4 style="text-align:center">${_escape(s.stdNo)}<br><span class="small muted">${_escape(s.nameCn)}</span></h4>
        <hr style="margin:12px 0" />
        <div style="white-space:pre-wrap;line-height:1.7">${_escape(s.body || "(标准正文预览区)")}</div>
      </div>
    </div>
    <div class="small muted" style="margin-top:8px">在线预览叠加「用户名+时间」动态水印，防止截屏泄密；翻页 / 放大缩小 / 页码跳转可用。</div>
  `;
}

/** 水印文本（用户名 + 当前时间），元数据列与阅读区共用 */
function __stdWmText() {
  const now = new Date();
  return `${window.CURR_ACCT_NAME || "用户"} ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function downloadStd(id) {
  const s = window.findStandard(id); if (!s) return;
  window.logStdOp("download", id, `下载 ${s.stdNo}（水印：${window.CURR_ACCT_NAME || "用户"}）`);
  toast(TOAST.downloadDone);
}

/* ---------- 标准维护（已合并到标准库，保留 renderStdMaint 作为 redirect 兼容） ---------- */
function renderStdMaint() {
  window.go("stdHome");
  return "";
}

/* ---------- 标准维护弹窗 ---------- */
function openAddStd() {
  openModal(modalContent("+ 新建标准条目", __buildStdForm(),
    `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", "submitAddStd()")}`), "820px");
}

function openEditStd(id) {
  const s = window.findStandard(id); if (!s) return;
  openModal(modalContent("编辑标准 · " + _escape(s.stdNo), __buildStdForm(s),
    `${btn("取消", "gray", "closeModal()")} ${btn("保存修改", "", `submitEditStd('${id}')`)}`), "820px");
}

function openUpgradeStd(id) {
  const s = window.findStandard(id); if (!s) return;
  openModal(modalContent(`升级新版本（代替 ${s.stdNo}）`, __buildStdForm(s, true),
    `${btn("取消", "gray", "closeModal()")} ${btn("确认升级", "", `submitUpgradeStd('${id}')`)}`), "820px");
}

function __buildStdForm(s, isUpgrade) {
  const src = s || {};
  const year = new Date().getFullYear();
  // 状态下拉选项：从数据字典读中文 label，通过 statusMap 反查英文 key 作为 option value
  const statusOpts = window.getStdDict("statuses").map((label) => {
    const found = Object.entries(UI.statusMap || {}).find(([, v]) => v === label);
    return found ? { value: found[0], label } : { value: label, label };
  });
  return `
  <div class="row" style="gap:8px">
    <div style="flex:1">${formRow("标准编号", `<input id="sf_stdNo" class="ipt" value="${_escape(src.stdNo || (isUpgrade ? (src.stdNo || "GB/T 0000") : ""))}" ${isUpgrade ? "" : ""} />`, true, `如 GB/T 6968-${year}`)}</div>
    <div style="flex:1">${formRow("发布日期", `<input id="sf_pubDate" class="ipt" type="date" value="${_escape(src.pubDate || "")}" />`, true)}</div>
    <div style="flex:1">${formRow("实施日期", `<input id="sf_implDate" class="ipt" type="date" value="${_escape(src.implDate || "")}" />`, true)}</div>
  </div>
  <div class="row" style="gap:8px">
    <div style="flex:1.5">${formRow("中文名称", `<input id="sf_nameCn" class="ipt" value="${_escape(src.nameCn || "")}" />`, true)}</div>
    <div style="flex:1">${formRow("英文名称", `<input id="sf_nameEn" class="ipt" value="${_escape(src.nameEn || "")}" />`)}</div>
  </div>
  <div class="row" style="gap:8px">
    <div style="flex:1">${formRow("标准级别", select(window.getStdDict("levels"), src.level || "国标", "width:100%"), true)}</div>
    <div style="flex:1">${formRow("标准性质", select(window.getStdDict("natures"), src.nature || "推荐", "width:100%"), true)}</div>
    <div style="flex:1">${formRow("所属领域", select(["", ...window.getStdDict("domains")], src.domain || "", "width:100%"), true)}</div>
    <div style="flex:1">${formRow("归口组织", select(["", ...window.getStdDict("orgs")], src.org || "", "width:100%"), true)}</div>
  </div>
  <div class="row" style="gap:8px">
    <div style="flex:1">${formRow("起草单位", `<input id="sf_drafter" class="ipt" value="${_escape(src.drafter || "")}" />`, true)}</div>
    <div style="flex:1">${formRow("起草人员", `<input id="sf_drafterPeople" class="ipt" value="${_escape(src.drafterPeople || "")}" />`)}</div>
  </div>
  <div class="row" style="gap:8px">
    <div style="flex:1">${formRow("参编单位", `<input id="sf_coDrafter" class="ipt" value="${_escape(src.coDrafter || "")}" />`)}</div>
    <div style="flex:1">${formRow("参编人员", `<input id="sf_coDrafterPeople" class="ipt" value="${_escape(src.coDrafterPeople || "")}" />`)}</div>
    <div style="flex:1">${formRow("发布机构", `<input id="sf_publisher" class="ipt" value="${_escape(src.publisher || "")}" />`)}</div>
  </div>
  <div class="row" style="gap:8px">
    <div style="flex:1">${formRow("版本号", `<input id="sf_version" class="ipt" value="${src.version || (year + "版")}" />`, true)}</div>
    <div style="flex:1">${formRow("状态", select(statusOpts, src.status || "current", "width:100%"), true)}</div>
  </div>
  ${formRow("标准正文", `<textarea id="sf_body" class="ipt" rows="8" placeholder="粘贴或输入标准正文摘要/章节内容，支持关键词全文检索">${_escape(src.body || "")}</textarea>`)}
  ${formRow("附件", `<input id="sf_attachName" class="ipt" value="${(src.attachments && src.attachments[0] && src.attachments[0].name) || (src.stdNo || "") + ".pdf"}" />
    <div class="small muted" style="margin-top:4px">原型演示，不真实上传文件</div>`)}
  `;
}

function __readStdForm() {
  const getV = (id) => document.getElementById(id)?.value || "";
  const selects = document.querySelectorAll("#modal select");
  const getSel = (idx) => selects[idx]?.value || "";
  return {
    stdNo: getV("sf_stdNo"), pubDate: getV("sf_pubDate"), implDate: getV("sf_implDate"),
    nameCn: getV("sf_nameCn"), nameEn: getV("sf_nameEn"),
    level: getSel(0), nature: getSel(1), domain: getSel(2), org: getSel(3),
    drafter: getV("sf_drafter"), drafterPeople: getV("sf_drafterPeople"),
    coDrafter: getV("sf_coDrafter"), coDrafterPeople: getV("sf_coDrafterPeople"),
    publisher: getV("sf_publisher"),
    version: getV("sf_version"), status: getSel(4),
    body: getV("sf_body"),
    attachments: [{ type: "pdf", name: getV("sf_attachName"), size: "10MB" }],
  };
}

/** 标准表单必填校验：返回缺失字段的中文名数组（空数组 = 通过） */
function __validateStdForm(d) {
  const required = [
    ["标准编号", d.stdNo], ["中文名称", d.nameCn],
    ["发布日期", d.pubDate], ["实施日期", d.implDate],
    ["所属领域", d.domain], ["归口组织", d.org],
    ["起草单位", d.drafter], ["版本号", d.version], ["状态", d.status],
  ];
  return required.filter(([, v]) => !String(v == null ? "" : v).trim()).map(([label]) => label);
}

/** 必填校验未通过时 toast 提示（缺失 1 个字段时用「请填写X」，多个时列清单） */
function __warnStdRequired(missing) {
  if (missing.length === 0) return;
  toast(missing.length === 1 ? `请填写${missing[0]}` : `请完善必填项：${missing.join("、")}`);
}

function submitAddStd() {
  const d = __readStdForm();
  const missing = __validateStdForm(d);
  if (missing.length) { __warnStdRequired(missing); return; }
  const r = window.addStandard(d);
  if (!r) { toast("保存失败"); return; }
  toast("已新增：" + r.stdNo); closeModal(); replaceView();
}

function submitEditStd(id) {
  const d = __readStdForm();
  const missing = __validateStdForm(d);
  if (missing.length) { __warnStdRequired(missing); return; }
  const r = window.updateStandard(id, d);
  if (!r) { toast("保存失败"); return; }
  toast("已保存：" + r.stdNo); closeModal(); replaceView();
}

function submitUpgradeStd(id) {
  const d = __readStdForm();
  const missing = __validateStdForm(d);
  if (missing.length) { __warnStdRequired(missing); return; }
  const r = window.upgradeStandard(id, d);
  if (!r) { toast("升级失败"); return; }
  toast("新版本已入库：" + r.stdNo + "；原版本自动标记为已被代替"); closeModal(); replaceView();
}

function confirmAbolishStd(id) {
  const s = window.findStandard(id); if (!s) return;
  openModal(modalContent("确认废止标准",
    `<p>确认废止 <b>${_escape(s.stdNo)}</b> <b>${_escape(s.nameCn)}</b>？</p>
     <p class="small muted">废止后状态变为「已作废」，保留历史数据供查阅，检索时默认不展示。</p>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认废止", "danger", `doAbolishStd('${id}')`)}`));
}

function doAbolishStd(id) { window.abolishStandard(id); closeModal(); toast("已废止"); replaceView(); }

function confirmDeleteStd(id) {
  const s = window.findStandard(id); if (!s) return;
  openModal(modalContent("确认删除标准",
    `<p>确认删除 <b>${_escape(s.stdNo)}</b> <b>${_escape(s.nameCn)}</b>？</p>
     <p class="small muted">此操作不可恢复。</p>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("确认删除", "danger", `doDeleteStd('${id}')`)}`));
}

function doDeleteStd(id) { window.deleteStandard(id); closeModal(); toast("已删除"); replaceView(); }

/* ---------- 字段字典维护弹窗 ---------- */
function openAddDict(key) {
  const label = key === "domains" ? "所属领域" : "标准归口组织";
  openModal(modalContent(`+ 新增${label}`,
    formRow(label + "名称", `<input id="dict_val" class="ipt" placeholder="如：超声波流量计" />`, true),
    `${btn("取消", "gray", "closeModal()")} ${btn("保存", "", `doAddDict('${key}')`)}`));
}

function doAddDict(key) {
  const v = (document.getElementById("dict_val")?.value || "").trim();
  if (!v) { toast("请填写名称"); return; }
  if (window.addStdDictItem(key, v)) { closeModal(); toast("已添加"); replaceView(); }
  else { toast("已存在相同项"); }
}

function confirmDelDict(key) {
  const arr = window.getStdDict(key);
  const label = key === "domains" ? "所属领域" : "标准归口组织";
  if (arr.length === 0) { toast("暂无字典项"); return; }
  openModal(modalContent(`删除${label}字典项`,
    `<p>选择要删除的项：</p>
     <div id="dict_del_list">${arr.map((d, i) => `<label style="display:block;margin:4px 0"><input type="checkbox" data-i="${i}" data-v="${_escape(d)}" /> ${_escape(d)}</label>`).join("")}</div>`,
    `${btn("取消", "gray", "closeModal()")} ${btn("批量删除", "danger", `doDelDict('${key}')`)}`));
}

function doDelDict(key) {
  const cbs = document.querySelectorAll("#dict_del_list input[type=checkbox]:checked");
  if (cbs.length === 0) { toast("请选择至少一项"); return; }
  cbs.forEach((cb) => window.removeStdDictItem(key, cb.dataset.v));
  closeModal(); toast(`已删除 ${cbs.length} 项`); replaceView();
}


/* ---------- 标准库 VIEWS 填充 ---------- */
VIEWS.stdHome = renderStdHome;
VIEWS.stdMaint = renderStdMaint;

/* ---------- 标准库 window 挂载 ---------- */
window.doStdSearch = doStdSearch;
window.doStdReset = doStdReset;
window.openStdDetail = openStdDetail;
window.downloadStd = downloadStd;
window.openAddStd = openAddStd;
window.openEditStd = openEditStd;
window.openUpgradeStd = openUpgradeStd;
window.submitAddStd = submitAddStd;
window.submitEditStd = submitEditStd;
window.submitUpgradeStd = submitUpgradeStd;
window.confirmAbolishStd = confirmAbolishStd;
window.doAbolishStd = doAbolishStd;
window.confirmDeleteStd = confirmDeleteStd;
window.doDeleteStd = doDeleteStd;
window.openAddDict = openAddDict;
window.doAddDict = doAddDict;
window.confirmDelDict = confirmDelDict;
window.doDelDict = doDelDict;
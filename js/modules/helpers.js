/* ========== 模板工具函数 ========== */

/**
 * 页面标题 + 描述
 * @param {string} title - 页面标题
 * @param {string} desc - 页面描述（可选）
 */
function pageHeader(title, desc = "", actions = "") {
  const titleBlock = `<div class="page-title">${title}</div>${desc ? `<div class="page-desc">${desc}</div>` : ""}`;
  if (actions) {
    return `<div class="page-header-row"><div class="page-header-info">${titleBlock}</div><div class="page-header-actions">${actions}</div></div>`;
  }
  return titleBlock;
}

/**
 * 工具栏（左右分区）
 * @param {string} left - 左侧内容
 * @param {string} right - 右侧内容（按钮等操作区）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function toolbar(left = "", right = "", extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="toolbar"${styleAttr}><div>${left}</div><div>${right}</div></div>`;
}

/**
 * 统计面板（Board）
 * @param {Array<{v: string, k: string}>} stats - 统计项数组，每项含数值(v)和标签(k)
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function statBoard(stats, extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="board"${styleAttr}>${stats.map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="k">${s.k}</div></div>`).join("")}</div>`;
}

/**
 * 标签（Tag）
 * @param {string} text - 标签文本
 * @param {string} cls - 样式类（如 "ok", "g", "warn", "danger"）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function tag(text, cls = "", extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return cls ? `<span class="tag ${cls}"${styleAttr}>${text}</span>` : `<span${styleAttr}>${text}</span>`;
}

/**
 * 药丸标签（Pill）
 * @param {string} text - 标签文本
 * @param {string} cls - 样式类（如 "p1", "p2", "p3"）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function pill(text, cls = "", extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return cls ? `<span class="pill ${cls}"${styleAttr}>${text}</span>` : `<span${styleAttr}>${text}</span>`;
}

/**
 * 按钮
 * @param {string} text - 按钮文字
 * @param {string} cls - 附加样式类（如 "ghost", "danger", "gray", "sm"）
 * @param {string} onClick - onclick 内容（可选）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function btn(text, cls = "", onClick = "", extraStyle = "") {
  const clickAttr = onClick ? ` onclick="${onClick}"` : "";
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<button class="btn ${cls}"${clickAttr}${styleAttr}>${text}</button>`;
}

/**
 * 表格（含表头和行数据）
 * @param {string[]} headers - 表头数组
 * @param {Array} rows - 行数据数组
 * @param {Function} rowFn - 将行数据映射为 <td>...</td> 字符串的函数
 * @param {string} extraStyle - 额外内联样式（可选）
 * @param {number|string} lastColWidth - 最后一列（操作列）宽度，默认 220px
 */
function table(headers, rows, rowFn, extraStyle = "", lastColWidth = 225) {
  const thead = headers.map((h) => `<th>${h}</th>`).join("");
  const tbody = rows.map((row, i) => `<tr>${rowFn(row, i)}</tr>`).join("");
  const widthVal = typeof lastColWidth === "number" ? `${lastColWidth}px` : lastColWidth;
  const tableStyle = [`--last-col-width:${widthVal}`, extraStyle].filter(Boolean).join(";");
  return `<table style="${tableStyle}"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

/**
 * Zone 区块（含可选标题和点击事件）
 * @param {string} content - 区块内容
 * @param {string} title - 标题（可选）
 * @param {string} extraCls - 额外样式类（可选）
 * @param {string} onClick - onclick 内容（可选）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function zone(content, title = "", extraCls = "", onClick = "", extraStyle = "") {
  const titleHtml = title ? `<h3>${title}</h3>` : "";
  const clickAttr = onClick ? ` onclick="${onClick}"` : "";
  // 合并 onClick 产生的 cursor:pointer 与 extraStyle
  const mergedStyle = [onClick ? "cursor:pointer" : "", extraStyle].filter(Boolean).join(";");
  const styleAttr = mergedStyle ? ` style="${mergedStyle}"` : "";
  return `<div class="zone ${extraCls}"${clickAttr}${styleAttr}>${titleHtml}${content}</div>`;
}

/**
 * Card 卡片
 * @param {string} content - 卡片内容
 * @param {string} extraCls - 额外样式类（可选）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function card(content, extraCls = "", extraStyle = "") {
  const cls = extraCls ? `card ${extraCls}` : "card";
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="${cls}"${styleAttr}>${content}</div>`;
}

/**
 * 过滤器组
 * @param {Array<{label: string, html: string}>} filters - 过滤项数组，每项含标签和HTML内容
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function filterGroup(filters, extraStyle = "", extraClass = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  const classAttr = extraClass ? ` class="filters ${extraClass}"` : ` class="filters"`;
  return `<div${classAttr}${styleAttr}>${filters.map((f) => `<div class="f"><label>${f.label}</label>${f.html}</div>`).join("")}</div>`;
}

/**
 * 锁定提示条（Lock Note）
 * @param {string} text - 提示文字
 * @param {string} extraCls - 额外样式类（可选）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function lockNote(text, extraCls = "", extraStyle = "") {
  const baseCls = extraCls ? `lock-note ${extraCls}` : "lock-note";
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="${baseCls}"${styleAttr}>${text}</div>`;
}

/**
 * 步骤条
 * @param {Array<{label: string, status: string}>} steps - 步骤数组
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function step(steps, extraStyle = "") {
  const html = steps.map((s) => `<div class="s ${s.status}">${s.label}</div>`).join("");
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="step"${styleAttr}>${html}</div>`;
}

/**
 * 元数据行（key-value 对）
 * @param {string} key - 字段名
 * @param {string} value - 字段值（HTML字符串）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function metaRow(key, value, extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="meta-row"${styleAttr}><span class="k">${key}</span><span class="vv">${value}</span></div>`;
}

/**
 * 子系统网格项
 * @param {string} icon - 图标
 * @param {string} title - 标题
 * @param {string} desc - 描述
 * @param {string} onClick - onclick 内容
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function subsysItem(icon, title, desc, onClick, extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="subsys" onclick="${onClick}"${styleAttr}><div class="em">${icon}</div><div><div class="t">${title}</div><div class="d">${desc}</div></div></div>`;
}

/**
 * 弹窗表单行（label + control）
 * @param {string} label - 字段标签文本
 * @param {string} control - 输入控件 HTML
 * @param {boolean} required - 是否必填（显示红色 *）
 * @param {string} hint - 输入提示（可选，显示在控件下方）
 */
function formRow(label, control, required = false, hint = "") {
  const reqCls = required ? " req" : "";
  const hintHtml = hint ? `<div class="hint">${hint}</div>` : "";
  return `<div class="form-row"><label class="form-label${reqCls}">${label}</label><div class="form-control">${control}${hintHtml}</div></div>`;
}

/**
 * 模态弹窗内容包装（自动生成带关闭按钮的标题栏 + 正文 + 底部按钮区）
 * @param {string} title - 弹窗标题
 * @param {string} body - 弹窗正文（建议用 formRow() 组装表单）
 * @param {string} foot - 底部按钮区（可选）
 */
function modalContent(title, body, foot = "") {
  const header = `<div class="modal-header"><h3>${title}</h3><button type="button" class="modal-close" onclick="closeModal()" title="关闭">✕</button></div>`;
  const bodyHtml = `<div class="modal-body">${body}</div>`;
  const footHtml = foot ? `<div class="modal-footer">${foot}</div>` : "";
  return `${header}${bodyHtml}${footHtml}`;
}

/**
 * 空状态占位
 * @param {string} text - 提示文字
 * @param {string} extraHtml - 额外 HTML 内容（如按钮）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function emptyState(text, extraHtml = "", extraStyle = "") {
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<div class="empty"${styleAttr}>${text}${extraHtml ? `<br><br>${extraHtml}` : ""}</div>`;
}

/**
 * 下拉选择框
 * @param {Array<string>} options - 选项列表
 * @param {string} selected - 当前选中值（可选）
 * @param {string} extraStyle - 额外内联样式（可选）
 */
function select(options, selected = "", extraStyle = "") {
  const opts = options.map((o) => {
    const val = typeof o === "object" && o !== null ? (o.value ?? o.label ?? "") : o;
    const label = typeof o === "object" && o !== null ? (o.label ?? o.value ?? "") : o;
    const sel = String(val) === String(selected) ? " selected" : "";
    return `<option value="${val}"${sel}>${label}</option>`;
  }).join("");
  const styleAttr = extraStyle ? ` style="${extraStyle}"` : "";
  return `<select${styleAttr}>${opts}</select>`;
}
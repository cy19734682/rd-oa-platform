/* ========== 通知公告 · config-notices.js ========== */
/* 包含：通知 / 公告 / 制度 的种子数据与全量 CRUD */
/* 依赖基座 config-base.js 中的 _loadArr / _save 辅助函数 */
/* 数据由 views-sys.js 的「通知公告管理」维护，views.js 工作台面板消费 */

/* ---------- 通知公告 localStorage Key ---------- */
const OA_SYS_NOTICES = "oa_sys_notices";
/* 已读标记按账号隔离：oa_notice_read::<account> */
const NOTICE_READ_PREFIX = "oa_notice_read::";

/* ---------- 通知公告默认种子数据 ---------- */
const DEFAULT_NOTICES = [
  {
    id: "ntc_001",
    title: "GB/T 6968-2026《膜式燃气表》已上线，请相关人员关注",
    type: "notice",
    content: "GB/T 6968-2026《膜式燃气表》已于 2026-03-01 正式实施，替代 GB/T 6968-2019。请研发、测试、工艺等相关人员及时在「研发公共 - 标准库」中查阅最新版本，并按新标准更新相关设计与测试用例。",
    publisher: "系统管理员",
    top: true,
    status: "published",
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: "ntc_002",
    title: "CJ/T 112-2016 即将废止，替代版本正在修订中",
    type: "notice",
    content: "CJ/T 112-2016《膜式燃气表》预计将于近期废止，替代版本正在修订报批中。请各项目组评估影响范围，提前做好技术储备与标准切换准备。",
    publisher: "标准管理员",
    top: false,
    status: "published",
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "ntc_003",
    title: "2026-02 月度绩效考核已进入打分阶段，请按期完成",
    type: "announce",
    content: "2026 年 2 月月度绩效考核表已生成并进入打分流程：请项目经理与直接主管在 5 个工作日内完成打分，部门领导于每周五前完成归档。逾期未打的考核表将由系统提醒并通报。",
    publisher: "系统管理员",
    top: false,
    status: "published",
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "ntc_004",
    title: "平台定于本周六 20:00-24:00 进行版本升级维护",
    type: "announce",
    content: "为提升平台性能与稳定性，平台定于本周六 20:00 至 24:00 进行版本升级维护，期间暂停访问。请提前保存工作内容，由此带来不便敬请谅解。",
    publisher: "系统管理员",
    top: false,
    status: "published",
    createdAt: Date.now() - 86400000 * 7,
  },
];

/* ---------- 通知公告类型字典 ---------- */
const NOTICE_TYPES = {
  notice: "通知",
  announce: "公告",
  policy: "制度",
};

/* ---------- 通知公告全局状态 ---------- */
let NOTICES = null;

/* ---------- 通知公告加载 / 保存 ---------- */
function loadNotices() {
  try {
    const raw = localStorage.getItem(OA_SYS_NOTICES);
    if (raw) {
      const v = JSON.parse(raw);
      NOTICES = Array.isArray(v) ? v : DEFAULT_NOTICES.map((x) => ({ ...x }));
    } else {
      NOTICES = DEFAULT_NOTICES.map((x) => ({ ...x }));
    }
  } catch (e) {
    NOTICES = DEFAULT_NOTICES.map((x) => ({ ...x }));
  }
  _save(OA_SYS_NOTICES, NOTICES);
  // 刷新 window 引用：let 声明的全局词法绑定不会自动同步到 window 属性，
  // 必须显式赋值，避免 window.NOTICES 停留在文件求值时的 null（参考 EC_CASES 的历史问题）
  window.NOTICES = NOTICES;
}
function saveNotices() {
  _save(OA_SYS_NOTICES, NOTICES);
  window.NOTICES = NOTICES;
}

/* ---------- 通知公告 CRUD ---------- */
function findNotice(id) {
  return (NOTICES || []).find((n) => n.id === id) || null;
}
function addNotice(data) {
  const n = {
    id: "ntc_" + Date.now(),
    title: data.title || "未命名公告",
    type: data.type || "notice",
    content: data.content || "",
    publisher: window.CURR_ACCT_NAME || "系统管理员",
    top: !!data.top,
    status: data.status || "published",
    createdAt: Date.now(),
  };
  NOTICES.unshift(n);
  saveNotices();
  return n;
}
function updateNotice(id, data) {
  const n = findNotice(id);
  if (!n) return false;
  n.title = data.title != null ? data.title : n.title;
  n.type = data.type != null ? data.type : n.type;
  n.content = data.content != null ? data.content : n.content;
  n.top = data.top != null ? !!data.top : n.top;
  n.status = data.status != null ? data.status : n.status;
  saveNotices();
  return true;
}
function delNotice(id) {
  const i = (NOTICES || []).findIndex((n) => n.id === id);
  if (i < 0) return false;
  NOTICES.splice(i, 1);
  saveNotices();
  return true;
}
/* ---------- 已读状态（按账号隔离） ---------- */
function _noticeReadKey() {
  const acct = window.CURR_ACCT || "guest";
  return NOTICE_READ_PREFIX + acct;
}
function getReadNoticeIds() {
  try {
    const raw = localStorage.getItem(_noticeReadKey());
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}
function markNoticeRead(id) {
  const ids = getReadNoticeIds();
  if (ids.indexOf(id) >= 0) return;
  ids.push(id);
  try { localStorage.setItem(_noticeReadKey(), JSON.stringify(ids)); } catch (e) {}
}
function countUnreadNotices() {
  const ids = getReadNoticeIds();
  return (NOTICES || []).filter((n) => n.status === "published" && ids.indexOf(n.id) < 0).length;
}

/* ---------- 已发布公告（置顶优先，其次按时间倒序） ---------- */
function getPublishedNotices() {
  return (NOTICES || [])
    .filter((n) => n.status === "published")
    .slice()
    .sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || b.createdAt - a.createdAt);
}

/* ---------- 统一初始化入口（app.js 启动时调用） ---------- */
function loadAllNotices() {
  loadNotices();
}

/* ---------- 挂载到 window ---------- */
window.NOTICES = NOTICES;
window.loadAllNotices = loadAllNotices;
window.saveNotices = saveNotices;
window.findNotice = findNotice;
window.addNotice = addNotice;
window.updateNotice = updateNotice;
window.delNotice = delNotice;
window.getReadNoticeIds = getReadNoticeIds;
window.markNoticeRead = markNoticeRead;
window.countUnreadNotices = countUnreadNotices;
window.getPublishedNotices = getPublishedNotices;
window.NOTICE_TYPES = NOTICE_TYPES;

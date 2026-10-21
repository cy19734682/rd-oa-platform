/* ========== 研发OA综合平台 · 演示数据（config-mock.js） ========== */
/* 拆分自原 config.js。集中管理原型演示用 Mock 数据：
 * 标准库最近上传 / 标准检索结果 / 案例审核列表 / 系统日志（首页与审计页读取）。 */


/* ---------- Mock 数据（集中管理，便于维护） ---------- */
const MOCK = {
  // 标准库最近上传
  stdRecent: [
    {
      no: "GB/T 6968-2026",
      name: "膜式燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-03-01",
    },
    {
      no: "GB/T 39841-2026",
      name: "超声波燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-04-01",
    }],
  // 标准检索结果
  stdSearchList: [
    {
      no: "GB/T 6968-2026",
      name: "膜式燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-03-01",
      btn: "预览/下载",
      btnCls: "",
    },
    {
      no: "GB/T 6968-2019",
      name: "膜式燃气表（已废止·2026版代替）",
      level: "国标",
      status: "已作废",
      statusCls: "danger",
      date: "2019-06-01",
      btn: "查看旧版",
      btnCls: "ghost",
    },
    {
      no: "GB/T 39841-2026",
      name: "超声波燃气表",
      level: "国标",
      status: "现行",
      statusCls: "ok",
      date: "2026-04-01",
      btn: "预览/下载",
      btnCls: "",
    }],
  // 案例审核列表
  ecCases: [
    {
      t: "低功耗唤醒异常导致漏记",
      who: "王工 / 硬件",
      c: "硬件",
      st: "待初审",
      cls: "p2",
    },
    {
      t: "通讯模块死机分析",
      who: "赵工 / 软件",
      c: "软件",
      st: "部门审核中",
      cls: "p2",
    },
    {
      t: "燃气表外壳应力开裂",
      who: "陈工 / 结构",
      c: "结构",
      st: "副总工审批中",
      cls: "p2",
    },
    {
      t: "密封性试验夹具优化",
      who: "李工 / 测试",
      c: "测试",
      st: "已退回",
      cls: "p3",
    }],
  sysLogs: [
    { time: "2026-10-04 09:12:35", who: "admin", type: "登录", typeCls: "ok", action: "用户登录系统", target: "IP 192.168.1.100" },
    { time: "2026-10-04 09:08:17", who: "赵主任", type: "业务", typeCls: "", action: "审核年终绩效考核表", target: "刘工（8006）· 2026 年度" },
    { time: "2026-10-04 08:55:42", who: "周主管", type: "业务", typeCls: "", action: "提交主管打分", target: "张工（8001）· 2026-09 月度" },
    { time: "2026-10-03 17:30:11", who: "刘工", type: "业务", typeCls: "", action: "导入月度计划任务", target: "2026-10 月度计划 · 12 条" },
    { time: "2026-10-03 15:22:08", who: "admin", type: "安全", typeCls: "warn", action: "修改用户密码", target: "账号 8005（周主管）" },
    { time: "2026-10-03 14:05:33", who: "陈工", type: "业务", typeCls: "", action: "上传标准文件", target: "GB/T 39841-2026.pdf" },
    { time: "2026-10-02 16:48:20", who: "赵主任", type: "业务", typeCls: "", action: "配置互评人", target: "刘工 → 互评人：周主管、陈工" },
    { time: "2026-10-02 10:15:59", who: "admin", type: "系统", typeCls: "info", action: "更新考核表单模板", target: "pa_tpl_yearly_peer_v1 · v1→v2" },
    { time: "2026-10-01 20:33:41", who: "李工", type: "登录", typeCls: "ok", action: "用户登录系统", target: "IP 10.0.0.55" },
    { time: "2026-09-30 11:27:16", who: "系统", type: "系统", typeCls: "info", action: "自动归档月度考核结果", target: "2026-09 · 7 人已归档" },
  ],
};

/* ========== 案例库模块数据层 · config-ec.js ========== */
/* 参考 config-std.js 模式：种子数据、CRUD、搜索、审核流程、统计、日志 */

const OA_EC_CASES = "oa_ec_cases";
const OA_EC_LOGS = "oa_ec_logs";

/* ---------- 种子数据：10 条完整案例 ---------- */
const DEFAULT_EC_CASES = [
  {
    id: "ec_001",
    title: "低功耗唤醒异常导致燃气表漏记",
    keywords: ["计量漂移", "超声波", "温压补偿", "低功耗"],
    productName: "超声波燃气表 USM-200",
    shareName: "张工", shareEmpId: "8001", shareDept: "硬件一组", shareManager: "李工",
    source: "生产过程", category: "硬件",
    problemDesc: "批量生产的 USM-200 超声波燃气表在低功耗模式下唤醒异常，导致每日气量计量漏记约 3%~5%，影响用户结算和公司营收。",
    analysis: "① 统计漏记时段主要集中在夜间；② 用示波器采集唤醒波形，发现部分表计的唤醒脉冲幅度偏低；③ 对比良品与不良品的 MCU 引脚电平记录，排除固件问题；④ 检查外围电路的唤醒电容参数。",
    rootCause: "唤醒电路的 RC 时间常数选型错误。原设计用了 10μF 电容，但该批次实际容值偏差达 +30%，导致充电时间过长，MCU 在规定窗口内未完成采样即进入休眠，错过计量窗口。",
    solution: "① 将唤醒电容从 10μF 改为 4.7μF（余量足够）；② 固件端增加唤醒超时重试机制，连续 3 次唤醒失败触发告警；③ 生产测试增加唤醒功能自检项。",
    summary: "涉及外围元件参数选型时必须考虑批量公差范围，关键参数需留足 50% 以上余量。固件应具备容错重试机制，不能依赖硬件 100% 可靠。生产测试要覆盖关键功能路径，不能只测静态电流。",
    attachments: [
      { name: "低功耗唤醒异常分析报告.docx", type: "docx", size: "2.1MB" },
      { name: "USM-200 唤醒电路原理图.pdf", type: "pdf", size: "0.8MB" },
    ],
    submitter: "8001 张工", submittedAt: Date.now() - 86400000 * 60,
    reviewStatus: "finalApproved",
    firstReview: { reviewedBy: "李工 8002", reviewedAt: Date.now() - 86400000 * 55, result: "通过", comment: "分析到位，同意入库" },
    deptReview: { reviewedBy: "王总 8101", reviewedAt: Date.now() - 86400000 * 52, result: "通过", comment: "典型硬件选型失误，经验很有价值" },
    finalReview: { reviewedBy: "陈副总工 8201", reviewedAt: Date.now() - 86400000 * 50, result: "通过", comment: "已入库，建议在公司内部分享" },
    quality: "优秀", promotionValue: "大",
    viewCount: 328, likeCount: 45, likedBy: ["8002", "8003", "8004", "8005", "8010", "8101"],
    comments: [
      { id: "cmt_001", userId: "8002", userName: "李工", time: Date.now() - 86400000 * 30, content: "这个 RC 选型的问题我也碰到过，确实容易忽略批量公差。" },
      { id: "cmt_002", userId: "8010", userName: "孙工", time: Date.now() - 86400000 * 15, content: "唤醒超时重试的思路很棒，已经用到自己项目里了。" },
    ],
    createdAt: Date.now() - 86400000 * 60, updatedAt: Date.now() - 86400000 * 50,
  },
  {
    id: "ec_002",
    title: "通讯模块死机导致燃气表离线",
    keywords: ["LoRa", "看门狗", "固件", "重启"],
    productName: "物联网燃气表 IGM-300",
    shareName: "赵工", shareEmpId: "8003", shareDept: "软件部", shareManager: "王总",
    source: "售后", category: "软件",
    problemDesc: "IGM-300 物联网燃气表在现场运行 2~3 个月后，LoRa 通讯模块偶发死机，导致表计离线无法远程抄表，影响集中式抄表系统的运行。",
    analysis: "① 售后反馈离线后需断电重启才能恢复；② 从设备日志看，死机前有大量通讯失败重试；③ 用 JLink 抓取死机现场，发现 MCU 卡在 UART 中断里；④ 检查 LoRa 模块的数据手册，发现 UART 溢出时没有处理中断。",
    rootCause: "LoRa 模块的 UART 接收中断处理函数中，没有处理溢出标志位（Overrun Error）。当短时间内收到大量报文碎片时，UART 数据寄存器溢出，但中断只清了 RXNE 标志，导致中断反复触发无法返回主循环，最终看门狗超时。",
    solution: "在 UART 中断处理函数中增加对 ORE 标志的处理，清标志并丢弃当前数据；在主循环中增加看门狗喂狗逻辑，每 100ms 喂一次；固件升级后死机问题消失。",
    summary: "嵌入式中断处理函数必须覆盖所有可能的错误标志位，不能只处理正常数据接收。看门狗的喂狗逻辑要放在主循环，不能依赖中断。现场问题的根因分析要结合设备日志和硬件调试工具。",
    attachments: [{ name: "IGM-300 LoRa 模块死机分析.pdf", type: "pdf", size: "3.2MB" }],
    submitter: "8003 赵工", submittedAt: Date.now() - 86400000 * 45,
    reviewStatus: "finalApproved",
    firstReview: { reviewedBy: "王总 8101", reviewedAt: Date.now() - 86400000 * 42, result: "通过", comment: "中断溢出的坑踩过，分享很有必要" },
    deptReview: { reviewedBy: "王总 8101", reviewedAt: Date.now() - 86400000 * 40, result: "通过", comment: "" },
    finalReview: { reviewedBy: "陈副总工 8201", reviewedAt: Date.now() - 86400000 * 38, result: "通过", comment: "已入库" },
    quality: "良好", promotionValue: "大",
    viewCount: 256, likeCount: 32, likedBy: ["8001", "8002", "8003", "8005", "8012"],
    comments: [{ id: "cmt_003", userId: "8005", userName: "周工", time: Date.now() - 86400000 * 20, content: "我们之前也遇到类似的中断卡死问题，确实要把所有错误标志都清掉。" }],
    createdAt: Date.now() - 86400000 * 45, updatedAt: Date.now() - 86400000 * 38,
  },
  {
    id: "ec_003",
    title: "燃气表外壳应力开裂导致漏气",
    keywords: ["注塑", "应力", "开裂", "漏气", "安全"],
    productName: "膜式燃气表 BM-100",
    shareName: "陈工", shareEmpId: "8004", shareDept: "结构部", shareManager: "刘工",
    source: "生产过程", category: "结构",
    problemDesc: "BM-100 膜式燃气表在用户家中使用 1 年左右后，外壳出现微小裂纹，导致燃气泄漏，存在安全隐患。生产累计生产 5000 台，故障率约 0.3%。",
    analysis: "① 对开裂外壳进行 SEM 扫描，发现裂纹源于注塑熔接线处；② 用有限元仿真分析应力分布，熔接线处应力集中系数高达 2.5；③ 检查注塑工艺参数，发现保压时间不足 3 秒（建议 ≥ 5 秒）；④ 对比不同批次外壳的应力测试数据。",
    rootCause: "① 熔接线处应力集中（结构设计：两板卡扣位置形成明显熔接线）；② 注塑工艺：保压时间不足导致熔接线处熔合不良；③ 材料：ABS 塑料耐应力开裂性在低温下较差，而产品覆盖东北寒冷地区。",
    solution: "① 结构设计：将外壳卡扣位置移到非应力集中区域；② 注塑工艺：保压时间增加到 6 秒，增加保压压力 10%；③ 材料：改用抗应力开裂等级更高的 ABS-GF（玻纤增强）。",
    summary: "结构设计要避免应力集中区域出现在熔接线位置，注塑工艺参数必须结合材料特性和使用环境验证。安全相关的产品需要做低温应力开裂测试。",
    attachments: [
      { name: "BM-100 外壳开裂分析报告.docx", type: "docx", size: "1.8MB" },
      { name: "结构改进图纸.pdf", type: "pdf", size: "0.5MB" },
    ],
    submitter: "8004 陈工", submittedAt: Date.now() - 86400000 * 30,
    reviewStatus: "finalApproved",
    firstReview: { reviewedBy: "刘工 8006", reviewedAt: Date.now() - 86400000 * 28, result: "通过", comment: "应力分析很到位" },
    deptReview: { reviewedBy: "王总 8101", reviewedAt: Date.now() - 86400000 * 27, result: "通过", comment: "安全相关的经验，价值大" },
    finalReview: { reviewedBy: "陈副总工 8201", reviewedAt: Date.now() - 86400000 * 25, result: "通过", comment: "已入库，建议在安全专题会上分享" },
    quality: "优秀", promotionValue: "大",
    viewCount: 198, likeCount: 28, likedBy: ["8004", "8006", "8007", "8011"],
    comments: [],
    createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now() - 86400000 * 25,
  },
  {
    id: "ec_004",
    title: "密封性试验夹具优化提效 50%",
    keywords: ["密封性", "夹具", "效率", "自动化", "测试"],
    productName: "燃气表通用测试平台",
    shareName: "李工", shareEmpId: "8002", shareDept: "硬件一组", shareManager: "王总",
    source: "开发阶段", category: "测试",
    problemDesc: "现有密封性试验夹具单台测试需 15 分钟（含拆装），且夹具易损坏，年维护成本约 2 万元。生产线测试节拍 20 台/小时，已达瓶颈。",
    analysis: "① 拆解原有夹具，发现密封圈设计不合理（O 型圈压缩率 25% 过高）；② 拆装需用螺丝刀固定 6 个螺丝，耗时 3 分钟；③ 密封面加工精度不够（Ra 3.2），导致泄漏率偏高。",
    rootCause: "夹具设计未充分考虑批量生产的节拍需求：螺丝固定效率低、O 型圈选型偏保守、密封面加工精度未达要求。",
    solution: "① O 型圈压缩率调整到 15%~20%，延长使用寿命；② 改用快速插拔卡扣替代螺丝固定（拆装时间从 3 分钟降到 30 秒）；③ 密封面加工精度提升到 Ra 1.6；④ 增加自动保压功能，测试完成自动卸压。",
    summary: "测试夹具设计要以生产节拍为核心指标，快速拆装+合理的密封设计能大幅提效。Ra 3.2→1.6 的加工精度提升成本仅增加 10%，但密封效果显著改善。",
    attachments: [{ name: "密封性夹具优化报告.pdf", type: "pdf", size: "2.4MB" }],
    submitter: "8002 李工", submittedAt: Date.now() - 86400000 * 20,
    reviewStatus: "finalApproved",
    firstReview: { reviewedBy: "王总 8101", reviewedAt: Date.now() - 86400000 * 18, result: "通过", comment: "提效明显，值得推广" },
    deptReview: { reviewedBy: "王总 8101", reviewedAt: Date.now() - 86400000 * 17, result: "通过", comment: "" },
    finalReview: { reviewedBy: "陈副总工 8201", reviewedAt: Date.now() - 86400000 * 15, result: "通过", comment: "已入库" },
    quality: "良好", promotionValue: "中",
    viewCount: 145, likeCount: 22, likedBy: ["8001", "8002", "8003"],
    comments: [{ id: "cmt_004", userId: "8003", userName: "赵工", time: Date.now() - 86400000 * 5, content: "我们部门也在做夹具优化，参考这个思路很有帮助。" }],
    createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now() - 86400000 * 15,
  },
  {
    id: "ec_005",
    title: "MCU 睡眠电流超标导致功耗测试不通过",
    keywords: ["MCU", "睡眠电流", "GPIO", "功耗", "硬件"],
    productName: "超声波燃气表 USM-200",
    shareName: "王工", shareEmpId: "8005", shareDept: "硬件一组", shareManager: "李工",
    source: "开发阶段", category: "硬件",
    problemDesc: "USM-200 超声波燃气表在开发调试阶段，睡眠电流高达 8.5μA，远超产品规格要求的 ≤ 5μA，导致电池寿命不达标。",
    analysis: "① 用电流分析仪抓取睡眠电流波形，发现脉冲式电流消耗；② 逐个断开 MCU 的 GPIO 引脚，发现 PA5 引脚断开后电流降为 4.8μA；③ 检查 PA5 对应的外围电路——超声波换能器驱动电路；④ 驱动电路的 MOSFET 栅极电压在睡眠时未完全下拉。",
    rootCause: "超声波换能器驱动 MOSFET 的栅极下拉电阻（1MΩ）阻值过大，栅极电容放电慢，导致 MOSFET 在睡眠初期部分导通，产生额外电流。另外，MCU 内部上拉电阻（用于 I²C 总线）在睡眠时未禁用，增加了约 1μA 静态电流。",
    solution: "① 栅极下拉电阻从 1MΩ 改为 100kΩ，确保 MOSFET 快速关断；② 固件在进入睡眠前禁用所有未使用的内部上拉/下拉电阻；③ 增加一个 MOSFET 的栅极钳位二极管，确保电压 ≤ 0.1V；修改后睡眠电流稳定在 4.2μA。",
    summary: "低功耗设计中，MOSFET 驱动电路的栅极电阻选型要平衡开关速度和漏电流，不能盲目选大阻值。MCU 内部上拉电阻在睡眠模式下默认启用，需要手动禁用。睡眠电流测试必须用电流分析仪抓波形，不能只测平均电流。",
    attachments: [{ name: "USM-200 睡眠电流优化.pdf", type: "pdf", size: "1.5MB" }],
    submitter: "8005 王工", submittedAt: Date.now() - 86400000 * 12,
    reviewStatus: "firstReviewed",
    firstReview: { reviewedBy: "李工 8002", reviewedAt: Date.now() - 86400000 * 10, result: "通过", comment: "栅极电阻的坑之前也踩过" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    quality: "优秀", promotionValue: "大",
    viewCount: 92, likeCount: 15, likedBy: ["8005", "8006"],
    comments: [],
    createdAt: Date.now() - 86400000 * 12, updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: "ec_006",
    title: "超声波换能器谐振频率漂移导致计量精度下降",
    keywords: ["超声波", "谐振频率", "温漂", "计量精度", "硬件"],
    productName: "超声波燃气表 USM-300",
    shareName: "孙工", shareEmpId: "8010", shareDept: "硬件一组", shareManager: "李工",
    source: "开发阶段", category: "硬件",
    problemDesc: "USM-300 超声波燃气表在高低温循环测试（-40℃ ~ +70℃）后，计量精度从 ±1.5% 下降到 ±4.2%，超出标准要求的 ±2.0%。",
    analysis: "① 高低温循环后超声波传播时间测量值偏差明显增大；② 用网络分析仪测试换能器谐振频率，发现低温下（-40℃）谐振频率从 210kHz 漂移到 205kHz，高温下（+70℃）漂移到 215kHz；③ 驱动电路的 LC 网络是按常温（25℃）210kHz 调谐的，温漂后失谐。",
    rootCause: "换能器的谐振频率温度系数（约 -0.02%/℃）在宽温范围内导致谐振频率漂移 ±2%，而驱动 LC 网络是固定值，无法自动跟踪谐振点，导致发射效率下降、接收信噪比降低，最终影响计量精度。",
    solution: "① 固件端增加自适应频率跟踪：每次测量前先扫描谐振频率，然后调整驱动 PWM 频率到最新谐振点；② 硬件端增加调谐电容阵列，配合固件实现粗调；③ 测试验证：改后高低温循环后精度稳定在 ±1.2%。",
    summary: "宽温环境下工作的射频/超声波电路必须考虑温漂的影响，固定参数的 LC 网络无法适应宽温变化。固件自适应调整是成本最低的解决方案。",
    attachments: [{ name: "USM-300 换能器温漂补偿方案.docx", type: "docx", size: "2.7MB" }],
    submitter: "8010 孙工", submittedAt: Date.now() - 86400000 * 6,
    reviewStatus: "firstReviewed",
    firstReview: { reviewedBy: "李工 8002", reviewedAt: Date.now() - 86400000 * 4, result: "通过", comment: "自适应调谐的思路很好" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    quality: "优秀", promotionValue: "大",
    viewCount: 78, likeCount: 12, likedBy: ["8010"],
    comments: [],
    createdAt: Date.now() - 86400000 * 6, updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: "ec_007",
    title: "Modbus 通讯协议异常导致上位机解析错误",
    keywords: ["Modbus", "CRC", "通讯", "协议", "软件"],
    productName: "膜式燃气表 BM-100（带远程）",
    shareName: "周工", shareEmpId: "8007", shareDept: "软件部", shareManager: "王总",
    source: "售后", category: "软件",
    problemDesc: "部分用户反馈：上位机通过 Modbus-RTU 读取 BM-100 燃气表数据时，解析偶尔出错，显示的气量和实际值偏差很大。",
    analysis: "① 在现场抓取 Modbus 报文，发现出错时 CRC 校验失败；② 对比出错和正常的报文，发现出错时报文有 1~2 个字节错乱；③ 检查固件的 Modbus 接收处理函数，发现 CRC 校验是在所有字节接收完后才进行的，但中断里只做了简单的存储，没有做缓冲区溢出检查；④ 高波特率（9600）下连续接收多条报文时，前一条还没处理完后一条就到了，导致缓冲区被覆盖。",
    rootCause: "Modbus 接收缓冲区只有 128 字节，但高波特率下连续多条报文可能超过这个大小，溢出后覆盖了未处理的 CRC 字节。此外，固件的 Modbus 处理逻辑是在主循环中轮询，没有在中断中做最小化的错误检查。",
    solution: "① 接收缓冲区扩容到 512 字节；② 中断接收时增加缓冲区满检查，满了直接丢包（避免污染已有数据）；③ 在中断里增加最小化 CRC 校验（只校验最新接收的报文），校验失败直接丢弃；④ 增加 Modbus 报文间隔判断（至少 3.5 个字符时间无数据才算一条报文结束）。",
    summary: "工业通讯协议的实现要考虑缓冲区边界和并发接收的场景，不能假设上位机永远按规范间隔发送报文。CRC 校验的时机要前置到中断里，不能等到主循环轮询时才做。",
    attachments: [{ name: "BM-100 Modbus 通讯异常修复.pdf", type: "pdf", size: "1.1MB" }],
    submitter: "8007 周工", submittedAt: Date.now() - 86400000 * 4,
    reviewStatus: "pending",
    firstReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    quality: "", promotionValue: "",
    viewCount: 25, likeCount: 3, likedBy: [],
    comments: [],
    createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: "ec_008",
    title: "PCBA 回流焊工艺优化降低 BGA 虚焊率",
    keywords: ["回流焊", "BGA", "虚焊", "工艺", "生产"],
    productName: "物联网燃气表 IGM-300 主板",
    shareName: "刘工", shareEmpId: "8006", shareDept: "硬件一组", shareManager: "李工",
    source: "生产过程", category: "硬件",
    problemDesc: "IGM-300 主板的 LoRa 模块（BGA 封装，球径 0.3mm）在生产中虚焊率约 3%，每批（2000 块）需返 60 块，返工成本高且影响产能。",
    analysis: "① 用 X-Ray 检测虚焊位置，发现集中在 BGA 四角的焊球；② 对比回流焊温度曲线和焊膏厂商推荐曲线，发现峰值温度偏低（228℃ vs 推荐 240℃）；③ 四角位置散热快，实际峰值温度比中心低 5~8℃；④ 焊膏印刷厚度测试，发现四角印刷厚度偏薄（0.12mm vs 设计值 0.15mm）。",
    rootCause: "回流焊峰值温度不足 + BGA 四角印刷偏薄 + 四角散热快，三重因素导致四角焊球未完全熔化，形成虚焊。",
    solution: "① 回流焊峰值温度提高到 245℃；② 焊膏印刷网版四角加厚（0.18mm），其他位置保持 0.15mm；③ 氮气回流焊（含氧 < 500ppm），改善润湿性；④ 优化回流焊炉的风量分布，四角位置风量降低 20%（减少散热）。优化后虚焊率降到 0.1% 以下。",
    summary: "BGA 封装的焊点可靠性是多个参数共同作用的结果，需要从温度曲线、网版设计、焊接气氛、炉温均匀性四个维度综合优化。小批量试产时的参数摸索是量产良率的关键。",
    attachments: [{ name: "IGM-300 BGA 虚焊优化报告.docx", type: "docx", size: "3.5MB" }],
    submitter: "8006 刘工", submittedAt: Date.now() - 86400000 * 2,
    reviewStatus: "pending",
    firstReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    quality: "", promotionValue: "",
    viewCount: 18, likeCount: 2, likedBy: [],
    comments: [],
    createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "ec_009",
    title: "固件 OTA 升级失败导致燃气表变砖",
    keywords: ["OTA", "固件升级", "安全启动", "回滚", "软件"],
    productName: "物联网燃气表 IGM-300",
    shareName: "钱工", shareEmpId: "8012", shareDept: "软件部", shareManager: "王总",
    source: "售后", category: "软件",
    problemDesc: "远程 OTA 升级过程中约 0.5% 的燃气表升级失败，重启后无法进入正常工作模式（变砖），需要上门处理，单台成本约 200 元。",
    analysis: "① 变砖后用调试器连接，发现固件升级过程中被断电（网络不稳定导致升级耗时过长，恰好碰上市电波动）；② 升级分区写了一半，CRC 校验不通过，启动引导程序（Bootloader）无法跳转；③ 现有 Bootloader 没有双分区回滚机制，升级失败后无法回到上一版本。",
    rootCause: "OTA 升级架构存在单点风险：固件存储只有一个分区，升级时被新固件覆盖。一旦升级过程中断电，固件损坏且无备份，必须上门刷写。",
    solution: "① 改用双分区 OTA 架构：A 分区运行时，B 分区写入新固件；② 写完后 CRC 校验通过才设置启动标志；③ 下一次启动时 Bootloader 根据启动标志判断从哪个分区启动；④ 升级失败自动回滚到旧版本，无需人工干预；⑤ 增加 OTA 过程中的掉电检测，检测到掉电时跳过当前页写入。改后变砖率降到 0%。",
    summary: "嵌入式设备的 OTA 升级必须具备防砖机制，双分区+回滚是业界标准做法。固件升级过程中要考虑网络不稳定、掉电、文件损坏等异常场景，任何一步失败都要能安全回退。",
    attachments: [{ name: "IGM-300 OTA 防砖方案设计.pdf", type: "pdf", size: "4.8MB" }],
    submitter: "8012 钱工", submittedAt: Date.now() - 86400000 * 1,
    reviewStatus: "pending",
    firstReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    quality: "", promotionValue: "",
    viewCount: 12, likeCount: 1, likedBy: [],
    comments: [],
    createdAt: Date.now() - 86400000 * 1, updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: "ec_010",
    title: "燃气表壳体注塑模具热膨胀导致尺寸超差",
    keywords: ["注塑", "模具", "热膨胀", "尺寸精度", "结构"],
    productName: "膜式燃气表 BM-100",
    shareName: "郑工", shareEmpId: "8011", shareDept: "结构部", shareManager: "刘工",
    source: "生产过程", category: "结构",
    problemDesc: "BM-100 燃气表壳体在连续生产 2 小时后，外形尺寸逐渐变大，从 100.02mm 涨到 100.15mm，超出公差 ±0.05mm，导致与底壳配合过紧，无法正常装配。",
    analysis: "① 每 30 分钟测一次尺寸和模具温度，发现尺寸随模具温度上升而增大；② 模具钢（H13 钢）热膨胀系数 1.3×10⁻⁵/℃，模腔温度从 60℃ 升到 90℃ 时，理论膨胀 0.039mm，与实测 0.13mm 有差距；③ 检查模具冷却水道，发现设计不合理：靠近模腔的水道间距 80mm 偏大，冷却不均；④ 模腔表面温度实际达 110℃（比测的模具整体温度高 20℃）。",
    rootCause: "① 冷却水道间距过大，模腔局部温度过热（110℃），导致实际膨胀量比理论值大；② 模具设计时未考虑热膨胀的预留量（直接按常温尺寸加工）；③ 没有实时模腔温度监控，依赖模具整体温度的假设有误差。",
    solution: "① 冷却水道间距从 80mm 缩小到 50mm，增加 2 条靠近模腔的小水道；② 模具模腔加工时预留 0.08mm 的收缩+膨胀余量；③ 增加模腔内温度传感器，实时监控并调节冷却水流量；④ 工艺参数增加模具温度稳定阶段（开机后先空模 30 分钟再正式生产）。改后尺寸稳定在 100.01±0.03mm。",
    summary: "注塑模具设计必须同时考虑材料收缩率和模具钢热膨胀量，两者叠加可能导致尺寸超差。冷却系统的均匀性是尺寸稳定性的关键，不能只看模具整体温度，要监控模腔局部温度。",
    attachments: [{ name: "BM-100 壳体尺寸超差分析.docx", type: "docx", size: "2.0MB" }],
    submitter: "8011 郑工", submittedAt: Date.now() - 86400000 * 1,
    reviewStatus: "pending",
    firstReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    quality: "", promotionValue: "",
    viewCount: 8, likeCount: 0, likedBy: [],
    comments: [],
    createdAt: Date.now() - 86400000 * 1, updatedAt: Date.now() - 86400000 * 1,
  },
];

/* 审核状态映射（供渲染使用） */
const EC_REVIEW_STATUS_MAP = {
  pending:       { label: "待初审",       cls: "p3" },
  firstReviewed: { label: "待部门审核",   cls: "p2" },
  deptReviewed:  { label: "待副总工审批", cls: "p2" },
  finalApproved: { label: "已入库",       cls: "p1" },
  returned:      { label: "已退回",       cls: "p3" },
};

/* ---------- 种子数据：日志 ---------- */
const DEFAULT_EC_LOGS = [
  { id: "log_ec_001", caseId: "ec_001", op: "view",   who: "8002 李工",   time: Date.now() - 86400000 * 30, note: "在线预览" },
  { id: "log_ec_002", caseId: "ec_001", op: "download", who: "8010 孙工", time: Date.now() - 86400000 * 20, note: "下载附件（水印：孙工 2026-09-04）" },
  { id: "log_ec_003", caseId: "ec_001", op: "firstReview", who: "李工 8002", time: Date.now() - 86400000 * 55, note: "初审通过" },
  { id: "log_ec_004", caseId: "ec_003", op: "submit",   who: "8004 陈工",   time: Date.now() - 86400000 * 30, note: "提交案例" },
];

/* ---------- 全局变量 ---------- */
let EC_CASES = null;
let EC_LOGS = null;

/* ---------- 加载 / 保存 ---------- */
function loadEcCases() {
  try {
    const raw = sessionStorage.getItem(OA_EC_CASES);
    if (raw) { EC_CASES = JSON.parse(raw); } else { EC_CASES = JSON.parse(JSON.stringify(DEFAULT_EC_CASES)); }
  } catch (e) { EC_CASES = JSON.parse(JSON.stringify(DEFAULT_EC_CASES)); }
  _save(OA_EC_CASES, EC_CASES);
}
function saveEcCases() { _save(OA_EC_CASES, EC_CASES); }
function loadEcLogs() {
  try {
    const raw = sessionStorage.getItem(OA_EC_LOGS);
    if (raw) { EC_LOGS = JSON.parse(raw); } else { EC_LOGS = JSON.parse(JSON.stringify(DEFAULT_EC_LOGS)); }
  } catch (e) { EC_LOGS = JSON.parse(JSON.stringify(DEFAULT_EC_LOGS)); }
  _save(OA_EC_LOGS, EC_LOGS);
}
function saveEcLogs() { _save(OA_EC_LOGS, EC_LOGS); }

/* ---------- CRUD ---------- */
function findEcCase(id) { return (EC_CASES || []).find((c) => c.id === id); }
function addEcCase(data) {
  if (!EC_CASES) loadEcCases();
  const id = "ec_" + Date.now();
  const now = Date.now();
  const item = Object.assign({
    id,
    keywords: [],
    attachments: [],
    firstReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    deptReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    finalReview: { reviewedBy: "", reviewedAt: 0, result: "", comment: "" },
    reviewStatus: "pending",
    quality: "", promotionValue: "",
    viewCount: 0, likeCount: 0, likedBy: [], comments: [],
    createdAt: now, updatedAt: now,
    submitter: (window.CURR_ACCT_EMP_ID || "0000") + " " + (window.CURR_ACCT_NAME || "匿名"),
    submittedAt: now,
  }, data);
  EC_CASES.push(item);
  saveEcCases();
  logEcOp("submit", id, `提交案例：${item.title}`);
  return item;
}
function updateEcCase(id, patch) {
  const item = findEcCase(id); if (!item) return null;
  Object.assign(item, patch, { updatedAt: Date.now() });
  saveEcCases();
  return item;
}
function deleteEcCase(id) {
  if (!EC_CASES) loadEcCases();
  const caseName = (findEcCase(id) || {}).title;
  EC_CASES = EC_CASES.filter((c) => c.id !== id);
  saveEcCases();
  logEcOp("delete", id, `删除案例：${caseName}`);
}

/* ---------- 查重 ---------- */
/**
 * 查重：标题高度相似（>80% 相同）或附件文件名 + 大小完全相同
 * @returns Array<{case, type, detail, similarity}>
 */
function checkEcDuplicate(title, attachments) {
  const list = EC_CASES || [];
  const results = [];
  const tgtKw = (title || "").toLowerCase();
  // 标题相似度（简单实现：公共子串占比，> 80% 视为高度相似）
  list.forEach((c) => {
    const srcKw = (c.title || "").toLowerCase();
    if (!srcKw || !tgtKw) return;
    const longer = srcKw.length >= tgtKw.length ? srcKw : tgtKw;
    const shorter = srcKw.length >= tgtKw.length ? tgtKw : srcKw;
    // 简单相似度：较短串是否是较长串的子串，或字符重合率
    if (longer.includes(shorter)) {
      results.push({ case: c, type: "title", detail: `标题高度相似："${c.title}"`, similarity: Math.round((shorter.length / longer.length) * 100) });
    } else {
      // 字符重合率
      const setL = new Set(longer.split(""));
      let hit = 0;
      shorter.split("").forEach((ch) => { if (setL.has(ch)) hit++; });
      const sim = Math.round((hit / shorter.length) * 100);
      if (sim >= 80) {
        results.push({ case: c, type: "title", detail: `标题相似度 ${sim}%："${c.title}"`, similarity: sim });
      }
    }
  });
  // 附件名 + 大小完全相同
  (attachments || []).forEach((att) => {
    list.forEach((c) => {
      (c.attachments || []).forEach((oldAtt) => {
        if (oldAtt.name === att.name && oldAtt.size === att.size) {
          if (!results.find((r) => r.case.id === c.id && r.type === "attachment")) {
            results.push({ case: c, type: "attachment", detail: `附件重复：${oldAtt.name}（${oldAtt.size}）`, similarity: 100 });
          }
        }
      });
    });
  });
  return results;
}

/* ---------- 审核流程 ---------- */
function submitEcCase(id) {
  // 编辑后重新提交（退回的案例修改后重新进入待初审）
  return updateEcCase(id, { reviewStatus: "pending" });
}
function firstReviewEcCase(id, result, comment, quality, promotionValue) {
  const item = findEcCase(id); if (!item) return null;
  const who = (window.CURR_ACCT_EMP_ID || "0000") + " " + (window.CURR_ACCT_NAME || "匿名");
  item.firstReview = { reviewedBy: who, reviewedAt: Date.now(), result, comment };
  if (result === "通过") {
    item.reviewStatus = "firstReviewed";
    // 初审时填入质量评价和推广价值（后两个环节可修改）
    if (quality) item.quality = quality;
    if (promotionValue) item.promotionValue = promotionValue;
    logEcOp("firstReview", id, `主管初审通过：${comment || "无备注"}`);
  } else {
    item.reviewStatus = "returned";
    logEcOp("firstReview", id, `主管初审退回：${comment}`);
  }
  saveEcCases();
  return item;
}
function deptReviewEcCase(id, result, comment, quality, promotionValue) {
  const item = findEcCase(id); if (!item) return null;
  const who = (window.CURR_ACCT_EMP_ID || "0000") + " " + (window.CURR_ACCT_NAME || "匿名");
  item.deptReview = { reviewedBy: who, reviewedAt: Date.now(), result, comment };
  if (result === "通过") {
    item.reviewStatus = "deptReviewed";
    if (quality) item.quality = quality;
    if (promotionValue) item.promotionValue = promotionValue;
    logEcOp("deptReview", id, `部门审核通过：${comment || "无备注"}`);
  } else {
    item.reviewStatus = "returned";
    logEcOp("deptReview", id, `部门审核退回：${comment}`);
  }
  saveEcCases();
  return item;
}
function finalReviewEcCase(id, result, comment, quality, promotionValue) {
  const item = findEcCase(id); if (!item) return null;
  const who = (window.CURR_ACCT_EMP_ID || "0000") + " " + (window.CURR_ACCT_NAME || "匿名");
  item.finalReview = { reviewedBy: who, reviewedAt: Date.now(), result, comment };
  if (result === "通过") {
    item.reviewStatus = "finalApproved";
    if (quality) item.quality = quality;
    if (promotionValue) item.promotionValue = promotionValue;
    logEcOp("finalReview", id, `副总工批准入库：${comment || "无备注"}`);
  } else {
    item.reviewStatus = "returned";
    logEcOp("finalReview", id, `副总工退回：${comment}`);
  }
  saveEcCases();
  return item;
}
function returnEcCase(id, comment) {
  // 手动退回（供任意审核环节使用）
  return firstReviewEcCase(id, "退回", comment);
}

/* ---------- 统计 ---------- */
function incrementEcView(id) {
  const item = findEcCase(id); if (!item) return;
  item.viewCount = (item.viewCount || 0) + 1;
  saveEcCases();
  logEcOp("view", id, "在线预览");
}
function toggleEcLike(id) {
  const item = findEcCase(id); if (!item) return { liked: false, count: 0 };
  const who = window.CURR_ACCT_EMP_ID || "0000";
  if (!item.likedBy) item.likedBy = [];
  const idx = item.likedBy.indexOf(who);
  let liked;
  if (idx >= 0) {
    item.likedBy.splice(idx, 1);
    item.likeCount = Math.max(0, (item.likeCount || 0) - 1);
    liked = false;
  } else {
    item.likedBy.push(who);
    item.likeCount = (item.likeCount || 0) + 1;
    liked = true;
  }
  saveEcCases();
  return { liked, count: item.likeCount };
}
function addEcComment(id, content) {
  const item = findEcCase(id); if (!item) return null;
  const whoId = window.CURR_ACCT_EMP_ID || "0000";
  const whoName = window.CURR_ACCT_NAME || "匿名";
  const cmt = {
    id: "cmt_" + Date.now(),
    userId: whoId,
    userName: whoName,
    time: Date.now(),
    content,
  };
  item.comments = item.comments || [];
  item.comments.push(cmt);
  saveEcCases();
  return cmt;
}

/* ---------- 搜索 ---------- */
function searchEcCases({ keyword, shareName, shareDept, source, category, status, quality, promotionValue, dateStart, dateEnd, searchBody } = {}) {
  if (!EC_CASES) loadEcCases();
  const list = EC_CASES || [];
  const kw = (keyword || "").trim().toLowerCase();
  return list.filter((c) => {
    if (kw) {
      // 默认搜索范围：标题 + 分享人姓名 + 关键字数组 + 关联产品 + 部门
      const hay = [
        c.title, c.shareName, c.shareDept, c.productName,
        ...(c.keywords || []),
      ].join(" ").toLowerCase();
      if (!hay.includes(kw)) {
        // 高级检索：同时搜索案例正文（五段式内容）
        if (searchBody) {
          const body = [c.problemDesc, c.analysis, c.rootCause, c.solution, c.summary].join(" ").toLowerCase();
          if (!body.includes(kw)) return false;
        } else {
          return false;
        }
      }
    }
    if (shareName && shareName !== "全部" && !(c.shareName || "").includes(shareName)) return false;
    if (shareDept && shareDept !== "全部" && !(c.shareDept || "").includes(shareDept)) return false;
    if (source && source !== "全部" && c.source !== source) return false;
    if (category && category !== "全部" && c.category !== category) return false;
    if (status && status !== "全部" && c.reviewStatus !== status) return false;
    if (quality && quality !== "全部" && c.quality !== quality) return false;
    if (promotionValue && promotionValue !== "全部" && c.promotionValue !== promotionValue) return false;
    if (dateStart) { if ((c.submittedAt || 0) < new Date(dateStart).getTime()) return false; }
    if (dateEnd) { if ((c.submittedAt || 0) > new Date(dateEnd).getTime() + 86400000) return false; }
    return true;
  }).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}

/* ---------- 日志 ---------- */
function logEcOp(op, caseId, note) {
  if (!EC_LOGS) loadEcLogs();
  const who = (window.CURR_ACCT_EMP_ID || "0000") + " " + (window.CURR_ACCT_NAME || "匿名");
  EC_LOGS.push({
    id: "log_ec_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    caseId, op, who, time: Date.now(), note,
  });
  saveEcLogs();
}

/* ---------- 恢复默认 ---------- */
function resetAllEc() {
  sessionStorage.removeItem(OA_EC_CASES);
  sessionStorage.removeItem(OA_EC_LOGS);
  loadEcCases();
  loadEcLogs();
}

/* ---------- 重置（加载时调用一次） ---------- */
function loadAllEc() { loadEcCases(); loadEcLogs(); }
// loadAllEc() 调用 loadEcCases() + loadEcLogs()

/* ---------- window 挂载 ---------- */
window.EC_CASES = EC_CASES;
window.findEcCase = findEcCase;
window.addEcCase = addEcCase;
window.updateEcCase = updateEcCase;
window.deleteEcCase = deleteEcCase;
window.checkEcDuplicate = checkEcDuplicate;
window.submitEcCase = submitEcCase;
window.firstReviewEcCase = firstReviewEcCase;
window.deptReviewEcCase = deptReviewEcCase;
window.finalReviewEcCase = finalReviewEcCase;
window.returnEcCase = returnEcCase;
window.incrementEcView = incrementEcView;
window.toggleEcLike = toggleEcLike;
window.addEcComment = addEcComment;
window.searchEcCases = searchEcCases;
window.logEcOp = logEcOp;
window.resetAllEc = resetAllEc;
window.loadAllEc = loadAllEc;
window.EC_REVIEW_STATUS_MAP = EC_REVIEW_STATUS_MAP;
# 场景 × 组件映射

[English](SCENARIOS.md) | 中文

聊天过程中"什么场景该长出什么 UI"的调研结论，覆盖学习/生活/工作/娱乐四域。参照系：A2UI 标准目录（v0.9/v1.0）、Microsoft Adaptive Cards、Slack Block Kit、Messenger/LINE/Telegram 消息模板。触发规则的机器可读版本内置在 `a2ui_catalog` 工具的场景速查表中。

## 学习

| 场景 | 方案 |
|---|---|
| 做题 / 测验 | MultipleChoice 表单卡（选项可为 `$...$` 公式），提交锁定判分 |
| 建档 / 问卷 | 多字段表单（TextField / Select / Rate，必填项加 `required`）；5 题以上用 Wizard 分步 |
| 公式 / 推导 | Math；行内公式用 `$...$` |
| 函数图像 | Chart functions 表达式采样 |
| 参数探索 | Slider + Chart `params`（拖 μ、σ 看分布变形） |
| 算法演示 | Anim：排序=柱状、矩阵/DP=网格、图/树=graph |
| 知识结构 | Mermaid mindmap |
| 学习计划 / 闯关 | Steps；练习量趋势 Stat + Chart |
| 背单词 / 记忆 | Flashcard 翻面卡 |
| 长篇学习笔记 | Markdown（标题、列表、代码块、`$...$`） |
| 读代码题 | Text(题干) + CodeBlock(代码) + TextField(作答) |
| 代码讲解 | CodeBlock |

## 生活

| 场景 | 方案 |
|---|---|
| 约时间 / 订房 | Calendar（住宿区间用 `range: true`）、TextField kind:"time" |
| 点餐 / 购物 | Grid 商品卡 + 查询按钮 |
| 菜谱 / 攻略 | Steps；有分支走 Mermaid 流程图 |
| 旅行行程 | Steps 按天 + Tabs 切换 + Table 明细 |
| 预算 / 计算器 | Slider + Calc + Stat（贷款/BMI/换算实时计算） |
| 健康趋势 | Chart + Stat |
| 打分评价 | Rate（+When 追问原因） |
| 家庭投票 | MultipleChoice |
| 倒计时 | Countdown |
| 排优先级 | RankList（拖拽或点按排序） |
| 给模型看照片/票据 | Upload（客户端压缩，以真实图片回传） |
| 签字确认 | Signature（以图片回传） |
| 签字确认 | Signature（以图片回传） |

## 工作

| 场景 | 方案 |
|---|---|
| 会议时间征集 | 表单卡（date/time + 时段多选） |
| 方案对比 | Table 参数对比 + Grid 卡片 |
| 数据周报 | Grid + Stat 指标行 + Chart |
| 分区域分布 | Map（中国省级热力，简称全称均可） |
| 可编辑表格（预算/排班） | EditableTable（改动随提交回传） |
| 报表期切换 | Tabs 或 Table 字典绑定 |
| 项目进度 | Steps + Progress，`a2ui_update` 原地推进 |
| 历程回顾 | Timeline |
| 流程 / 架构 / 排期 | Mermaid（flowchart/sequence/gantt） |
| 审批确认 | Button submit:true |
| 代码评审 | CodeBlock |

## 娱乐

| 场景 | 方案 |
|---|---|
| 影音 / 游戏 / 餐厅推荐 | Grid 卡片 + 海报 + 查询按钮 |
| 打分 / 评价 | Rate + TextField 短评 |
| 投票 / 竞猜 / 猜谜 | MultipleChoice |
| 赛程 / 榜单 | Table |
| 互动小说 | 单选卡连续推进 |
| 音乐 / 播客 | Audio |
| 视频 | Video |
| 前后对比 | ImageCompare（拖动分割线） |
| 追问建议 | Suggestions chips（点按即发送） |

## 联动交互（响应式绑定）

数据绑定是响应式的：输入组件写数据模型，所有 `{"path"}` 绑定即时更新。

- **选择 → 追问**：MultipleChoice 写值 + `When includes:"其他"` 显示补充输入框
- **滑杆 → 曲线**：Slider 写参数 + Chart `params` 注入表达式常量，实时重采样
- **输入 → 计算**：Calc 表达式派生值写回，Stat/Chart 绑定实时显示
- **切换 → 换数据**：Tabs 分页签，或 Table `rows: {source, pick}` 字典绑定

## 触发原则：UI 的四个目的

卡片在以下任一目的上胜过纯文本时触发——提示词无需任何 UI 字眼：

- **操作** —— 用户要回答/选择/填写/调节/确认 → 表单卡
- **浏览** —— 用户想看/扫数据或条目（统计、排名、分布、趋势、多条目推荐）→ 图表/表格/地图/Grid；数据不确定不取消卡片（画已知最好的、标口径、正文说明）
- **理解** —— 结构、记号或动态过程帮助想明白（数学、代码、流程、随时间展开的过程）→ 公式/代码块/图示/逐帧动画
- **反馈** —— 多步长任务先出 Progress/Steps 进度卡，`a2ui_update` 原地推进

四者都不沾（观点、叙事、短答、翻译、闲聊）→ 纯文本。卡片始终配 1–3 句正文结论。

## 会话导航

会话出现表单卡后，右缘停靠导航抽屉：「任务」页签分组待提交/已提交任务（已填计数、内容预览、可标记无需填写），「全部」页签完整列出每条用户消息并点击定位。草稿刷新不丢；已提交状态清缓存后可从会话记录重建。

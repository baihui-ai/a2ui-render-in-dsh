# 场景 × 组件映射

[English](SCENARIOS.md) | 中文

聊天过程中"什么场景该长出什么 UI"的调研结论，覆盖学习/生活/工作/娱乐四域。参照系：A2UI 标准目录（v0.9/v1.0）、Microsoft Adaptive Cards、Slack Block Kit、Messenger/LINE/Telegram 消息模板。触发规则的机器可读版本内置在 `a2ui_catalog` 工具的场景速查表中。

## 学习

| 场景 | 方案 |
|---|---|
| 做题 / 测验 | MultipleChoice 表单卡（选项可为 `$...$` 公式），提交锁定判分 |
| 建档 / 问卷 | 多字段表单（TextField / Select / Rate） |
| 公式 / 推导 | Math；行内公式用 `$...$` |
| 函数图像 | Chart functions 表达式采样 |
| 参数探索 | Slider + Chart `params`（拖 μ、σ 看分布变形） |
| 算法演示 | Anim：排序=柱状、矩阵/DP=网格、图/树=graph |
| 知识结构 | Mermaid mindmap |
| 学习计划 / 闯关 | Steps；练习量趋势 Stat + Chart |
| 背单词 / 记忆 | Flashcard 翻面卡 |
| 代码讲解 | CodeBlock |

## 生活

| 场景 | 方案 |
|---|---|
| 约时间 / 日程 | TextField kind:"date"/"time" |
| 点餐 / 购物 | Grid 商品卡 + 查询按钮 |
| 菜谱 / 攻略 | Steps；有分支走 Mermaid 流程图 |
| 旅行行程 | Steps 按天 + Tabs 切换 + Table 明细 |
| 预算 / 计算器 | Slider + Calc + Stat（贷款/BMI/换算实时计算） |
| 健康趋势 | Chart + Stat |
| 打分评价 | Rate（+When 追问原因） |
| 家庭投票 | MultipleChoice |
| 倒计时 | Countdown |

## 工作

| 场景 | 方案 |
|---|---|
| 会议时间征集 | 表单卡（date/time + 时段多选） |
| 方案对比 | Table 参数对比 + Grid 卡片 |
| 数据周报 | Grid + Stat 指标行 + Chart |
| 报表期切换 | Tabs 或 Table 字典绑定 |
| 项目进度 | Steps + Progress |
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

## 联动交互（响应式绑定）

数据绑定是响应式的：输入组件写数据模型，所有 `{"path"}` 绑定即时更新。

- **选择 → 追问**：MultipleChoice 写值 + `When includes:"其他"` 显示补充输入框
- **滑杆 → 曲线**：Slider 写参数 + Chart `params` 注入表达式常量，实时重采样
- **输入 → 计算**：Calc 表达式派生值写回，Stat/Chart 绑定实时显示
- **切换 → 换数据**：Tabs 分页签，或 Table `rows: {source, pick}` 字典绑定

## 触发原则

向用户提问/要选择/要填写 → 一律表单卡；数学符号 → 一律 Math / `$...$`；可比较数据 → 图表/表格/指标块；线性步骤 → Steps；纯叙述解释 → 文本。

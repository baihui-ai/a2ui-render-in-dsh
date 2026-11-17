# 999: 完成回合后保持 A2UI 卡片可见

| 项 | 值 |
|---|---|
| Phase | review |
| Profile | standard |
| 优先级 | P1 |
| 负责人 | sondge |
| 目标日期 | 待填 |
| 涉及子系统 | src/client, test |

## 一句话描述

修复 GitHub issue #1：工具过程折叠后卡片不可见

## 背景

DSH 0.2.1-rc.3 将 toolview 放在折叠过程区，需要独立回合尾入口并保留交互与更新

## 关键决策

采用回合尾部独立展示，保留旧工具入口。有效需求及 AC 维护于 [技术方案](design/TECH_DESIGN.md)。

阶段：直接设计（issue 输入充分，无占位 PRD）→ 方案评审通过 → 实现完成 → 代码评审及本地验收通过；真实 Windows DSH / 旧宿主复验待环境。

产物：[方案评审](review/design_review.md)、[代码评审与验证](review/code_review.md)、[独立业务测试计划](test/TEST_PLAN.md)。未将待验项标为完成。

## 上下文索引

- [素材索引](context/_INDEX.md)

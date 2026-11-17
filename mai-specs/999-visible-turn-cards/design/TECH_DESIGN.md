# 完成回合后保持 A2UI 卡片可见 技术方案

> Feature：999 | Profile：standard | 模板：mai-specs/_templates/TECH_DESIGN.tmpl.md | 代码基线：9af3291b12a8c806bc7fd2af276a893b24669f57 | 状态：已确认

[返回 BRIEF](../BRIEF.md)

## 需求依据与验收

有效需求来源为 [issue #1](https://github.com/baihui-ai/a2ui-render-in-dsh/issues/1) 和本次修复、创建分支及提交 PR 的授权。没有 PRD；以下 AC 是唯一维护源。

- AC1：正常结束回合后，成功生成的所有卡片在正文下方可见，过程区折叠或完全不挂载时仍可交互。
- AC2：仅展示当前回合成功的 a2ui_render，按调用顺序展示多张卡；普通工具、失败调用不生成尾部卡片；支持工具子调用和无结束正文的回合。
- AC3：卡片提交、锁定、重新填写、持久化恢复继续可用；回合结束前已填写的草稿不丢失。
- AC4：成功的 a2ui_update 在工具行不挂载时仍生效；重挂载不重复更新，失败或未完成调用不改变卡片。
- AC5：保留生成中预览；不支持新入口的旧宿主保留原工具行卡片，不修改宿主 DOM/CSS。

## 1. 最小方案与关键决策

在客户端注册 conversation.chat.turnTail（list 使用 id，而非 keyed 的 key）。复用 A2uiToolView 和 A2uiUpdateView。使用该入口提供的 useChat 读取节点仓库，通过 turnDataSource(turn.turn, 'tool-call') 和 useSyncExternalStore 订阅本回合工具数据，包含被过程区隐藏的节点。以 turn.end.seq 为边界，不能使用结束正文 seq 截断后续工具结果。

工具行通过 useChat 判断相同回合是否已有 turn-tail 节点；存在时仅显示标题摘要，完整卡片归尾部所有，避免重复可编辑实例。不支持 useChat 或无尾部节点时仍走原视图。草稿在每次输入时立即保存，避免 400ms 防抖窗口内回合结束、视图切换丢值。

尾部包含所有成功的 render 和无可见输出的 update 执行器。update 只在成功结果落定后执行，沿用本地更新记录按 callId 去重。活跃表面以 sessionId 和 callId 联合定位，避免不同会话同名调用串写。

移交时通过按 sessionId/callId 定位的短生命周期 mirror 共享输入、上传、busy/locked 和提交状态，最后一个挂载释放后在微任务中清理。这样正在提交的旧实例收到响应后，尾部实例也会锁定；不把组件重新挂载当作新卡片。草稿同时立即落盘，支持非同一次提交中的卸载/重建。

备选：只扩大折叠区高度依赖宿主私有 DOM，且子树不挂载时无效；只展示最后一张卡会丢失前面的表单。新增成本限于一个尾部适配组件和回归测试，不引入库、开关或新 RPC。局部展示适配无需新增图示、数据库或 HTTP 接口。

## 2. 接口与供评审代码设计

拟新增 src/client/turn-tail.jsx：

```jsx
const nodes = useChat(snapshot => snapshot.nodes);
const source = nodes.turnDataSource(turn.turn, 'tool-call');
const tools = useSyncExternalStore(source.subscribe, source.getSnapshot);
// 展开 tools[*].root.subCalls；过滤 settled、!isError、seq <= turn.end.seq。
// render => A2uiToolView；update => A2uiUpdateView quiet。
```

输入为 DSH 0.2.1-rc.3 原生 turn、seq、sessionId、useChat、t，加注入的 api；无工具数据返回 null。使用实际 npm 包发布类型及实现核实契约；不从 localStorage 或挂载过的工具行推测回合内容。

## 3. 风险与兼容性

最重要风险是双实例交互、折叠时更新执行器不挂载、草稿移交、历史重复更新。对应措施为单展示所有者、尾部执行成功更新、即时草稿和现有 callId 去重。恢复方式为回退插件版本，无存储格式迁移。保留旧工具入口；其他 DSH 版本的真实桌面行为尚未验证。

## 4. 任务与验收

1. 新增尾部适配与注册，AC1/2/5。
2. 接入工具行摘要与即时草稿，限定成功更新、会话隔离，AC3/4。
3. 扩展现有 jsdom 测试，覆盖工具行完全不挂载、多卡、嵌套、失败、跨回合更新、重挂载、提交和草稿移交；运行构建及全套测试。
4. 用 Chromium 检查折叠过程区外的可见卡片与操作，在小窗口验证主要交互；真实 DSH Windows 桌面缺环境时如实保留该验证限制。

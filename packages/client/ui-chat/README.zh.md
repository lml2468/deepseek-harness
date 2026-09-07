---
description: "渲染 Session 对话节点、详情、历史图片、操作、本地化和滚动状态的浏览器 Chat target。"
kind: "package-reference"
---
# @deepseek-ai/dsh-client-ui-chat

[English](README.md) | 中文

## 概述

Conversation 组装的浏览器 Chat target。本包注册 Chat event definition 与 snapshot 构造、提供 `useChat`、渲染 transcript node 和详情，并拥有 Chat 专属 store、action、本地化与滚动位置恢复；历史图片 URL 通过 Conversation 持有的按会话缓存（`ctx.uiConversation.imageUrl`）解析。其中 Assistant 与 Turn Tail definition 会直接 fold packed Assistant 历史 run，不展开其成员。steering 分类通过持久 splice state 只保留 next-step Inbox ID；next-turn splice 不创建 Chat Context。本地提交回显（`SessionSnapshot.pendingSubmissions`）保留提交开始时选定的区域：transcript 回显位于消息流末尾，steering 回显带 pending-steering 标记，queued 回显不进入 Chat。一旦 user/steering 节点或 queue occurrence 携带回显的 prompt `rpcId`，该回显即在同一渲染中隐藏，因此交接是原子的。

## 目录

- [Workbench 视图](#workbench-views)
- [系统提示词行](#system-prompt-row)
- [轮次 token 用量](#turn-token-usage)
- [Turn 身份头部](#turn-identity-header)
- [轮次过程折叠](#turn-process-folding)
- [滚动归属](#scroll-ownership)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="workbench-views"></a>
## Workbench 视图

Session 级 `conversation.details.view` 列表可以增加右侧 Workbench 视图而不替换 Chat。`ctx.conversationDetails` 可打开 singleton 或由调用方寻址的 resource tab，并可激活、更新、排序和关闭 tab，同时为外部控件暴露一个稳定的可观察 snapshot。持久化的 `dsh.conversation.workbench.v1` store 只包含 tab 身份、View 身份、标题、JSON 展示状态和活动 tab；focus 请求仅存在于当前进程中，每个 Session 使用隔离的 store。关闭栏只会隐藏它而不销毁 tab，关闭最后一个 tab 时也会隐藏栏。tab strip 支持键盘导航、拖动排序、溢出选择，以及用于打开已注册 singleton View 的添加菜单。未声明 label 的 View 仅用于 resource tab：调用方可通过 `openTab()` 打开，但它不会出现在添加菜单中，也不接受 `open()`。每个活动 View 都在独立错误边界内渲染，并接收其 tab、focus 请求、状态更新方法、关闭操作和 focus 确认方法。内置 `tool` View 是普通 singleton tab。移除 View 注册会删除该 View 拥有的全部 tab（[决策](../../../.agents/notes/implemented/feature/2026-09-07-session-workbench-tabs.zh.md)）。

-----

<a id="system-prompt-row"></a>
## 系统提示词行

Chat 会为每个非空的初始或恢复请求、显式消息序列起点或真实 system 字段变化显示一行默认折叠的`系统提示词`。同一序列内仅配置或仅工具变化、工具步骤与重试不会重复该行。该行位于请求的用户消息之前，与提供方 envelope 顺序一致；展开后显示保留原始换行的精确模型可见文本。历史窗口不完整时，非初始 header 会保守显示，直到前一页到达；没有系统提示词的 header 不创建该行。

-----

<a id="turn-token-usage"></a>
## 轮次 token 用量

只有当已加载窗口包含 `turn/start`，且每次已启动的模型尝试都报告安全、精确的用量时，已完成 Turn 才显示可展开的用量行。该行会省略不可用的可选用量桶。记账不完整或相互矛盾时，整个详情都不显示，避免把部分总量冒充完整结果。

-----

<a id="turn-identity-header"></a>
## Turn 身份头部

Session 级 `conversation.chat.turnHeader` 单一 slot 在每个 Turn 的 Assistant 回复前渲染一次。其 owner 暴露 DSH `TurnLocation`，包含权威的打开/关闭状态以及开始/结束事件；产品组合可据此呈现自己的 Agent 身份和本地化状态，而无需替换 Chat node 或复制 Session 状态。slot 无注册项时不渲染头部。

-----

<a id="turn-process-folding"></a>
## 轮次过程折叠

「设置 → 通用设置」提供持久化到 `ui-chat` 命名空间的 `Normal` / `Compact` 对话显示偏好，默认使用 `Compact`。Normal 保持所有过程行可见且不渲染轮次过程控件。Compact 让 System prompt 与已关闭的 Context 记账信息保持挂载但退出默认阅读流；展开某轮的过程披露会显示其 Context 行，而 System prompt 仍可在 Normal 与 Trajectory 中查看。轮次打开期间，推理、Assistant 内容、工具行与重试行始终展开。到 `turn/end` 时，最后一个步骤只有在包含非空文本、图片或未知可见块且不含工具调用块时才成为最终正文边界；边界之前的上下文注入、推理、较早 Assistant 内容、工具行与重试行随后默认收起。控件展示覆盖整个轮次的非 subagent 工具调用数、最终正文之前带回复内容的 Assistant 消息数和 subagent 委派数；值为 0 的分段省略，工具调用与 subagent 两项互斥，系统提示词与上下文注入都不增加计数。三项全为 0 时过程仍会收起，控件标题显示「已思考」（英文为 `Thought for a while`）。摘要下方的通栏分隔线将其与正文或展开后的过程行隔开。用户与 steering 消息、错误、最大 token 与 turn-tail 行留在过程组外。终止错误首先显示本地化、面向恢复的摘要，其持久化消息与代码保留在默认收起的技术详情中。新的过程控件插入时不会改变既有行的相对顺序：开场人工输入从首次投影起便位于控件和过程行之前。只要仍可通过「加载更早」获取历史，过程控件就不出现；历史加载完整后，每个合格的已关闭轮次立即使用默认收起状态。稳定 Chat Node Seat 会让每个 renderer 保持挂载，隐藏成员不产生消息流间距；只有中间没有独立输入时，收起控件才与正文相隔 8px。完成后的收起不依赖是否跟随尾部，因此正在上方阅读的用户可能看到 transcript 高度变化。手动收起会先把焦点移到过程控件，再隐藏成员。会话作用域 store 只记录用户手动展开的「轮次 + 正文步骤」generation；不同正文 generation 默认收起（[折叠决策](../../../.agents/notes/implemented/feature/2026-08-14-web-turn-process-folding.zh.md)，[排序决策](../../../.agents/notes/implemented/bug-fix/2026-08-26-stable-turn-process-order.zh.md)）。

-----

<a id="scroll-ownership"></a>
## 滚动归属

Chat 会在历史前插与 renderer 重新挂载时恢复语义锚点。读者跟随底部时，`ResizeObserver` 追随新的底部，并且无需读取行几何就选中最后一个已加载 Turn；读者离开底部后，高度变化会保持顶部位置，再由阅读线几何选择活跃 Turn。轮次导航预览位于 Markdown 代码块粘性头栏上方，而导航外框始终处于 composer 上方的 transcript 区域内（[已加载 Turn 导航](../../../.agents/notes/implemented/feature/2026-08-25-loaded-turn-chat-navigation.zh.md)）。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包在浏览器中渲染已记录的对话状态，不注册任何面向模型的内容。

#### KV Cache 影响

无；Chat 呈现不会组装或修改提供方请求。

## 已知限制与暂缓事项

<a id="known-limitations-and-deferred-work"></a>

- **transcript 只反映已加载的 Session 窗口**——只有 Session Controller 加载前一页 event 后，更早的 transcript node 才会出现。轮次导航比窗口更宽：轨道把已加载的 Turn 与宿主 `turnOutline` 投影合并，每个已开始的 Turn 都有固定间距刻度（相隔 10px；阶梯高于外框时在框内滚动并以渐变淡出标示可滚方向），激活未加载刻度会先把历史分页拉到该 Turn 的 `turn/start` seq 再落到它的行上。没有该投影时（未挂载 `dsh-session-turn-outline` 的装配），轨道回退到仅显示已加载 Turn。
- **导航预览按卡片尺寸截断**——提示词一行（50 字符）、回复至多三行（120 字符），已加载与未加载 Turn 一致；未加载 Turn 的回复要等该轮落定后才随大纲到达，进行中的轮次在此之前只预览提示词（或仅轮次号）。


<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。Conversation 与 Slot 注册已经强制 Chat target 一致。

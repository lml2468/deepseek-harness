# Agent Note: 可组合的对话 Hero 与 Workbench

Status: implemented

[English](2026-09-04-composable-conversation-hero-and-workbench.md) | 中文

## Problem

产品组合需要围绕常驻的新会话 composer 放置自有标题和发现内容，并在对话旁增加 Session 专属检查视图。原有 slot 迫使产品内容进入执行状态 dock 或替换中央视图。这些位置会造成 Hero 层级重复或挤走官方 Conversation，而复制 shell 又会重复 Session、输入和面板状态。

## Decision

`ui-conversation` 保持唯一常驻 composer，并暴露仅用于呈现的 Hero slot。`conversation.hero.header` 替换默认标题，`conversation.hero.content` 将产品发现内容排列在 composer 之前，`conversation.hero.footer` 将辅助内容排列在 DSH 上下文控件之后，`conversation.hero.layout` 可以排列已经构造好的标题、控件、内容、composer 和 footer 节点。默认布局将 composer 与其上下文控件组成一组，并把这一组放在发现内容之后。布局持有者只接收当前 Session 和输入快照，没有修改权限。无 Session、空白 Session、加载中和创建失败状态保持同一个 composer 组件身份。

Root 级 `CommandUiRuntime` 是常驻 `+` 菜单与手动输入 `/` 命令的唯一公开组合 API。业务包可注册客户端自有的 `popupSelect` 或 `action` 贡献项，也可装饰既有 Host 命令，同时保留其目录行和生命周期。Runtime 持有命令的呈现与派发，不持有能力状态。权限和模型等持续选择仍是其权威 Session 服务的投影。

`ui-chat` 声明 Session 级 `conversation.details.view` 列表并提供 `ctx.conversationDetails`。controller 定位当前已挂载 Session、校验已注册的 view id、打开由 layout 持有的详情栏，并在 Session 级 Chat store 中携带可选的一次性 focus 字符串。官方 Tool 检查器是内置 `tool` view。活动 view 被移除时选择剩余的第一个 view；没有 view 时关闭详情栏；切换 Session 仍由 `ui-layout` 关闭详情栏。

终止的 Turn 失败在官方错误操作旁暴露有序的 `conversation.turn.error.actions` slot。注册方可以增加恢复入口，而无需替换错误 renderer 或改变重试和停止行为。

Session 级 `conversation.chat.turnHeader` 单一 slot 从 Turn 过程锚点渲染一次，位于 Assistant 回复之前。它暴露权威的 `TurnLocation`，使产品可以呈现自身的 Agent 身份和完成状态，而无需替换 Chat node 或镜像 Session 生命周期数据。

共享 theme 定义间距、控件高度、圆角和内容宽度的语义几何变量。现有 primitive 在数值确实共用时消费这些变量。`Modal` 限制 Tab 焦点、支持 Escape 关闭、保留显式安全自动聚焦目标，并在卸载时把焦点还给仍连接的 opener。

默认 Hero 使用双层 Composer 表面：20px 圆角的浅灰外层承载上下文栏，16px 圆角的输入卡片带有清晰内边距地置于其中。Workspace、preset、permission 和 model 触发器统一使用 8px 圆角矩形。这些数值只定义 DSH 默认呈现；产品 slot 内容仍负责自身控件。

## Alternatives considered

**由产品持有 Conversation renderer。**不采用，因为它会复制 DSH Session、Workspace、composer、approval 和 tool 状态，并与官方执行生命周期产生偏差。

**DOM 查询、私有 selector 或运行时 patch。**不采用，因为它们依赖插件契约之外的实现细节，且无法安全卸载。

**在 DSH 中加入产品概念。**不采用，因为 Assistant、Expert、Project、Connector 和产品品牌属于消费方组合；DSH 只导出通用布局与动作入口。

**建立通用 Presentation 框架。**不采用，因为当前复用范围仅包括 Hero 组合、composer 动作、Workbench view、错误动作和共享几何；现有 Slots、store 和 primitive 已提供所需生命周期。

## Consequences

- 产品插件可以组合新会话层级、Turn 身份头部和右侧检查视图，而无需重建或镜像 DSH 状态。
- Slot 注册和命令贡献项由 effect 持有，并随插件卸载消失；重复命令名与未知 Workbench view id 会明确失败。
- Workbench controller 只持有呈现状态。持久 Tool 数据、Session 历史、面板几何和执行行为仍由既有 DSH 所有者持有。
- 包级测试覆盖命令注册与派发、弹窗失败处理、焦点恢复、Session 局部 view 状态、view 移除、Modal 焦点和默认 fallback 渲染。组装后的浏览器测试继续负责几何与截图证据。

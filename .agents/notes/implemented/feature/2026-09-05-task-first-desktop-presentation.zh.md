# Agent Note: 任务优先的桌面端呈现默认值

Status: implemented

[English](2026-09-05-task-first-desktop-presentation.md) | 中文

## Problem

默认 Web UI 让运行时记账信息与用户意图和任务结果拥有相同的视觉权重。Compact 对话仍以 System 与 Context 行开头，活跃 Conversation 的 composer 会收缩成单行文本高度，终止错误直接铺开 provider 诊断，而各插件贡献的 Settings 页面则继承无法区分的齿轮图标。产品 shell 虽可替换主要布局 slot，这些默认呈现仍会让组合后的桌面应用像一组开发控件，而不是连续的任务界面。

## Decision

Compact 对话模式保持 System 与已关闭 Context 行挂载，但将其移出默认阅读流。展开某轮的过程披露会显示其 Context 行；Normal 与 Trajectory 继续提供完整 prompt 元数据的检查入口。

常驻 composer 在活跃 Conversation 中也保留适合任务输入的书写区域，Hero 形态则继续使用更大的区域。Lexical 编辑器、草稿、Queue、审批与提交的所有权均保持不变；改变的只有呈现最小高度。

终止 Turn 错误首先显示本地化、面向恢复的摘要。其持久化 provider 消息与错误代码保留在默认收起的技术详情披露中，已注册的产品操作仍使用消息下方原有的 slot。

Settings 导航为每个本地化分区标签搭配克制的图标。内置分区使用既有语义图标；可选的 keyed 分组标题与图标 slot 允许产品装饰自己的分区 id，同时不让 Shell 引入产品概念。未贡献图标的页面使用中性的 Settings 图标。通用设置注册项提供本地化分组标签；Shell 把这些条目投影为带标题的独立卡片，每个功能仍拥有自己的设置行与行为。

Conversation header 使用单行紧凑结构。其他 Conversation View 收入历史控件，附加 Session action 收入统一的更多菜单，Chat 为所有已注册右侧 View 提供一个 Workbench 入口。Workbench 自身只显示当前 View，并使用一个选择菜单代替横向标签栏。产品 View 仍可被发现，但不再为每个 View 向 header 添加按钮或标签。

## Alternatives considered

**让每个产品自行覆盖这些界面。** 拒绝，因为这些行属于官方 Session、Composer、错误与 Settings 呈现。由各产品重新实现会复制有状态 UI，或迫使产品依赖私有 selector。

**永久隐藏 prompt 元数据或 provider 诊断。** 拒绝，因为它们是检查与支持所需的信息。本次修改只降低默认显著性，不删除持久化事实。

**为设置外壳增加产品专属图标注册表。** 拒绝，因为外壳不拥有产品词汇。Keyed 呈现 slot 无需可变注册表或在 dsh 中写入产品 id 即可完成组合。

## Consequences

交付的默认界面优先形成连续的任务阅读流，同时保留原有 Runtime 与状态所有权。Compact 模式有意比 Normal 与 Trajectory 少展示诊断信息。活跃 composer 占用更多垂直空间；检查终止错误的原始 provider 文本需要一次展开操作；Conversation header 减少实现层控制；Settings 页面使用分组卡片与一致的导航图标。CSS 与组件测试固定这些呈现选择；产品仍只能通过公共 slot 组合品牌与领域内容。

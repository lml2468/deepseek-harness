# Agent Note: 设置页面共享结构 Scaffold

Status: implemented

[English](2026-09-10-settings-structural-scaffold.md) | 中文

## Problem

Settings Shell 拥有导航与内容视口，但此前只为“通用”渲染当前页面标题。因此其他每个功能分区都必须自行决定是否渲染标题、说明、分组标题、卡片、列表行和状态框。共享主题 Token 并不能让这些彼此独立的 DOM 结构自然一致：同级设置页的标题基线、内容起点、边框、间距以及加载或错误状态持续漂移。

之前的[客户端共享控件 Primitive](2026-09-05-shared-client-control-primitives.zh.md)决策否决了带行为的 `SettingsCard` 抽象，因为当时审查的三类 DSH 卡片分别承担选择、折叠和只读等不同语义。该证据继续约束行为层，但不涵盖现在同时被 DSH 与外部产品插件需要的纯展示 Scaffold。

## Decision

Settings Shell 为每个分区统一把当前 `settings.section` 的 label 渲染成内容标题。分区自身不得再渲染第二份页面标题。

`@deepseek-ai/dsh-client-ui-primitives` 导出七个与 Cordis 无关的结构组件：`SettingsSection`、`SettingsGroup`、`SettingsCard`、`SettingsRow`、`SettingsState`、`SettingsTabs` 和 `SettingsTabPanel`。它们只拥有布局、排版、边框、间距、响应式堆叠、Tab 键盘导航以及稳定的数据标记，不拥有任何设置状态、文案、页面导航、持久化、校验或功能行为。所有可见文案与 ARIA 名称仍由功能插件提供。

Scaffold 为普通设置内容定义唯一合法层级：`SettingsSection` 依次渲染可选说明、可选 `navigation` 与 `SettingsGroup`，Group 包含 `SettingsCard`，Row 与 State 位于该 Surface 内。`SettingsCard` 提供三种 padding 模式，因为行列表、自由内容与已经自带内边距的专用编辑器需要不同的内容盒，但应共享同一边框、圆角和 Surface。这是展示变体，不是行为变体。

“通用”“模型”“插件”和“Agent 预设”分区自身均使用该 Scaffold，因此第一方与外部分区消费同一实现，而不是复制各自的样式表。归属同一分组的“通用”贡献发布相同的本地化分组标签，使分组标题位于该组全部行之前。“插件”同时使用共享 Tab Strip 与 Panel。专用设置编辑器可保留功能自有控件和内部布局，但页面标题与外层 Section/Group/Surface 层级仍必须共享。

## Alternatives considered

**保留 Shell 特例，仅在文档中要求 CSS 对齐。** 否决。当前 label 已存在于 Shell 的分区目录中，而功能页面仍可能漏掉、重复或错位渲染标题。文档无法让两棵独立编写的元素树完全一致。

**把 Scaffold 放入 `ui-settings-general`。** 否决。功能插件不得在运行时导入另一个功能插件；`ui-primitives` 是所有设置功能唯一共享的浏览器安全静态属主。

**制作一个有状态的万能 Settings 卡片。** 依据之前控件 Primitive 记录中的原因继续否决。选择、展开、保存、校验和远程变更仍归功能所有。新的 `SettingsCard` 刻意只承担布局 Surface。

**用一个高度可配置的组件描述完整页面。** 否决。包含可选标题、工具栏、Tab、表单字段、卡片和状态的大型 schema 会隐藏语义 HTML，也让专用编辑器更难组合。七个窄结构组件已经表达真实重复边界。

## Testing

组件测试固定 Scaffold 层级、由属主提供的文案与语义、padding 变体、状态色调、Tab 键盘导航以及 Tab 与 Panel 的关联。Settings Shell 测试断言导航切换会为每个分区更新唯一由 Shell 拥有的标题。“通用”测试固定共同分组归属和标题顺序。“通用”“模型”“插件”和“Agent 预设”浏览器场景断言每个内置页面都通过共享 Scaffold 进入，并且不再渲染第二份页面标题。

## Consequences

设置页现在共享结构，而不只是共享变量。外部产品插件获得了受支持的公开 Seam，可在不导入功能包、不复制 CSS 的前提下匹配第一方页面。

公共 Primitive 表面增加七个组件。其刻意收窄的契约意味着功能专属卡片行为仍需留在本地。若产品希望强制结构一致，必须对自己的设置注册执行 lint；DSH 无法静态检查第三方 JSX。

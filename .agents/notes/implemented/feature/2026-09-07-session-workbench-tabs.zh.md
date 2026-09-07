# Agent Note：Session Workbench tab

Status: implemented

[English](2026-09-07-session-workbench-tabs.md) | 中文

## 问题

Conversation 详情栏一次只能显示一个已注册 View。打开另一个 View 会替换当前选择，因此用户无法在一个 Session 中保留多个产品页面或多个资源。如果由产品插件自行实现 tab，导航状态就会与 layout 持有的详情栏分裂，并重复实现持久化和键盘行为。

## 决定

`ui-chat` 为每个 Session 持有一个持久化 Workbench store。该 store 在 `dsh.conversation.workbench.v1` 下记录 version-one tab 列表和活动 tab id；每个 tab 只包含自身 id、已注册 View id、标题、可关闭标记和 JSON 展示状态。store 不包含 Session 数据、Workspace 数据、资源内容、加载状态、错误、滚动位置或仅当前进程有效的 focus 请求。

Conversation details controller 是唯一的变更接口。`open(viewId)` 按 View id 寻址 singleton tab，`openTab(tab)` 接收由调用方寻址的 resource tab。两个操作都按 tab id 去重、激活结果，并打开由 layout 持有的栏。controller 还负责激活、更新、排序和关闭 tab。关闭栏会保留 store；关闭最后一个 tab 会同时关闭栏。关闭活动 tab 时优先选择其左侧邻项，其次选择右侧邻项。

详情面板渲染语义化 tab list、溢出与添加菜单、拖动排序、键盘导航、逐 tab 关闭操作，以及包围活动 View 的独立错误边界。仅挂载活动 View。View 接收不可变 tab descriptor、活动标记、仅当前进程有效的 focus 请求、JSON 状态更新方法、关闭操作和 focus 确认方法。内置 Tool 详情 View 与贡献的 View 使用相同 singleton 路径。

View 注册继续由 Cordis 生命周期持有。View 插件卸载时，controller 删除引用该 View 的全部 tab，并持久化清理结果。持久化输入在 local-storage 边界解码；格式损坏时只重置对应 Session 的 Workbench 展示状态。

## 曾考虑的替代方案

**保留单个活动 View id，由产品插件持有嵌套 tab。**否决：每个产品都会重复实现排序、关闭后选择、可访问性、持久化和失败隔离，官方栏也无法协调这些 tab。

**把 Workbench tab 持久化到 Session log 或 Host domain。**否决：tab 是本地展示状态。写入日志会把单个浏览器的布局混入持久对话，Host domain 则会重复 Client store 框架已经拥有的 Session scope。

**挂载所有非活动 View 并隐藏。**否决：文件、浏览器和文档 viewer 可能持有大资源和后台工作。Workbench 只挂载活动 View；每个 View 在激活时恢复轻量展示状态。

**在同一变更中增加终端、侧边对话、分栏或浮窗概念。**否决：这些能力有独立的执行和布局归属。Workbench 只提供单个右侧多 tab 栏。

## 后果

Session 可以在导航和应用重启之间保留多个产品与 resource tab，而不复制 conversation 或资源内容。产品插件用稳定 id 寻址 resource tab，并在挂载时重新校验实时资源。切换 Session 会原子替换整组 tab。该设计有意不保留未激活 tab 的组件挂载状态、进行中的 View 请求和资源 lease；View 只保存 JSON 展示选择，并在激活时重新获取实时资源。

## 测试

Store 测试覆盖解码、Session 隔离、去重、状态更新、排序、关闭后选择和 View 移除。Controller 测试覆盖 Session 切换、focus 生命周期、layout 可见性和注册协调。组件测试覆盖 tab 激活、关闭、排序、键盘导航、菜单和 View 级错误隔离。组装后的 Web 构建与浏览器场景验证共享 Slot 与 layout 路径。

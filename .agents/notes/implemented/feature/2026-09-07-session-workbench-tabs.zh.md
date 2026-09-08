# Agent Note：Session Workbench tab

Status: implemented

[English](2026-09-07-session-workbench-tabs.md) | 中文

## 问题

Conversation 详情栏一次只能显示一个已注册 View。打开另一个 View 会替换当前选择，因此用户无法在一个 Session 中保留多个产品页面或多个资源。如果由产品插件自行实现 tab，导航状态就会与 layout 持有的详情栏分裂，并重复实现持久化和键盘行为。

## 决定

`ui-sidebar-right` 为每个 Session 持有一个持久化 Workbench surface。Slot runtime 以 `dsh.conversation.workbench.v1` 为基础键为每个 Session 创建独立 store 实例；该实例记录 DockKit 布局、操作历史与 id 计数。tab 记录只包含导航身份和展示元数据。store 不包含 Session 数据、Workspace 数据、资源内容、加载状态、错误、滚动位置或仅当前进程有效的导航请求。

`ctx.sidebarRight` 是公开的变更接口。`openTab(kind)` 打开 page 类型，`openResource(address)` 则通过 tab registry 解析 resource 类型。两个操作都按 `(kind, contentId)` 去重、激活结果，并打开由 layout 持有的栏。DockKit action 把聚焦、移动、分栏、悬浮、停靠和关闭记为布局操作。关闭栏会保留 store；关闭最后一个 tab 时重新种入引导页，不留下空 pane。

右侧 Sidebar 在停靠 pane 与悬浮面板中渲染语义化 tab list、添加控件、拖动排序、键盘导航和逐 tab 关闭操作。只挂载活动 tab 的正文。tab 类型通过 `useTabInfo()` 读取自身 occurrence，而自己的 Slot store 持有轻量展示状态。内置与外部贡献的 tab 类型使用同一个 registry 和 keyed Slot 路径。

tab 类型注册继续由 Cordis 生命周期持有。类型插件卸载时，其 occurrence 由 Tab domain 释放；持久化布局仍是浏览器本地状态，与 Session log 分离。每个 Session 的作用域键把自己的持久化值与其他 Session 隔离。

## 曾考虑的替代方案

**保留单个活动 View id，由产品插件持有嵌套 tab。**否决：每个产品都会重复实现排序、关闭后选择、可访问性、持久化和失败隔离，官方栏也无法协调这些 tab。

**把 Workbench tab 持久化到 Session log 或 Host domain。**否决：tab 是本地展示状态。写入日志会把单个浏览器的布局混入持久对话，Host domain 则会重复 Client store 框架已经拥有的 Session scope。

**挂载所有非活动 View 并隐藏。**否决：文件、浏览器和文档 viewer 可能持有大资源和后台工作。Workbench 只挂载活动 View；每个 View 在激活时恢复轻量展示状态。

**在同一变更中增加终端或侧边对话产品概念。**否决：这些能力有独立的执行归属。通用 Sidebar 可以分栏或悬浮 tab，但不会因此持有任何一种产品概念。

## 后果

Session 可以在导航和应用重启之间保留自己的 DockKit surface，而不复制 conversation 或资源内容。产品插件用稳定 content id 寻址 resource tab，并在挂载时重新校验实时资源。切换 Session 会原子替换整个 surface。该设计有意不做跨浏览器同步，也不保留未激活 tab 的组件挂载状态或进行中的工作；tab 类型在激活时重新获取实时资源。

## 测试

Store 测试覆盖 Session 作用域持久化、布局操作、排序、关闭后选择和引导页收敛。Controller 测试覆盖 Session 切换、focus 生命周期、layout 可见性和注册协调。组件测试覆盖 tab 激活、关闭、排序、键盘导航、菜单和 tab 隔离。组装后的 Web 构建与浏览器场景验证共享 Slot 与 layout 路径。

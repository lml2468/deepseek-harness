# Agent Note: Chat Workspace 路径打开器

Status: implemented

[English](2026-09-08-chat-workspace-path-opener.md) | 中文

## Problem

Chat 自有的文件链接始终调用原生 Workspace 路径打开器。已经在 Session Workbench 内渲染 Workspace 文件的产品，若不替换 Chat 或拦截 DOM，就无法让 Assistant 正文链接和产物行复用该查看器。

## Decision

Chat 现在会先把用户选择的原始路径、其 Session id 和当前 Workspace 根目录交给通过 Chat 自有 `conversationDetails.registerWorkspacePathOpener()` Seam 注册的处理器，再决定是否调用原生打开器。同时提供原始路径和根目录，使产品能够安全地把工具产生的绝对路径规范化为 Workspace 相对资源标识。处理器完成请求后返回 `true`，需要 Chat 保留原生打开行为时返回 `false`。处理器拒绝的请求仍是文件打开失败，不会静默启动系统应用。

该 Seam 不包含产品概念，也不持有查看器或文件内容。依赖它的产品插件在同一个 Workbench 控制器上注册并释放唯一处理器，并继续通过 `conversationDetails.openTabFor()` 寻址自己的 Session 级 View，从而避免让 Chat 反向查找稍后挂载的兄弟插件服务。没有已注册处理器时，Chat 保持原有原生行为。

## Alternatives considered

**在每个产品中替换产物渲染器。** 否决，因为 Assistant 正文链接与产物 Chip 共用 Chat 打开器，复制任一渲染器都会分叉官方投影和无障碍行为。

**通过 DOM 选择器拦截点击。** 否决，因为选择器不是公开组合边界，官方标记变化后就会失效。

**始终在内置 Workbench 中打开文件。** 否决，因为 DSH 不拥有通用文件预览 View，产品也可能更适合使用原生应用或其他查看器。

## Consequences

产品无需复制 Chat 状态或 UI，即可让文件链接在自己的 Session Workbench 内导航。原生文件夹打开行为及未提供服务的部署保持不变。产品处理器必须对不归自己处理的请求明确返回 `false`，并通过拒绝请求暴露自身失败。

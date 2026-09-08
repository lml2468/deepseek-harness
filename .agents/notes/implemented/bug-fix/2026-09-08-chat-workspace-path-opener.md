# Agent Note: Chat Workspace path opener

Status: implemented

English | [中文](2026-09-08-chat-workspace-path-opener.zh.md)

## Problem

Chat-owned file links always invoked the native Workspace-path opener. A product that already rendered Workspace files inside the Session Workbench could not reuse that viewer for links in Assistant prose or the produced-files row without replacing Chat or intercepting the DOM.

## Decision

Chat now offers each selected path, its Session id, and the current Workspace root to the handler registered through the Chat-owned `conversationDetails.registerWorkspacePathOpener()` seam before invoking the native opener. Supplying both path values lets a product safely normalize absolute tool arguments into its Workspace-relative resource identity. The handler returns `true` when it handled the request and `false` when Chat should preserve native opening. A rejected handler request remains a file-open failure and does not silently launch a system application.

The seam is product-neutral and owns no viewer or file contents. A dependent product plugin registers and disposes one handler on the same Workbench controller that it already uses to address its Session-scoped View through `conversationDetails.openTabFor()`. This avoids asking Chat to discover a later sibling service. Without a registered handler, Chat retains its previous native behavior.

## Alternatives considered

**Replace the deliverables renderer in each product.** Rejected because Assistant prose links and produced-file chips share Chat's opener, and duplicating either renderer would fork official projection and accessibility behavior.

**Intercept clicks through DOM selectors.** Rejected because selectors are not a public composition boundary and would fail when official markup changes.

**Always open files in the built-in Workbench.** Rejected because DSH does not own a general file preview View, and products may prefer native applications or other viewers.

## Consequences

Products can keep file-link navigation inside their Session Workbench without copying Chat state or UI. Native folder opening and deployments without a provider remain unchanged. A product handler must deliberately return `false` for requests it does not own and must surface its own failures by rejecting.

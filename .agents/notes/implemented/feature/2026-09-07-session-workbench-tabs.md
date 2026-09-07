# Agent Note: Session Workbench tabs

Status: implemented

English | [中文](2026-09-07-session-workbench-tabs.zh.md)

## Problem

The Conversation details column could display only one registered View at a time. Opening another View replaced the current selection, so users could not retain several product pages or multiple resources while working in one Session. A product plugin that implemented its own tabs would split navigation state from the layout-owned column and duplicate persistence and keyboard behavior.

## Decision

`ui-chat` owns one persisted Workbench store per Session. The store records a version-one list of tabs and the active tab id under `dsh.conversation.workbench.v1`; each tab contains only its id, registered View id, title, closable flag, and JSON presentation state. The store does not contain Session data, Workspace data, resource contents, loading state, errors, scroll positions, or process-local focus requests.

The Conversation details controller is the sole mutation interface. `open(viewId)` addresses a singleton tab by View id, while `openTab(tab)` accepts a caller-addressed tab for resource instances. Both operations deduplicate by tab id, activate the result, and open the layout-owned column. The controller also activates, updates, reorders, and closes tabs. Closing the column preserves the store; closing the final tab closes the column. Closing an active tab selects its left neighbor before its right neighbor.

The details panel renders a semantic tab list, overflow and add menus, drag reordering, keyboard navigation, per-tab close actions, and one error boundary around the active View. Only the active View is mounted. A View receives its immutable tab descriptor, an active flag, a process-local focus request, a JSON-state updater, a close action, and a focus acknowledgement. The built-in Tool details View uses the same singleton path as contributed Views.

View registration remains lifecycle-owned by Cordis. When a View plugin unloads, the controller removes every tab that references that View and persists the cleaned result. Persisted input is decoded at the local-storage boundary; malformed state resets only that Session's Workbench presentation state.

## Alternatives considered

**Keep a single active View id and let product plugins own nested tabs.** Rejected because each product would duplicate ordering, close selection, accessibility, persistence, and failure isolation, while the official column could not coordinate those tabs.

**Persist Workbench tabs in the Session log or a Host domain.** Rejected because tabs are local presentation state. Logging them would mix one browser's layout with the durable conversation, and a Host domain would duplicate the Session scope already owned by the Client store framework.

**Mount every inactive View and hide it.** Rejected because file, browser, and document viewers may retain large resources and background work. The Workbench mounts only the active View; each View restores its lightweight presentation state when activated.

**Add terminal, side-chat, split-pane, or floating-window concepts to the same change.** Rejected because those capabilities have independent execution and layout ownership. The Workbench provides only a single right-hand tabbed column.

## Consequences

A Session can retain several product and resource tabs across navigation and application restart without copying conversation or resource contents. Product plugins address resource tabs with stable ids and revalidate live resources when mounted. Switching Sessions changes the entire tab set atomically. The design intentionally gives up preserving mounted component state, in-flight View requests, and resource leases for inactive tabs; Views store only JSON presentation choices and reacquire live resources when active.

## Testing

Store tests cover decode, Session isolation, deduplication, state updates, ordering, close selection, and View removal. Controller tests cover Session switching, focus lifetime, layout visibility, and registration reconciliation. Component tests cover tab activation, closing, reordering, keyboard navigation, menus, and View-level error isolation. The assembled Web build and browser scenarios verify the shared Slot and layout path.

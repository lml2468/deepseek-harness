# Agent Note: Session Workbench tabs

Status: implemented

English | [中文](2026-09-07-session-workbench-tabs.zh.md)

## Problem

The Conversation details column could display only one registered View at a time. Opening another View replaced the current selection, so users could not retain several product pages or multiple resources while working in one Session. A product plugin that implemented its own tabs would split navigation state from the layout-owned column and duplicate persistence and keyboard behavior.

## Decision

`ui-sidebar-right` owns one persisted Workbench surface per Session. The Slot runtime gives each Session its own store instance under `dsh.conversation.workbench.v1`; that instance records the DockKit layout, operation history and id counter. Tab records contain only navigation identity and presentation metadata. The store does not contain Session data, Workspace data, resource contents, loading state, errors, scroll positions, or process-local navigation requests.

`ctx.sidebarRight` is the public mutation interface. `openTab(kind)` opens a page type, while `openResource(address)` resolves a resource type through the tab registry. Both operations deduplicate by `(kind, contentId)`, activate the result and open the layout-owned column. DockKit actions focus, move, split, float, dock and close tabs as recorded layout operations. Closing the column preserves the store; closing the last tab reseeds the guide rather than leaving an empty pane.

The right Sidebar renders semantic tab lists, add controls, drag reordering, keyboard navigation and per-tab close actions across its docked panes and floating panels. Only active tab bodies mount. A tab type receives its occurrence through `useTabInfo()`, while its own Slot store owns any lightweight presentation state. Built-in and contributed tab types use the same registry and keyed Slot path.

Tab-type registration remains lifecycle-owned by Cordis. When a type plugin unloads, its occurrences are released through the Tab domain while the persisted layout remains browser-local and separate from the Session log. Each Session's scope key isolates its persisted value from every other Session.

## Alternatives considered

**Keep a single active View id and let product plugins own nested tabs.** Rejected because each product would duplicate ordering, close selection, accessibility, persistence, and failure isolation, while the official column could not coordinate those tabs.

**Persist Workbench tabs in the Session log or a Host domain.** Rejected because tabs are local presentation state. Logging them would mix one browser's layout with the durable conversation, and a Host domain would duplicate the Session scope already owned by the Client store framework.

**Mount every inactive View and hide it.** Rejected because file, browser, and document viewers may retain large resources and background work. The Workbench mounts only the active View; each View restores its lightweight presentation state when activated.

**Add terminal or side-chat product concepts to the same change.** Rejected because those capabilities have independent execution ownership. The generic Sidebar may split or float tabs without acquiring either product concept.

## Consequences

A Session retains its DockKit surface across navigation and application restart without copying conversation or resource contents. Product plugins address resource tabs with stable content ids and revalidate live resources when mounted. Switching Sessions changes the entire surface atomically. The design intentionally gives up cross-browser synchronization and preserving mounted component state or in-flight work for inactive tabs; tab types reacquire live resources when active.

## Testing

Store tests cover Session-scoped persistence, layout operations, ordering, close selection and guide settlement. Controller tests cover Session switching, focus lifetime, layout visibility and registration reconciliation. Component tests cover tab activation, closing, reordering, keyboard navigation, menus and tab isolation. The assembled Web build and browser scenarios verify the shared Slot and layout path.

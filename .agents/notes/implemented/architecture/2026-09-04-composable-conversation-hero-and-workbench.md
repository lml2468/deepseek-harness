# Agent Note: Composable conversation Hero and Workbench

Status: implemented

English | [中文](2026-09-04-composable-conversation-hero-and-workbench.zh.md)

## Problem

Product compositions needed to place their own heading and discovery content around the resident New Session composer, and to add Session-specific inspection views beside the conversation. The available slots forced product content into the execution-state dock or into a replacement center view. Those placements either duplicated the Hero hierarchy or displaced the official Conversation, while a copied shell would duplicate Session, input, and panel state.

## Decision

`ui-conversation` keeps one resident composer and exposes presentation-only Hero slots. `conversation.hero.header` replaces the default heading, `conversation.hero.content` orders product discovery content before the composer, `conversation.hero.footer` orders supporting content after the DSH context controls, and `conversation.hero.layout` may arrange the already-constructed header, controls, content, composer, and footer nodes. The default layout groups the composer with its context controls and places the group after discovery content. The layout owner receives current Session and input snapshots but no mutation authority. No-Session, blank-Session, loading, and failed creation states retain the same composer component identity.

The `ComposerMenuActionRegistry` is a root service that orders capability entry points for the resident `+` menu. An entry supplies its label, icon, availability, and invocation callback; the registry owns no capability state. Image attachment, reference, and command plugins register their existing actions through this service. Persistent selections such as permission, model, and product connection state remain independent composer controls.

`ui-chat` declares the Session-scoped `conversation.details.view` list and provides `ctx.conversationDetails`. The controller addresses the current mounted Session, validates registered view ids, opens the layout-owned details column, and carries an optional one-shot focus string in the Session-scoped Chat store. The official Tool inspector is the built-in `tool` view. Removing an active view selects the first remaining view or closes the column when none remain; switching Sessions continues to close details through `ui-layout`.

Terminal Turn failures expose the ordered `conversation.turn.error.actions` slot beside the official error action. Registrants can add recovery entry points without replacing the error renderer or changing retry and stop behavior.

The Session-scoped `conversation.chat.turnHeader` single slot renders once from the Turn process anchor before the Assistant response. It exposes the authoritative `TurnLocation` so a product can present its Agent identity and completion state without replacing Chat nodes or mirroring Session lifecycle data.

The shared theme defines semantic geometry variables for spacing, control height, radius, and content width. Existing primitives consume them where the value is common. `Modal` traps Tab navigation, closes on Escape, preserves an explicit safe autofocus target, and restores its connected opener when it unmounts.

The default Hero uses a two-layer composer surface: a quiet gray 20px-radius shell owns the context row, and a 16px-radius input card sits inside it with a visible inset. Workspace, preset, permission, and model triggers use 8px rounded-rectangle geometry. These values define the default DSH presentation; product slot content remains responsible for its own controls.

## Alternatives considered

**A product-owned Conversation renderer.** Rejected because it would duplicate DSH Session, Workspace, composer, approval, and tool state and would drift from the official execution lifecycle.

**DOM queries, private selectors, or runtime patches.** Rejected because they depend on implementation details outside the plugin contract and cannot unload safely.

**Product concepts in DSH.** Rejected because Assistant, Expert, Project, Connector, and product branding belong to the consuming composition; DSH exports only generic layout and action entry points.

**A general presentation framework.** Rejected because the current reuse is limited to Hero composition, composer actions, Workbench views, error actions, and shared geometry. Existing Slots, stores, and primitives already provide the required lifecycle.

## Consequences

- Product plugins can compose the New Session hierarchy, Turn identity header, and right-hand inspection views without rebuilding or mirroring DSH state.
- Slot registrations and menu entries remain effect-owned and disappear on plugin unload; duplicate action ids and unknown Workbench view ids fail explicitly.
- The Workbench controller is presentation state only. Durable tool data, Session history, panel geometry, and execution behavior remain with their existing DSH owners.
- Package tests cover registration order, disabled and failed menu actions, focus restoration, Session-local view state, view removal, modal focus, and default fallback rendering. Assembled browser tests remain responsible for geometry and screenshot evidence.

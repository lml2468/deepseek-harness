# Agent Note: Shared structural scaffold for settings pages

Status: implemented

English | [中文](2026-09-10-settings-structural-scaffold.zh.md)

## Problem

The Settings shell owns navigation and the content viewport, but it previously rendered the active title only for General. Every other feature section therefore had to decide whether to render a title, description, group heading, card, row, and state frame. Sharing theme tokens did not make those independent DOM structures equivalent: title baselines, content starts, borders, spacing, and loading or error states drifted between otherwise peer settings pages.

The earlier [shared client control primitives](2026-09-05-shared-client-control-primitives.md) decision rejected a behaviour-bearing `SettingsCard` abstraction because the three DSH cards under review were selectable, collapsible, and read-only products with different semantics. That evidence still governs behaviour. It does not cover a presentation-only scaffold now required by both DSH and external product plugins.

## Decision

The Settings shell renders the active `settings.section` label as the content title for every section. A section never renders a second page title.

`@deepseek-ai/dsh-client-ui-primitives` exports seven Cordis-free structural components: `SettingsSection`, `SettingsGroup`, `SettingsCard`, `SettingsRow`, `SettingsState`, `SettingsTabs`, and `SettingsTabPanel`. They own only layout, typography, borders, spacing, responsive stacking, tab keyboard navigation, and stable data markers. They own no settings state, copy, page navigation, persistence, validation, or feature behaviour. All visible text and ARIA names remain supplied by the feature plugin.

The scaffold defines one legal hierarchy for ordinary settings content: a `SettingsSection` renders its optional description, then its optional `navigation`, then `SettingsGroup` elements; a group contains a `SettingsCard`; rows and states render inside that surface. `SettingsCard` has three padding modes because row lists, free-form content, and already-inset specialized editors have different content boxes, while sharing the same border, radius, and surface. This is a presentation variant, not a behaviour variant.

The General, Models, Plugins, and Agent Presets sections use the scaffold themselves, so first-party and external sections consume the same source rather than copying section stylesheets. General contributions that belong together publish the same localized group label, which keeps the group heading before all of its rows. Plugins also uses the shared tab strip and panels. Specialized settings editors may keep feature-owned controls and local internal layout, but their page title and outer section/group/surface hierarchy remain shared.

## Alternatives considered

**Keep the shell special case and document matching CSS.** Rejected. The active label already exists in the shell's section directory, while feature pages can omit, duplicate, or misalign it. Documentation cannot make two independently authored element trees identical.

**Put the scaffold in `ui-settings-general`.** Rejected. Feature plugins may not runtime-import another feature plugin. `ui-primitives` is the only static browser-safe owner shared by all settings features.

**Make one stateful universal Settings card.** Rejected for the reasons in the earlier control-primitives note. Selection, disclosure, saving, validation, and remote mutations remain feature-owned. The new `SettingsCard` is deliberately a layout surface only.

**Encode the whole page in one highly configurable component.** Rejected. A large schema of optional title, toolbar, tabs, form fields, cards, and states would hide semantic HTML and make specialized editors harder to compose. Seven narrow structural components express the actual repeated boundaries.

## Testing

Component tests pin the scaffold hierarchy, owner-supplied copy and semantics, padding variants, state tones, tab keyboard navigation, and tab-panel relationships. Settings shell tests assert that navigation changes the single shell-owned title for every section. General tests pin common group membership and heading order. General, Models, Plugins, and Agent Presets browser scenarios assert that each built-in page enters through the shared scaffold without rendering another page title.

## Consequences

Settings pages now share structure rather than merely variables. External product plugins gain a supported public seam for matching first-party pages without importing a feature package or copying its CSS.

The public primitive surface grows by seven components. Their intentionally narrow contract means feature-specific card behaviour still requires local components. A product that wants structural enforcement must lint its own settings registrations; DSH cannot statically inspect third-party JSX.

# Agent Note: Right Sidebar chrome geometry

Status: implemented

English | [中文](2026-09-09-right-sidebar-chrome-geometry.zh.md)

## Problem

The right Sidebar first opened at 45% of the frame, which dominated the conversation at common desktop widths. Opening it also replaced the conversation-header toggle with an empty 68px placeholder, leaving a visible dead region. The conversation header and the Sidebar tab strip used different height and border mechanisms, so their shared edge did not align.

## Decision

The first-open right-column preference is 35% of the measured frame, still clamped to the existing 300px floor and 70% ceiling. A previously dragged pixel preference remains authoritative across close, reopen, and resize.

The conversation-header control remains mounted in both panel states. Its accessible name changes between expand and collapse, and one toggle action updates the session-scoped Sidebar state. Its fixed 68px by 32px footprint keeps adjacent header utilities stable without rendering an empty placeholder.

The conversation header and Sidebar tab strip both use an explicit 56px border-box height and the same 0.5px `border-l3` bottom border. Each component retains its own content padding and controls; only the shared outer geometry is unified.

## Alternatives considered

**Keep the 45% default and rely on resizing.** Rejected because the first-open experience is itself product behavior, while a user's explicit pixel preference already remains available after resizing.

**Keep the empty placeholder and collapse only from the panel.** Rejected because the header advertises a stable panel location but removes its action precisely when the panel is visible.

**Align the headers with independent pseudo-elements.** Rejected because one border declaration on each 56px border box is simpler and avoids subpixel offsets from different positioning mechanisms.

## Consequences

New right panels open at a quieter desktop proportion without changing stored user choices. The conversation header always exposes one panel toggle, and the two column headers share the same bottom coordinate and divider token. Focused layout and toggle tests pin the new default and both control states; assembled UI checks compare rendered geometry at supported desktop widths.

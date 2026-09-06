# Agent Note: Task-first desktop presentation defaults

Status: implemented

English | [中文](2026-09-05-task-first-desktop-presentation.zh.md)

## Problem

The default Web UI exposed runtime bookkeeping with the same visual weight as user intent and task output. Compact transcripts still led with System and Context rows, active-Conversation composers collapsed to a single text line, terminal failures printed provider diagnostics inline, and contributed Settings pages inherited indistinguishable gear icons. Product shells could replace major layout slots, but these defaults still made a composed desktop application read as an assembly of developer controls rather than one continuous task surface.

## Decision

Compact transcript mode keeps System and closed Context rows mounted but removes them from the default reading flow. Expanding a Turn's process disclosure reveals its Context rows; Normal and Trajectory remain the inspection surfaces for complete prompt metadata.

The resident composer reserves a task-sized writing area in active Conversations as well as the larger Hero variant. It keeps the same Lexical editor, draft, Queue, approval, and submission ownership; only the presentation minimum changes.

Terminal Turn errors lead with a localized recovery-oriented summary. Their durable provider message and error code remain available in a collapsed technical-details disclosure, and registered product actions retain their existing seat below the message.

Settings navigation pairs each localized section label with a restrained glyph. Built-in sections use their established semantic glyphs; optional keyed group-heading and icon slots let a product decorate its own section ids without exposing product concepts in the shell. Sections without an icon contribution receive the neutral Settings glyph. General-setting registrations provide a localized group label; the shell projects those entries into titled, independent cards while each feature retains ownership of its row and behavior.

The Conversation header uses one compact row. Alternate Conversation Views move behind a history control, additive Session actions move behind one overflow control, and Chat contributes one Workbench launcher for all registered right-hand Views. The Workbench itself presents one current View and a selector menu instead of a horizontal tab strip. Product Views remain discoverable without adding one header button or tab per View.

## Alternatives considered

**Let every product override these surfaces.** Rejected because the affected rows belong to official Session, Composer, error, and Settings presentation. Reimplementing them in each product would duplicate stateful UI or require private selectors.

**Hide prompt metadata or provider diagnostics permanently.** Rejected because they are required for inspection and support. The change lowers their default prominence without deleting durable facts.

**Add a product-specific icon registry to the settings shell.** Rejected because the shell has no product vocabulary. Keyed presentation slots provide the required composition without a mutable registry or product ids in dsh.

## Consequences

The shipped defaults favor a continuous task-reading flow while preserving the same runtime and state owners. Compact mode is intentionally less diagnostic than Normal and Trajectory. Active composers occupy more vertical space, terminal errors require one disclosure gesture to inspect raw provider text, the Conversation header exposes fewer implementation controls, and Settings pages use grouped cards and consistent navigation glyphs. CSS and component tests pin these presentation choices; products still compose brand and domain content only through public slots.

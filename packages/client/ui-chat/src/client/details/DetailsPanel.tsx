import { Fragment, useState } from 'react'
import {
  CodeBlock, IconChevronDownOutline14, IconCloseOutline16, IconPanelLeftOutline16, Menu, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { shallowEqual } from '@deepseek-ai/dsh-client-store'
import type {
  DetailsLauncherProps, DetailsSlotProps, ToolDetailsViewProps,
} from '../contract/slots.ts'
import type { ChatSnapshot, RunningToolCall, ToolCallBlock, ToolResultNode } from '../contract/snapshot.ts'
import { findToolCall } from './tool-node-reader.ts'
import css from './DetailsPanel.module.css'

export type DetailsPanelProps = DetailsSlotProps

/**
 * Opens the current Session's Workbench without exposing View-specific actions in the header.
 * @param props - Workbench roster, open callback, and localized labels.
 * @returns the launcher button, or nothing when no Workbench View is registered.
 */
export function DetailsLauncher({ useDetailsViews, openDetails, t }: DetailsLauncherProps) {
  const views = useDetailsViews(value => value)
  if (views.length === 0) return null
  return (
    <Tooltip label={() => t('details.open')} side="bottom">
      <button
        type="button"
        className={css.launcher}
        aria-label={t('details.open')}
        onClick={openDetails}
      >
        <IconPanelLeftOutline16 size={16} />
      </button>
    </Tooltip>
  )
}

/** The snapshot-owned block reference must remain stable across unrelated frames. */
interface CallMaterial {
  name: string
  argsRaw: string | null
  block: ToolCallBlock
}

function settledMaterial(node: ToolResultNode, callId: string): CallMaterial {
  return { name: node.call?.name ?? callId, argsRaw: node.call?.argsRaw ?? null, block: node }
}

function runningMaterial(call: RunningToolCall): CallMaterial {
  return { name: call.name, argsRaw: call.argsRaw, block: call }
}

function materialFor(s: ChatSnapshot, callId: string): CallMaterial | null {
  const found = findToolCall(s, callId)
  if (found === undefined) return null
  return 'kind' in found ? settledMaterial(found, callId) : runningMaterial(found)
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

/** Flatten a settled result for the no-ui-tool fallback. */
function rawResultText(block: ToolCallBlock): string {
  if (!('kind' in block)) return ''
  const parts = block.content.map(item => item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  if (parts.length === 0 && block.error !== undefined) parts.push(`${block.error.name}: ${block.error.code}`)
  return parts.join('\n')
}

export function DetailsPanel({
  useStore, renderSlot, closeDetails, completeDetailsFocus, useDetailsViews, selectDetailsView, t,
}: DetailsPanelProps) {
  const views = useDetailsViews(value => value)
  const selected = useStore(s => s.detailsView)
  const focus = useStore(s => s.detailsFocus)
  const active = views.find(view => view.id === selected) ?? views.at(0)
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className={css.root}>
      <div className={css.header}>
        {views.length > 1
          ? (
            <Menu
              open={menuOpen}
              onClose={() => { setMenuOpen(false) }}
              items={views.map(view => ({ id: view.id, label: view.label }))}
              selectedId={active?.id}
              onSelect={(viewId) => {
                setMenuOpen(false)
                selectDetailsView(viewId)
              }}
              compact
              portal
              anchor={(
                <button
                  type="button"
                  className={css.viewSelector}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => { setMenuOpen(open => !open) }}
                >
                  <span>{active?.label ?? t('details.title')}</span>
                  <IconChevronDownOutline14 size={14} />
                </button>
              )}
            />
          )
          : <div className={css.title}>{active?.label ?? t('details.title')}</div>}
        <button
          type="button" className={css.close} aria-label={t('details.close')}
          onClick={() => { closeDetails() }}
        >
          <IconCloseOutline16 size={14} />
        </button>
      </div>
      <div className={css.body}>
        {active === undefined
          ? <div className={css.empty}>{t('details.empty')}</div>
          : renderSlot('conversation.details.view', { focus, completeFocus: completeDetailsFocus }, { only: active.id })}
      </div>
    </div>
  )
}

/** Built-in Tool View rendered through the generic Workbench seat. */
export function ToolDetailsView({
  useChat, useSessions, sessionId, useStore, renderSlot, t,
}: ToolDetailsViewProps) {
  const selection = useStore(s => s.selection)
  // Session workspace root: a card model resolves omitted or relative
  // tool paths against it without reading Session services.
  const sessionCwd = useSessions(list => list.byId[sessionId]?.cwd)
  const callId = selection?.callId
  // materialFor builds a fresh wrapper; shallowEqual short-circuits on its
  // stable members (result node reference rides the snapshot's structural sharing).
  const material = useChat(
    s => (callId === undefined ? null : materialFor(s, callId)),
    (a, b) => shallowEqual(a, b))
  return (
    <>
      {selection === null || callId === undefined
        ? <div className={css.empty}>{t('details.empty')}</div>
        : material === null
          ? <div className={css.empty}>{t('details.notInWindow')}</div>
          : (
            <>
              {material.argsRaw !== null && (
                <section className={css.section}>
                  <div className={css.sectionLabel}>{t('details.input')}</div>
                  <CodeBlock code={pretty(material.argsRaw)} lang="json" copyLabel={t('copy')} copiedLabel={t('copied')} />
                </section>
              )}
              <section className={css.section}>
                <div className={css.sectionLabel}>{t('details.output')}</div>
                {/* Keyed by the selected call: the body owns per-call view
                    state (the terminal card's expand and copy), which React
                    would otherwise carry into the next selection because the
                    panel does not unmount between calls. */}
                <Fragment key={callId}>
                  {renderSlot('conversation.details.tool', { block: material.block, cwd: sessionCwd }, {
                    fallback: 'kind' in material.block
                      ? (
                        <pre className={css.code} data-error={material.block.isError || undefined}>
                          {rawResultText(material.block)}
                        </pre>
                      )
                      : <div className={css.empty}>{t('details.running')}</div>,
                  })}
                </Fragment>
              </section>
            </>
          )}
    </>
  )
}

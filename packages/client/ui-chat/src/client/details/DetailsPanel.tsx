import {
  Component, Fragment, useRef, useState, useSyncExternalStore,
  type DragEvent, type ErrorInfo, type KeyboardEvent, type ReactNode,
} from 'react'
import {
  CodeBlock, IconChevronDownOutline14, IconCloseOutline16, IconPanelLeftOutline16,
  IconPlusOutline16, Menu, Tooltip,
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
  if (!views.some(view => view.launchable)) return null
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

interface ViewErrorBoundaryProps {
  readonly children: ReactNode
  readonly close: () => void
  readonly closeLabel: string
  readonly errorLabel: string
  readonly retryLabel: string
}

interface ViewErrorBoundaryState {
  readonly error: Error | null
}

/** Isolate a failing contributed View from the Workbench host and sibling tabs. */
class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  override state: ViewErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('conversation details View failed:', error, info)
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children
    return (
      <div className={css.viewError} role="alert">
        <strong>{this.props.errorLabel}</strong>
        <p>{this.state.error.message}</p>
        <div className={css.viewErrorActions}>
          <button type="button" onClick={() => { this.setState({ error: null }) }}>{this.props.retryLabel}</button>
          <button type="button" onClick={this.props.close}>{this.props.closeLabel}</button>
        </div>
      </div>
    )
  }
}

function tabAfterClose(tabs: readonly { id: string }[], tabId: string): string | undefined {
  const index = tabs.findIndex(tab => tab.id === tabId)
  if (index < 0) return undefined
  return tabs[index - 1]?.id ?? tabs[index + 1]?.id
}

export function DetailsPanel({
  renderSlot, closeDetails, openDetailsView, useDetailsViews, workbench, t,
}: DetailsPanelProps) {
  const views = useDetailsViews(value => value)
  const snapshot = useSyncExternalStore(
    listener => workbench.subscribe(listener),
    () => workbench.getSnapshot(),
    () => workbench.getSnapshot(),
  )
  const active = snapshot.tabs.find(tab => tab.id === snapshot.activeTabId)
  const [addOpen, setAddOpen] = useState(false)
  const [tabsOpen, setTabsOpen] = useState(false)
  const tabRefs = useRef(new Map<string, HTMLDivElement>())

  const focusTab = (tabId: string | undefined) => {
    if (tabId === undefined) return
    queueMicrotask(() => { tabRefs.current.get(tabId)?.focus() })
  }
  const closeTab = (tabId: string) => {
    const next = tabAfterClose(snapshot.tabs, tabId)
    workbench.closeTab(tabId)
    focusTab(next)
  }
  const activateAt = (index: number) => {
    const tab = snapshot.tabs[index]
    if (tab === undefined) return
    workbench.activateTab(tab.id)
    focusTab(tab.id)
  }
  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>, tabId: string) => {
    const index = snapshot.tabs.findIndex(tab => tab.id === tabId)
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      activateAt(index > 0 ? index - 1 : snapshot.tabs.length - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      activateAt(index + 1 < snapshot.tabs.length ? index + 1 : 0)
    } else if (event.key === 'Home') {
      event.preventDefault()
      activateAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      activateAt(snapshot.tabs.length - 1)
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'w') {
      const tab = snapshot.tabs[index]
      if (tab?.closable !== true) return
      event.preventDefault()
      closeTab(tabId)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      workbench.activateTab(tabId)
    }
  }
  const onDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault()
    const tabId = event.dataTransfer.getData('application/x-dsh-workbench-tab')
    if (tabId !== '') workbench.moveTab(tabId, targetIndex)
  }

  return (
    <div className={css.root}>
      <div className={css.header}>
        <div className={css.tabs} role="tablist" aria-label={t('details.tabs')}>
          {snapshot.tabs.map((tab, index) => (
            <div
              key={tab.id}
              ref={(element) => {
                if (element === null) tabRefs.current.delete(tab.id)
                else tabRefs.current.set(tab.id, element)
              }}
              className={css.tab}
              role="tab"
              tabIndex={tab.id === snapshot.activeTabId ? 0 : -1}
              aria-selected={tab.id === snapshot.activeTabId}
              title={tab.title}
              draggable
              onClick={() => { workbench.activateTab(tab.id) }}
              onKeyDown={(event) => { onTabKeyDown(event, tab.id) }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('application/x-dsh-workbench-tab', tab.id)
              }}
              onDragOver={(event) => { event.preventDefault() }}
              onDrop={(event) => { onDrop(event, index) }}
            >
              <span>{tab.title}</span>
              {tab.closable && (
                <button
                  type="button"
                  className={css.tabClose}
                  aria-label={t('details.closeTab', { title: tab.title })}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <IconCloseOutline16 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className={css.headerActions}>
          {snapshot.tabs.length > 1 && (
            <Menu
              open={tabsOpen}
              onClose={() => { setTabsOpen(false) }}
              items={snapshot.tabs.map(tab => ({ id: tab.id, label: tab.title }))}
              selectedId={snapshot.activeTabId ?? undefined}
              onSelect={(tabId) => {
                setTabsOpen(false)
                workbench.activateTab(tabId)
              }}
              compact
              portal
              align="end"
              anchor={(
                <button
                  type="button"
                  className={css.iconButton}
                  aria-label={t('details.allTabs')}
                  aria-expanded={tabsOpen}
                  onClick={() => { setTabsOpen(open => !open) }}
                >
                  <IconChevronDownOutline14 size={14} />
                </button>
              )}
            />
          )}
          <Menu
            open={addOpen}
            onClose={() => { setAddOpen(false) }}
            items={views.filter(view => view.launchable).map(view => ({ id: view.id, label: view.label }))}
            onSelect={(viewId) => {
              setAddOpen(false)
              openDetailsView(viewId)
            }}
            compact
            portal
            align="end"
            anchor={(
              <button
                type="button"
                className={css.iconButton}
                aria-label={t('details.addTab')}
                aria-expanded={addOpen}
                onClick={() => { setAddOpen(open => !open) }}
              >
                <IconPlusOutline16 size={14} />
              </button>
            )}
          />
          <button
            type="button"
            className={css.close}
            aria-label={t('details.close')}
            onClick={closeDetails}
          >
            <IconCloseOutline16 size={14} />
          </button>
        </div>
      </div>
      <div className={css.body}>
        {active === undefined
          ? <div className={css.empty}>{t('details.noTabs')}</div>
          : (
            <ViewErrorBoundary
              key={active.id}
              closeLabel={t('details.closeTab', { title: active.title })}
              errorLabel={t('details.viewError')}
              retryLabel={t('details.retry')}
              close={() => { workbench.closeTab(active.id) }}
            >
              {renderSlot('conversation.details.view', {
                tab: active,
                active: true,
                focus: snapshot.focus,
                updateState: (state) => { workbench.updateTab(active.id, { state }) },
                closeTab: () => { workbench.closeTab(active.id) },
                completeFocus: () => { workbench.completeFocus() },
              }, { only: active.viewId })}
            </ViewErrorBoundary>
          )}
      </div>
    </div>
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

/** Built-in Tool Workbench View rendered through the generic Workbench seat. */
export function ToolDetailsView({
  useChat, useSessions, sessionId, useStore, renderSlot, t,
}: ToolDetailsViewProps) {
  const selection = useStore(s => s.selection)
  const sessionCwd = useSessions(list => list.byId[sessionId]?.cwd)
  const callId = selection?.callId
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

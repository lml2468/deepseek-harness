import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { EngineStoreInstance, ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { isJsonValue } from '@deepseek-ai/dsh-util-values'
import type { DetailsViewTab } from '../contract/slots.ts'
import {
  createConversationWorkbenchStore,
  decodeConversationWorkbenchState,
  type ConversationWorkbenchState,
  type ConversationWorkbenchTab,
} from './workbench-store.ts'

type WorkbenchInstance = EngineStoreInstance<ConversationWorkbenchState, {
  replace: (draft: ConversationWorkbenchState, state: ConversationWorkbenchState) => void
  openTab: (draft: ConversationWorkbenchState, tab: ConversationWorkbenchTab) => void
  activateTab: (draft: ConversationWorkbenchState, tabId: string) => void
  updateTab: (
    draft: ConversationWorkbenchState,
    tabId: string,
    patch: Partial<Pick<ConversationWorkbenchTab, 'title' | 'state'>>,
  ) => void
  moveTab: (draft: ConversationWorkbenchState, tabId: string, targetIndex: number) => void
  closeTab: (draft: ConversationWorkbenchState, tabId: string) => void
  removeViews: (draft: ConversationWorkbenchState, viewIds: readonly string[]) => void
}>

/** Current Session Workbench snapshot plus the process-local focus request. */
export interface ConversationWorkbenchSnapshot extends ConversationWorkbenchState {
  readonly sessionId: SessionId | null
  readonly focus: string | null
}

const EMPTY_SNAPSHOT: ConversationWorkbenchSnapshot = {
  version: 1,
  sessionId: null,
  tabs: [],
  activeTabId: null,
  focus: null,
}

/** Public controller for the current Session's right-hand Workbench. */
export interface IConversationDetailsController extends ObservableSnapshot<ConversationWorkbenchSnapshot> {
  readonly activeViewId: string | null
  /** Open or activate the singleton tab for one registered View. */
  open(viewId: string, focus?: string): void
  /** Open or activate a caller-addressed Workbench tab. */
  openTab(tab: ConversationWorkbenchTab, focus?: string): void
  /** Activate an open tab in the current Session. */
  activateTab(tabId: string): void
  /** Update one open tab's title or JSON presentation state. */
  updateTab(tabId: string, patch: Partial<Pick<ConversationWorkbenchTab, 'title' | 'state'>>): void
  /** Move one open tab to a zero-based position. */
  moveTab(tabId: string, targetIndex: number): void
  /** Close one open tab. */
  closeTab(tabId: string): void
  /** Clear the active View's process-local focus request. */
  completeFocus(): void
  /** Hide the layout-owned Workbench column without destroying its tabs. */
  close(): void
}

interface AttachedDetails {
  readonly store: WorkbenchInstance
  readonly unsubscribe: () => void
}

function sameSnapshot(left: ConversationWorkbenchSnapshot, right: ConversationWorkbenchSnapshot): boolean {
  return left.sessionId === right.sessionId
    && left.tabs === right.tabs
    && left.activeTabId === right.activeTabId
    && left.focus === right.focus
}

function assertTab(tab: ConversationWorkbenchTab): void {
  if (tab.id.length === 0 || tab.viewId.length === 0 || tab.title.length === 0) {
    throw new Error('conversation details: tab id, view id and title are required')
  }
  if (!isJsonValue(tab.state)) throw new Error('conversation details: tab state must be JSON')
}

/** Session-aware controller backed by per-Session persisted Workbench stores. */
export class ConversationDetailsController implements IConversationDetailsController {
  readonly #attached = new Map<SessionId, AttachedDetails>()
  readonly #focus = new Map<SessionId, string | null>()
  readonly #listeners = new Set<() => void>()
  readonly #unsubscribeSessions: () => void
  #snapshot = EMPTY_SNAPSHOT

  constructor(
    private readonly sessions: ISessions,
    private readonly layout: ILayout,
    private readonly views: () => readonly DetailsViewTab[],
    private readonly storeHandle?: ReturnType<typeof createConversationWorkbenchStore>,
  ) {
    this.#unsubscribeSessions = sessions.list.subscribe(this.#publish)
  }

  get activeViewId(): string | null {
    const active = this.#snapshot.tabs.find(tab => tab.id === this.#snapshot.activeTabId)
    return active?.viewId ?? null
  }

  getSnapshot = (): ConversationWorkbenchSnapshot => this.#snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** Attach the framework-created store for one mounted Session scope. */
  attach(sessionId: SessionId, store: WorkbenchInstance): void {
    const previous = this.#attached.get(sessionId)
    if (previous?.store === store) return
    previous?.unsubscribe()
    const unsubscribe = store.subscribe(this.#publish)
    this.#attached.set(sessionId, { store, unsubscribe })
    // Slot stores are created while React renders their Session entry. Defer
    // hydration repair and publication so mounting one Session cannot notify
    // an already-mounted Workbench during another component's render.
    queueMicrotask(() => {
      if (this.#attached.get(sessionId)?.store !== store) return
      const normalized = decodeConversationWorkbenchState(store.getSnapshot())
      const available = new Set(this.views().map(view => view.id))
      const tabs = normalized.tabs.filter(tab => available.has(tab.viewId))
      store.actions.replace({
        version: 1,
        tabs,
        activeTabId: tabs.some(tab => tab.id === normalized.activeTabId)
          ? normalized.activeTabId
          : tabs.at(0)?.id ?? null,
      })
      this.#publish()
    })
  }

  /** Resolve the one store instance shared by controller calls and the Slot renderer. */
  mount(sessionId: SessionId): WorkbenchInstance {
    const attached = this.#attached.get(sessionId)
    if (attached !== undefined) return attached.store
    if (this.storeHandle === undefined) {
      throw new Error(`conversation details: Session "${sessionId}" is not mounted`)
    }
    const store = this.storeHandle.create(sessionId)
    this.attach(sessionId, store)
    return store
  }

  /** Detach a framework-destroyed Session store instance. */
  detach(sessionId: SessionId, store: WorkbenchInstance): void {
    const attached = this.#attached.get(sessionId)
    if (attached?.store !== store) return
    attached.unsubscribe()
    this.#attached.delete(sessionId)
    this.#focus.delete(sessionId)
    this.#publish()
  }

  open(viewId: string, focus?: string): void {
    const view = this.#view(viewId)
    if (!view.launchable) throw new Error(`conversation details: View "${viewId}" is resource-only`)
    this.openTab({ id: viewId, viewId, title: view.label, state: null, closable: true }, focus)
  }

  openTab(tab: ConversationWorkbenchTab, focus?: string): void {
    this.openTabFor(this.#currentSessionId(), tab, focus)
  }

  /** Open a tab for an already-addressed mounted Session callback. */
  openTabFor(sessionId: SessionId, tab: ConversationWorkbenchTab, focus?: string): void {
    assertTab(tab)
    this.#view(tab.viewId)
    const store = this.mount(sessionId)
    const existing = store.getSnapshot().tabs.find(item => item.id === tab.id)
    if (existing !== undefined && existing.viewId !== tab.viewId) {
      throw new Error(`conversation details: tab "${tab.id}" belongs to View "${existing.viewId}"`)
    }
    store.actions.openTab(tab)
    this.#focus.set(sessionId, focus ?? null)
    this.#publish()
    this.layout.openDetails()
  }

  /** Open the singleton View for an already-addressed mounted Session callback. */
  openFor(sessionId: SessionId, viewId: string, focus?: string): void {
    const view = this.#view(viewId)
    if (!view.launchable) throw new Error(`conversation details: View "${viewId}" is resource-only`)
    this.openTabFor(sessionId, {
      id: viewId,
      viewId,
      title: view.label,
      state: null,
      closable: true,
    }, focus)
  }

  activateTab(tabId: string): void {
    const [sessionId, attached] = this.#current()
    attached.store.actions.activateTab(tabId)
    this.#focus.set(sessionId, null)
    this.#publish()
  }

  updateTab(tabId: string, patch: Partial<Pick<ConversationWorkbenchTab, 'title' | 'state'>>): void {
    if (patch.title !== undefined && patch.title.length === 0) {
      throw new Error('conversation details: tab title is required')
    }
    if (patch.state !== undefined && !isJsonValue(patch.state)) {
      throw new Error('conversation details: tab state must be JSON')
    }
    this.#current()[1].store.actions.updateTab(tabId, patch)
  }

  moveTab(tabId: string, targetIndex: number): void {
    if (!Number.isInteger(targetIndex)) throw new Error('conversation details: target index must be an integer')
    this.#current()[1].store.actions.moveTab(tabId, targetIndex)
  }

  closeTab(tabId: string): void {
    const [sessionId, attached] = this.#current()
    attached.store.actions.closeTab(tabId)
    this.#focus.set(sessionId, null)
    if (attached.store.getSnapshot().tabs.length === 0) this.layout.closeDetails()
    this.#publish()
  }

  completeFocus(): void {
    const sessionId = this.sessions.list.getSnapshot().current
    if (sessionId === undefined || this.#focus.get(sessionId) == null) return
    this.#focus.set(sessionId, null)
    this.#publish()
  }

  /** Remove tabs whose View plugin has unloaded. */
  reconcileViews(viewIds: readonly string[]): void {
    const available = new Set(viewIds)
    const currentId = this.sessions.list.getSnapshot().current
    for (const [sessionId, attached] of this.#attached) {
      const removed = [...new Set(attached.store.getSnapshot().tabs
        .map(tab => tab.viewId)
        .filter(viewId => !available.has(viewId)))]
      if (removed.length === 0) continue
      attached.store.actions.removeViews(removed)
      if (attached.store.getSnapshot().tabs.length === 0 && sessionId === currentId) this.layout.closeDetails()
    }
    this.#publish()
  }

  close(): void {
    this.layout.closeDetails()
  }

  /** Release subscriptions owned by the controller service. */
  dispose(): void {
    this.#unsubscribeSessions()
    for (const attached of this.#attached.values()) attached.unsubscribe()
    this.#attached.clear()
    this.#focus.clear()
    this.#listeners.clear()
    this.#snapshot = EMPTY_SNAPSHOT
  }

  #view(viewId: string): DetailsViewTab {
    const view = this.views().find(candidate => candidate.id === viewId)
    if (view === undefined) throw new Error(`conversation details: unknown view "${viewId}"`)
    return view
  }

  #currentSessionId(): SessionId {
    const id = this.sessions.list.getSnapshot().current
    if (id === undefined) throw new Error('conversation details: no current Session')
    return id
  }

  #current(): readonly [SessionId, AttachedDetails] {
    const id = this.#currentSessionId()
    const attached = this.#attached.get(id)
    if (attached === undefined) throw new Error('conversation details: no mounted current Session')
    return [id, attached]
  }

  #publish = (): void => {
    const sessionId = this.sessions.list.getSnapshot().current
    let next = EMPTY_SNAPSHOT
    if (sessionId !== undefined) {
      const state = this.#attached.get(sessionId)?.store.getSnapshot()
      if (state !== undefined) next = {
        version: 1,
        sessionId,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        focus: this.#focus.get(sessionId) ?? null,
      }
    }
    if (sameSnapshot(this.#snapshot, next)) return
    this.#snapshot = next
    for (const listener of [...this.#listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('conversation details subscriber failed:', error)
      }
    }
  }
}

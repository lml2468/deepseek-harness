/** Persisted per-Session presentation state for the Conversation Workbench. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import { isJsonValue, type JsonValue } from '@deepseek-ai/dsh-util-values'

/** One open Workbench tab. `state` contains View-owned JSON presentation state only. */
export interface ConversationWorkbenchTab {
  id: string
  viewId: string
  title: string
  state: JsonValue
  closable: boolean
}

/** Persisted Workbench state scoped by Session id. */
export interface ConversationWorkbenchState {
  version: 1
  tabs: ConversationWorkbenchTab[]
  activeTabId: string | null
}

type WorkbenchActions = {
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
}

function emptyWorkbenchState(): ConversationWorkbenchState {
  return { version: 1, tabs: [], activeTabId: null }
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function decodeTab(value: unknown): ConversationWorkbenchTab | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (!validText(record['id']) || !validText(record['viewId']) || !validText(record['title'])) return undefined
  if (typeof record['closable'] !== 'boolean' || !isJsonValue(record['state'])) return undefined
  return {
    id: record['id'],
    viewId: record['viewId'],
    title: record['title'],
    state: record['state'] as JsonValue,
    closable: record['closable'],
  }
}

/**
 * Decode a durable Workbench value without trusting localStorage input.
 * @param value - hydrated store value.
 * @returns normalized version-one state.
 */
export function decodeConversationWorkbenchState(value: unknown): ConversationWorkbenchState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyWorkbenchState()
  const record = value as Record<string, unknown>
  if (record['version'] !== 1 || !Array.isArray(record['tabs'])) return emptyWorkbenchState()
  const ids = new Set<string>()
  const tabs: ConversationWorkbenchTab[] = []
  for (const candidate of record['tabs']) {
    const tab = decodeTab(candidate)
    if (tab === undefined || ids.has(tab.id)) continue
    ids.add(tab.id)
    tabs.push(tab)
  }
  const active = typeof record['activeTabId'] === 'string' && ids.has(record['activeTabId'])
    ? record['activeTabId']
    : tabs.at(0)?.id ?? null
  return { version: 1, tabs, activeTabId: active }
}

/**
 * Create the persisted per-Session Workbench store handle.
 * @returns a store handle instantiated by the session-scoped Slot renderer.
 */
export function createConversationWorkbenchStore(): EngineStoreHandle<ConversationWorkbenchState, WorkbenchActions> {
  return defineStore({
    init: emptyWorkbenchState,
    persist: 'dsh.conversation.workbench.v1',
    actions: {
      replace: (draft, state) => {
        draft.version = state.version
        draft.tabs = state.tabs
        draft.activeTabId = state.activeTabId
      },
      openTab: (draft, tab) => {
        const existing = draft.tabs.find(item => item.id === tab.id)
        if (existing === undefined) draft.tabs.push(tab)
        draft.activeTabId = tab.id
      },
      activateTab: (draft, tabId) => {
        if (draft.tabs.some(tab => tab.id === tabId)) draft.activeTabId = tabId
      },
      updateTab: (draft, tabId, patch) => {
        const tab = draft.tabs.find(item => item.id === tabId)
        if (tab === undefined) return
        if (patch.title !== undefined) tab.title = patch.title
        if (patch.state !== undefined) tab.state = patch.state
      },
      moveTab: (draft, tabId, targetIndex) => {
        const sourceIndex = draft.tabs.findIndex(tab => tab.id === tabId)
        if (sourceIndex < 0) return
        const [tab] = draft.tabs.splice(sourceIndex, 1)
        if (tab === undefined) return
        const index = Math.max(0, Math.min(targetIndex, draft.tabs.length))
        draft.tabs.splice(index, 0, tab)
      },
      closeTab: (draft, tabId) => {
        const index = draft.tabs.findIndex(tab => tab.id === tabId)
        if (index < 0) return
        const tab = draft.tabs[index]
        if (tab === undefined || !tab.closable) return
        const active = draft.activeTabId === tabId
        draft.tabs.splice(index, 1)
        if (active) draft.activeTabId = draft.tabs[index - 1]?.id ?? draft.tabs[index]?.id ?? null
      },
      removeViews: (draft, viewIds) => {
        const removed = new Set(viewIds)
        const activeIndex = draft.tabs.findIndex(tab => tab.id === draft.activeTabId)
        draft.tabs = draft.tabs.filter(tab => !removed.has(tab.viewId))
        if (draft.activeTabId !== null && !draft.tabs.some(tab => tab.id === draft.activeTabId)) {
          const index = Math.min(Math.max(activeIndex, 0), Math.max(draft.tabs.length - 1, 0))
          draft.activeTabId = draft.tabs[index]?.id ?? null
        }
      },
    },
  })
}

// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  createConversationWorkbenchStore,
  decodeConversationWorkbenchState,
} from '../src/client/details/workbench-store.ts'

beforeEach(() => { localStorage.clear() })

const overview = {
  id: 'overview',
  viewId: 'overview',
  title: 'Overview',
  state: null,
  closable: true,
}

describe('Conversation Workbench store', () => {
  it('opens, deduplicates, reorders and closes tabs', () => {
    const store = createConversationWorkbenchStore().create('session-1')
    store.actions.openTab(overview)
    store.actions.openTab(overview)
    store.actions.openTab({
      id: 'file:/one.md',
      viewId: 'file',
      title: 'one.md',
      state: { path: '/one.md' },
      closable: true,
    })
    expect(store.getSnapshot().tabs.map(tab => tab.id)).toEqual(['overview', 'file:/one.md'])

    store.actions.moveTab('file:/one.md', 0)
    store.actions.updateTab('file:/one.md', { state: { path: '/renamed.md' } })
    expect(store.getSnapshot().tabs[0]).toMatchObject({
      id: 'file:/one.md',
      state: { path: '/renamed.md' },
    })

    store.actions.closeTab('file:/one.md')
    expect(store.getSnapshot().activeTabId).toBe('overview')
  })

  it('persists independently for each Session scope', () => {
    const handle = createConversationWorkbenchStore()
    const first = handle.create('session-1')
    const second = handle.create('session-2')
    first.actions.openTab(overview)

    expect(second.getSnapshot().tabs).toEqual([])
    expect(createConversationWorkbenchStore().create('session-1').getSnapshot().tabs).toEqual([overview])
  })

  it('normalizes malformed and duplicate persisted data', () => {
    expect(decodeConversationWorkbenchState({ version: 2, tabs: [] })).toEqual({
      version: 1,
      tabs: [],
      activeTabId: null,
    })
    expect(decodeConversationWorkbenchState({
      version: 1,
      activeTabId: 'missing',
      tabs: [overview, overview, { id: '', viewId: 'file', title: 'bad', state: null, closable: true }],
    })).toEqual({
      version: 1,
      tabs: [overview],
      activeTabId: 'overview',
    })
  })

  it('keeps non-closable tabs open', () => {
    const store = createConversationWorkbenchStore().create('non-closable')
    store.actions.openTab({ ...overview, closable: false })

    store.actions.closeTab('overview')

    expect(store.getSnapshot()).toMatchObject({
      tabs: [{ id: 'overview', closable: false }],
      activeTabId: 'overview',
    })
  })
})

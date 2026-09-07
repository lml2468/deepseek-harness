import { describe, expect, it, vi } from 'vitest'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ConversationDetailsController } from '../src/client/details/controller.ts'
import { createConversationWorkbenchStore } from '../src/client/details/workbench-store.ts'

const FIRST = 'session-1' as SessionId
const SECOND = 'session-2' as SessionId

function fixture() {
  const list = createSnapshotStore<{ current: SessionId | undefined }>({ current: FIRST })
  const sessions = { list }
  const layout = { openDetails: vi.fn(), closeDetails: vi.fn() }
  let views = [
    { id: 'tool', label: 'Tool', launchable: true },
    { id: 'results', label: 'Results', launchable: true },
    { id: 'file', label: 'File', launchable: false },
  ]
  const controller = new ConversationDetailsController(
    sessions as never,
    layout as never,
    () => views,
  )
  const handle = createConversationWorkbenchStore()
  const first = handle.create()
  const second = handle.create()
  controller.attach(FIRST, first)
  controller.attach(SECOND, second)
  return {
    controller,
    first,
    second,
    layout,
    setCurrent: (value: SessionId | undefined) => { list.set({ current: value }) },
    setViews: (value: typeof views) => { views = value },
  }
}

describe('ConversationDetailsController', () => {
  it('opens singleton and resource tabs only for the addressed Session', () => {
    const f = fixture()
    f.controller.open('results', 'artifact-1')
    f.controller.openTab({
      id: 'file:/one.md',
      viewId: 'file',
      title: 'one.md',
      state: { path: '/one.md' },
      closable: true,
    })

    expect(f.controller.activeViewId).toBe('file')
    expect(f.controller.getSnapshot()).toMatchObject({
      sessionId: FIRST,
      activeTabId: 'file:/one.md',
      focus: null,
    })
    expect(f.first.getSnapshot().tabs.map(tab => tab.id)).toEqual(['results', 'file:/one.md'])
    expect(f.second.getSnapshot().tabs).toEqual([])
    expect(f.layout.openDetails).toHaveBeenCalledTimes(2)

    f.setCurrent(SECOND)
    expect(f.controller.activeViewId).toBeNull()
  })

  it('deduplicates ids and rejects unknown Views or mismatched tab ownership', () => {
    const f = fixture()
    f.controller.open('results')
    f.controller.open('results')
    expect(f.first.getSnapshot().tabs).toHaveLength(1)

    expect(() => { f.controller.open('missing') }).toThrow('unknown view')
    expect(() => { f.controller.open('file') }).toThrow('resource-only')
    expect(() => {
      f.controller.openTab({ id: 'results', viewId: 'tool', title: 'Tool', state: null, closable: true })
    }).toThrow('belongs to View')
    f.setCurrent(undefined)
    expect(() => { f.controller.open('tool') }).toThrow('no current Session')
  })

  it('updates, moves and closes tabs with deterministic neighbour selection', () => {
    const f = fixture()
    f.controller.open('tool')
    f.controller.open('results')
    f.controller.openTab({
      id: 'file:/one.md',
      viewId: 'file',
      title: 'one.md',
      state: { path: '/one.md' },
      closable: true,
    })
    f.controller.updateTab('file:/one.md', { title: 'renamed.md', state: { path: '/renamed.md' } })
    f.controller.moveTab('file:/one.md', 0)
    expect(f.first.getSnapshot().tabs.map(tab => tab.id)).toEqual(['file:/one.md', 'tool', 'results'])

    f.controller.closeTab('file:/one.md')
    expect(f.first.getSnapshot().activeTabId).toBe('tool')
    f.controller.closeTab('tool')
    f.controller.closeTab('results')
    expect(f.first.getSnapshot()).toMatchObject({ tabs: [], activeTabId: null })
    expect(f.layout.closeDetails).toHaveBeenCalledOnce()
  })

  it('hides without destroying tabs and clears process-local focus explicitly', () => {
    const f = fixture()
    f.controller.open('results', 'artifact-1')
    expect(f.controller.getSnapshot().focus).toBe('artifact-1')

    f.controller.close()
    expect(f.first.getSnapshot().tabs).toHaveLength(1)
    expect(f.layout.closeDetails).toHaveBeenCalledOnce()

    f.controller.completeFocus()
    expect(f.controller.getSnapshot().focus).toBeNull()
  })

  it('removes unloaded View tabs across mounted Sessions', () => {
    const f = fixture()
    f.controller.open('results')
    f.controller.openFor(SECOND, 'tool', 'call-2')

    f.setViews([{ id: 'tool', label: 'Tool', launchable: true }])
    f.controller.reconcileViews(['tool'])
    expect(f.first.getSnapshot().tabs).toEqual([])
    expect(f.second.getSnapshot().tabs.map(tab => tab.id)).toEqual(['tool'])
    expect(f.layout.closeDetails).toHaveBeenCalledOnce()
  })

  it('drops persisted tabs for Views absent when a Session store mounts', async () => {
    const list = createSnapshotStore<{ current: SessionId | undefined }>({ current: FIRST })
    const controller = new ConversationDetailsController(
      { list } as never,
      { openDetails: vi.fn(), closeDetails: vi.fn() } as never,
      () => [{ id: 'tool', label: 'Tool', launchable: true }],
    )
    const store = createConversationWorkbenchStore().create()
    store.actions.openTab({
      id: 'removed',
      viewId: 'removed',
      title: 'Removed',
      state: null,
      closable: true,
    })
    store.actions.openTab({ id: 'tool', viewId: 'tool', title: 'Tool', state: null, closable: true })

    controller.attach(FIRST, store)
    await Promise.resolve()

    expect(store.getSnapshot()).toMatchObject({
      tabs: [{ id: 'tool' }],
      activeTabId: 'tool',
    })
  })
})

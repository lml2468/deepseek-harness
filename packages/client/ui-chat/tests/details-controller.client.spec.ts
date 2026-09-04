import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ConversationDetailsController } from '../src/client/details/controller.ts'
import { createChatStore } from '../src/client/stores.ts'

const FIRST = 'session-1' as SessionId
const SECOND = 'session-2' as SessionId

function fixture() {
  let current: SessionId | undefined = FIRST
  const sessions = {
    list: { getSnapshot: () => ({ current }) },
  }
  const layout = { openDetails: vi.fn(), closeDetails: vi.fn() }
  let views = ['tool', 'results']
  const controller = new ConversationDetailsController(
    sessions as never,
    layout as never,
    () => new Set(views),
  )
  const first = createChatStore().create()
  const second = createChatStore().create()
  controller.attach(FIRST, first.actions)
  controller.attach(SECOND, second.actions)
  return {
    controller,
    first,
    second,
    layout,
    setCurrent: (value: SessionId | undefined) => { current = value },
    setViews: (value: string[]) => { views = value },
  }
}

describe('ConversationDetailsController', () => {
  it('opens the selected View only for the current Session', () => {
    const f = fixture()
    f.controller.open('results', 'artifact-1')

    expect(f.controller.activeViewId).toBe('results')
    expect(f.first.store.getSnapshot()).toMatchObject({
      detailsView: 'results',
      detailsFocus: 'artifact-1',
    })
    expect(f.second.store.getSnapshot().detailsView).toBeNull()
    expect(f.layout.openDetails).toHaveBeenCalledOnce()

    f.setCurrent(SECOND)
    expect(f.controller.activeViewId).toBeNull()
  })

  it('rejects unknown Views and missing current Session mounts', () => {
    const f = fixture()
    expect(() => { f.controller.open('missing') }).toThrow('unknown view')
    f.setCurrent(undefined)
    expect(() => { f.controller.open('tool') }).toThrow('no mounted current Session')
  })

  it('clears the current Session selection when the Workbench closes', () => {
    const f = fixture()
    f.controller.open('results', 'artifact-1')

    f.controller.close()

    expect(f.controller.activeViewId).toBeNull()
    expect(f.first.store.getSnapshot()).toMatchObject({ detailsView: null, detailsFocus: null })
    expect(f.layout.closeDetails).toHaveBeenCalledOnce()
  })

  it('falls back when the active View unloads and closes when none remain', () => {
    const f = fixture()
    f.controller.open('results', 'artifact-1')

    f.setViews(['tool'])
    f.controller.reconcileViews(['tool'])
    expect(f.controller.activeViewId).toBe('tool')
    expect(f.first.store.getSnapshot()).toMatchObject({ detailsView: 'tool', detailsFocus: null })

    f.setViews([])
    f.controller.reconcileViews([])
    expect(f.controller.activeViewId).toBeNull()
    expect(f.first.store.getSnapshot()).toMatchObject({ detailsView: null, detailsFocus: null })
    expect(f.layout.closeDetails).toHaveBeenCalledOnce()
  })

  it('opens a Session-addressed View without changing the current Session state', () => {
    const f = fixture()
    f.controller.openFor(SECOND, 'tool', 'call-2')

    expect(f.first.store.getSnapshot().detailsView).toBeNull()
    expect(f.second.store.getSnapshot()).toMatchObject({
      detailsView: 'tool',
      detailsFocus: 'call-2',
    })
  })
})

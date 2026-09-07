// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { DetailsPanelProps } from '../src/client/details/DetailsPanel.tsx'
import { DetailsPanel } from '../src/client/details/DetailsPanel.tsx'
import { createConversationWorkbenchStore } from '../src/client/details/workbench-store.ts'
import { zh } from '../src/client/locale.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

const t = makeTranslate(zh)

function renderPanel(renderSlot?: DetailsPanelProps['renderSlot']) {
  const store = createConversationWorkbenchStore().create('panel-test')
  store.actions.openTab({ id: 'overview', viewId: 'overview', title: 'Overview', state: null, closable: true })
  store.actions.openTab({ id: 'file:/one.md', viewId: 'file', title: 'one.md', state: { path: '/one.md' }, closable: true })
  const source = {
    getSnapshot: () => store.getSnapshot(),
    subscribe: (listener: () => void) => store.subscribe(listener),
  }
  const workbench = {
    ...source,
    activeViewId: 'file',
    open: vi.fn(),
    openTab: vi.fn(),
    activateTab: vi.fn((id: string) => { store.actions.activateTab(id) }),
    updateTab: vi.fn(),
    moveTab: vi.fn((id: string, index: number) => { store.actions.moveTab(id, index) }),
    closeTab: vi.fn((id: string) => { store.actions.closeTab(id) }),
    completeFocus: vi.fn(),
    close: vi.fn(),
  }
  const views = createSnapshotStore([
    { id: 'overview', label: 'Overview', launchable: true },
    { id: 'file', label: 'File', launchable: false },
  ])
  const props = {
    useStore: bindSnapshotSelector(store),
    useDetailsViews: bindSnapshotSelector(views),
    workbench,
    openDetailsView: vi.fn(),
    closeDetails: vi.fn(),
    renderSlot: renderSlot ?? ((_key: string, owner: { tab: { id: string } }, options: { only?: string }) => (
      <div data-testid="active-view">{options.only}:{owner.tab.id}</div>
    )),
    t,
  } as unknown as DetailsPanelProps
  return { ...render(<DetailsPanel {...props} />), store, workbench, props }
}

describe('DetailsPanel', () => {
  it('renders a tablist and activates or closes one tab with neighbouring focus', async () => {
    const view = renderPanel()
    expect(view.getByRole('tablist', { name: zh['details.tabs'] })).toBeTruthy()
    expect(view.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Overview', 'one.md'])
    expect(view.getByTestId('active-view').textContent).toBe('file:file:/one.md')
    expect(view.queryByRole('button', { name: zh['details.allTabs'] })).toBeNull()

    fireEvent.click(view.getByRole('tab', { name: /Overview/u }))
    expect(view.workbench.activateTab).toHaveBeenCalledWith('overview')

    fireEvent.click(view.getByRole('button', { name: '关闭“one.md”' }))
    expect(view.workbench.closeTab).toHaveBeenCalledWith('file:/one.md')
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(view.getByRole('tab', { name: /Overview/u }))
    })
  })

  it('shows the all-tabs menu only while the tab strip overflows', async () => {
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(360)
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(160)
    const view = renderPanel()
    await vi.waitFor(() => {
      expect(view.getByRole('button', { name: zh['details.allTabs'] })).toBeTruthy()
    })
    fireEvent.click(view.getByRole('button', { name: zh['details.allTabs'] }))
    expect(view.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Overview', 'one.md'])
  })

  it('opens registered singleton Views from the add menu', () => {
    const view = renderPanel()
    fireEvent.click(view.getByRole('button', { name: zh['details.addTab'] }))
    fireEvent.click(view.getByRole('menuitem', { name: 'Overview' }))
    expect(view.props.openDetailsView).toHaveBeenCalledWith('overview')
    expect(view.queryByRole('menuitem', { name: 'File' })).toBeNull()
  })

  it('supports roving keyboard activation and reordering', () => {
    const view = renderPanel()
    const active = view.getByRole('tab', { name: /one.md/u })
    fireEvent.keyDown(active, { key: 'ArrowLeft' })
    expect(view.workbench.activateTab).toHaveBeenCalledWith('overview')

    const transfer = new Map<string, string>()
    fireEvent.dragStart(active, {
      dataTransfer: {
        effectAllowed: '',
        setData: (type: string, value: string) => { transfer.set(type, value) },
      },
    })
    expect(active.getAttribute('data-dragging')).toBe('true')
    const target = view.getByRole('tab', { name: /Overview/u })
    fireEvent.dragOver(target, { dataTransfer: {} })
    expect(target.getAttribute('data-drop-target')).toBe('true')
    fireEvent.dragLeave(target, { relatedTarget: document.body })
    expect(target.getAttribute('data-drop-target')).toBeNull()
    fireEvent.dragOver(target, { dataTransfer: {} })
    fireEvent.drop(target, {
      dataTransfer: { getData: (type: string) => transfer.get(type) ?? '' },
    })
    expect(view.workbench.moveTab).toHaveBeenCalledWith('file:/one.md', 0)
    expect(target.getAttribute('data-drop-target')).toBeNull()
  })

  it('isolates a failing tab and retries it without disturbing siblings', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let shouldThrow = true
    function FlakyView() {
      if (shouldThrow) throw new Error('temporary render failure')
      return <div>Recovered file view</div>
    }
    const view = renderPanel(() => <FlakyView />)

    expect(view.getByRole('alert').textContent).toContain('temporary render failure')
    shouldThrow = false
    fireEvent.click(view.getByRole('button', { name: zh['details.retry'] }))
    expect(view.getByText('Recovered file view')).toBeTruthy()
    expect(view.store.getSnapshot().tabs.map(tab => tab.id)).toEqual(['overview', 'file:/one.md'])
    expect(log).toHaveBeenCalled()
  })
})

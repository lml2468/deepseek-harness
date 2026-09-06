// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { DetailsPanelProps } from '../src/client/details/DetailsPanel.tsx'
import { DetailsPanel } from '../src/client/details/DetailsPanel.tsx'
import { createChatStore } from '../src/client/stores.ts'
import { zh } from '../src/client/locale.ts'

afterEach(() => { cleanup() })

const t = makeTranslate(zh)

function renderPanel(labels: readonly string[], selected?: string) {
  const chat = createChatStore().create()
  if (selected !== undefined) chat.actions.openDetailsView(selected)
  const views = labels.map(label => ({ id: label.toLowerCase(), label }))
  const selectDetailsView = vi.fn()
  const props = {
    useStore: bindSnapshotSelector(chat),
    useDetailsViews: bindSnapshotSelector(createSnapshotStore(views)),
    selectDetailsView,
    closeDetails: vi.fn(),
    completeDetailsFocus: vi.fn(),
    renderSlot: (_key: string, _owner: unknown, options: { only?: string }) => (
      <div data-testid="active-view">{options.only}</div>
    ),
    t,
  } as unknown as DetailsPanelProps
  return { ...render(<DetailsPanel {...props} />), selectDetailsView }
}

describe('DetailsPanel', () => {
  it('offers multiple Workbench Views through one current-view menu', () => {
    const view = renderPanel(['Overview', 'Artifacts'], 'artifacts')

    const selector = view.getByRole('button', { name: 'Artifacts' })
    expect(selector.getAttribute('aria-expanded')).toBe('false')
    expect(view.queryByRole('tablist')).toBeNull()
    expect(view.getByTestId('active-view').textContent).toBe('artifacts')

    fireEvent.click(selector)
    expect(selector.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(view.getByRole('menuitem', { name: 'Overview' }))
    expect(view.selectDetailsView).toHaveBeenCalledOnce()
    expect(view.selectDetailsView).toHaveBeenCalledWith('overview')
  })

  it('renders a single View as a non-interactive title', () => {
    const view = renderPanel(['Tool'])

    expect(view.getByText('Tool')).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Tool' })).toBeNull()
    expect(view.queryByRole('menu')).toBeNull()
  })
})

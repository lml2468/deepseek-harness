// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  SettingsCard, SettingsGroup, SettingsRow, SettingsSection, SettingsState, SettingsTabPanel, SettingsTabs,
} from '@deepseek-ai/dsh-client-ui-primitives'

afterEach(cleanup)

describe('settings scaffold', () => {
  it('owns the section, group, card, and row hierarchy without owning copy', () => {
    render(
      <SettingsSection
        description="Section description"
        navigation={<SettingsTabs
          idPrefix="account"
          label="Account views"
          items={[{ id: 'profile', label: 'Profile' }]}
          activeId="profile"
          onSelect={() => undefined}
        />}
      >
        <SettingsGroup title="Account" description="Group description">
          <SettingsCard padding="rows">
            <SettingsRow title="Identity" description="Signed out" action={<button>Sign in</button>} />
          </SettingsCard>
        </SettingsGroup>
      </SettingsSection>,
    )

    const section = screen.getByText('Section description').closest('[data-dsh-settings-section]')
    const group = screen.getByRole('heading', { name: 'Account' }).closest('[data-dsh-settings-group]')
    const card = screen.getByText('Identity').closest('[data-dsh-settings-card]')
    const row = screen.getByText('Identity').closest('[data-dsh-settings-row]')
    expect(section).toBeTruthy()
    expect(section?.children[0]?.textContent).toBe('Section description')
    expect(section?.children[1]?.getAttribute('data-dsh-settings-tabs')).toBe(null)
    expect(section?.children[1]?.querySelector('[data-dsh-settings-tabs]')).toBeTruthy()
    expect(section?.children[2]?.getAttribute('data-dsh-settings-group')).toBe('')
    expect(section?.contains(group)).toBe(true)
    expect(group?.contains(card)).toBe(true)
    expect(card?.contains(row)).toBe(true)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
  })

  it('keeps scaffold-owned semantics when native props contain conflicting values', () => {
    render(
      <SettingsTabs
        idPrefix="account"
        label="Account views"
        items={[{ id: 'profile', label: 'Profile' }]}
        activeId="profile"
        onSelect={() => undefined}
        role="presentation"
        aria-label="Wrong label"
      />,
    )

    const tabs = screen.getByRole('tablist', { name: 'Account views' })
    expect(tabs.getAttribute('data-dsh-settings-tabs')).toBe('')
  })

  it('renders neutral and danger states with owner-supplied semantics', () => {
    const { rerender } = render(
      <SettingsState role="status" title="Loading" description="Please wait" />,
    )
    expect(screen.getByRole('status').getAttribute('data-dsh-settings-state')).toBe('')

    rerender(
      <SettingsState role="alert" tone="danger" title="Failed" action={<button>Retry</button>} />,
    )
    expect(screen.getByRole('alert').textContent).toContain('Failed')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('owns tab geometry, keyboard selection, and panel relationships', () => {
    let active = 'profile'
    const onSelect = (id: string): void => { active = id }
    const { rerender } = render(
      <>
        <SettingsTabs
          idPrefix="account"
          label="Account views"
          items={[{ id: 'profile', label: 'Profile' }, { id: 'security', label: 'Security' }]}
          activeId={active}
          onSelect={onSelect}
        />
        <SettingsTabPanel idPrefix="account" tabId="profile" active>Profile content</SettingsTabPanel>
      </>,
    )
    const profile = screen.getByRole('tab', { name: 'Profile' })
    const security = screen.getByRole('tab', { name: 'Security' })
    expect(profile.getAttribute('aria-controls')).toBe('account-panel-profile')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('account-tab-profile')

    profile.focus()
    fireEvent.keyDown(profile, { key: 'ArrowRight' })
    expect(active).toBe('security')
    expect(document.activeElement).toBe(security)

    rerender(
      <SettingsTabs
        idPrefix="account"
        label="Account views"
        items={[{ id: 'profile', label: 'Profile' }, { id: 'security', label: 'Security' }]}
        activeId={active}
        onSelect={onSelect}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Security' }).getAttribute('aria-selected')).toBe('true')
  })
})

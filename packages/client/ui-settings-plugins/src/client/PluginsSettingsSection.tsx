/** Plugins settings section: localized tabs around feature-owned pages. */

import { useEffect, useId, useState } from 'react'
import type {
  HostObservable, InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import {
  SettingsCard, SettingsGroup, SettingsSection, SettingsState, SettingsTabPanel, SettingsTabs,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PluginsSettingsLocaleKey } from './locales.ts'

/** One tab projected from a `settings.plugins.tab` contribution. */
export interface PluginsSettingsTabEntry {
  id: string
  order: number
  label: string
}

/** Registration-side business face for the section. */
export interface PluginsSettingsSectionInjected {
  hooks: {
    /** Ordered, locale-aware projection of the Plugins tab ledger. */
    tabs: HostObservable<readonly PluginsSettingsTabEntry[]>
  }
}

/** Props the renderer binds for the section. */
export type PluginsSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.plugins'>
  & PropsRenderSlots<'settings.plugins.tab'>
  & InjectFace<PluginsSettingsSectionInjected>

/** Render one Plugins page whose contents arrive from feature-owned tabs. */
export function PluginsSettingsSection({ t, renderSlot, useTabs }: PluginsSettingsSectionProps) {
  const tabsId = useId()
  const rows = useTabs(value => value)
  const [activeId, setActiveId] = useState<string>()
  const [visitedIds, setVisitedIds] = useState<ReadonlySet<string>>(() => new Set())
  const active = rows.find(row => row.id === activeId)?.id ?? rows[0]?.id

  // A tab mounts only when first selected, then stays mounted while hidden so
  // local drafts, disclosure state, search, and the inventory snapshot survive
  // switching between the two views.
  useEffect(() => {
    if (active === undefined) return
    setVisitedIds((previous) => {
      if (previous.has(active)) return previous
      return new Set([...previous, active])
    })
  }, [active])

  return (
    <SettingsSection
      description={t('intro')}
      navigation={rows.length === 0 ? undefined : <SettingsTabs
        idPrefix={tabsId}
        label={t('tabs')}
        items={rows}
        activeId={active as string}
        onSelect={setActiveId}
      />}
    >
      {rows.length === 0
        ? (
          <SettingsGroup>
            <SettingsCard padding="none">
              <SettingsState title={t('empty')} />
            </SettingsCard>
          </SettingsGroup>
        )
        : (
          rows
            .filter(row => row.id === active || visitedIds.has(row.id))
            .map(row => (
              <SettingsTabPanel key={row.id} idPrefix={tabsId} tabId={row.id} active={row.id === active}>
                {renderSlot('settings.plugins.tab', {}, { only: row.id })}
              </SettingsTabPanel>
            ))
        )}
    </SettingsSection>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Plugins section, configurable-tab, and card copy. */
    'settings.plugins': PluginsSettingsLocaleKey
  }
}

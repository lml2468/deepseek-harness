/** The General section: grouped cards rendering feature-owned item contributions. */
import type {
  HostObservable, InjectFace, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import {
  SettingsCard, SettingsGroup, SettingsSection,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** One locale-aware item row projected from the General item ledger. */
export interface SettingsGeneralItemEntry {
  id: string
  order: number
  group: string
}

/** Registration-side projection used by the General section. */
export interface GeneralSectionInjected {
  hooks: {
    /** Ordered, locale-aware projection of General item registrations. */
    items: HostObservable<readonly SettingsGeneralItemEntry[]>
  }
}

/** Full component props: section owner, item render, and item-directory shares. */
export type GeneralSectionComponentProps =
  PropsRuntime<'settings.section'>
  & PropsRenderSlots<'settings.general.item'>
  & InjectFace<GeneralSectionInjected>

/**
 * Render the General section content column.
 * @param props - composed slot props (contract/slots.ts).
 * @returns the section element tree.
 */
export function GeneralSection({ renderSlot, useItems }: GeneralSectionComponentProps) {
  const items = useItems(value => value)
  const groups: Array<{ label: string; items: SettingsGeneralItemEntry[] }> = []
  const groupsByLabel = new Map<string, (typeof groups)[number]>()
  for (const item of items) {
    let group = groupsByLabel.get(item.group)
    if (group === undefined) {
      group = { label: item.group, items: [] }
      groupsByLabel.set(item.group, group)
      groups.push(group)
    }
    group.items.push(item)
  }

  return (
    <SettingsSection>
      {groups.map(group => (
        <SettingsGroup key={group.label} title={group.label === '' ? undefined : group.label}>
          <SettingsCard padding="rows">
            {group.items.map(item => (
              <div key={item.id}>
                {renderSlot('settings.general.item', {}, { only: item.id })}
              </div>
            ))}
          </SettingsCard>
        </SettingsGroup>
      ))}
    </SettingsSection>
  )
}

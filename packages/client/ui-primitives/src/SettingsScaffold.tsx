/** Shared structural primitives for settings pages. */
import { useRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import css from './SettingsScaffold.module.css'

/** Props for the settings content column below the shell-owned title. */
export interface SettingsSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional explanatory copy placed consistently before the first group. */
  description?: ReactNode
  /** Optional section navigation rendered after the description and before content. */
  navigation?: ReactNode
}

/**
 * Render the standard content column below the settings shell header.
 * @param props - Section copy, children, and native div attributes.
 * @returns The shared settings section structure.
 */
export function SettingsSection({ className, description, navigation, children, ...props }: SettingsSectionProps) {
  return (
    <div {...props} className={clsx(css.section, className)} data-dsh-settings-section="">
      {description === undefined ? null : <p className={css.description}>{description}</p>}
      {navigation === undefined ? null : <div className={css.navigation}>{navigation}</div>}
      {children}
    </div>
  )
}

/** Props for one semantic group inside a settings section. */
export interface SettingsGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
}

/**
 * Render one titled group whose child owns its card or specialized body.
 * @param props - Group heading, description, children, and native section attributes.
 * @returns The shared settings group structure.
 */
export function SettingsGroup({ className, title, description, children, ...props }: SettingsGroupProps) {
  return (
    <section {...props} className={clsx(css.group, className)} data-dsh-settings-group="">
      {title === undefined && description === undefined ? null : (
        <header className={css.groupHeader}>
          {title === undefined ? null : <h3 className={css.groupTitle}>{title}</h3>}
          {description === undefined ? null : <p className={css.groupDescription}>{description}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

/** One selectable entry in a settings tab list. */
export interface SettingsTabItem {
  /** Stable value owned by the feature. */
  id: string
  /** Localized visible label. */
  label: ReactNode
  /** Whether the entry remains visible but cannot be selected. */
  disabled?: boolean
}

/** Props for the shared settings tab list. */
export interface SettingsTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'onSelect'> {
  /** Stable prefix shared with the corresponding {@link SettingsTabPanel} elements. */
  idPrefix: string
  /** Localized accessible name for the tab list. */
  label: string
  /** Ordered tab entries. */
  items: readonly SettingsTabItem[]
  /** Currently selected feature-owned entry id. */
  activeId: string
  /** Select an enabled entry. */
  onSelect: (id: string) => void
}

/**
 * Render the shared settings tab strip with roving keyboard focus.
 * @param props - Tab identity, entries, selection callback, and native div attributes.
 * @returns The shared settings tab-list structure.
 */
export function SettingsTabs({
  className, idPrefix, label, items, activeId, onSelect, ...props
}: SettingsTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const selectAt = (index: number): void => {
    const item = items[index]
    if (item === undefined || item.disabled === true) return
    onSelect(item.id)
    refs.current[index]?.focus()
  }
  const enabledIndex = (start: number, direction: 1 | -1): number => {
    for (let offset = 1; offset <= items.length; offset += 1) {
      const index = (start + offset * direction + items.length) % items.length
      if (items[index]?.disabled !== true) return index
    }
    return start
  }
  return (
    <div
      {...props}
      className={clsx(css.tabs, className)}
      role="tablist"
      aria-label={label}
      data-dsh-settings-tabs=""
    >
      {items.map((item, index) => {
        const selected = item.id === activeId
        return (
          <button
            key={item.id}
            ref={(element) => { refs.current[index] = element }}
            id={`${idPrefix}-tab-${item.id}`}
            type="button"
            role="tab"
            className={css.tab}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            disabled={item.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => { onSelect(item.id) }}
            onKeyDown={(event) => {
              let next: number
              switch (event.key) {
                case 'ArrowRight': next = enabledIndex(index, 1); break
                case 'ArrowLeft': next = enabledIndex(index, -1); break
                case 'Home': next = enabledIndex(-1, 1); break
                case 'End': next = enabledIndex(0, -1); break
                default: return
              }
              event.preventDefault()
              selectAt(next)
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/** Props for content controlled by one settings tab. */
export interface SettingsTabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Stable prefix shared with the owning {@link SettingsTabs}. */
  idPrefix: string
  /** Feature-owned tab id. */
  tabId: string
  /** Whether the panel is currently selected. */
  active: boolean
}

/**
 * Render a panel with ids and visibility paired to {@link SettingsTabs}.
 * @param props - Tab identity, selected state, children, and native div attributes.
 * @returns The shared settings tab-panel structure.
 */
export function SettingsTabPanel({
  className, idPrefix, tabId, active, children, ...props
}: SettingsTabPanelProps) {
  return (
    <div
      {...props}
      id={`${idPrefix}-panel-${tabId}`}
      className={clsx(css.tabPanel, className)}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${tabId}`}
      hidden={!active}
      data-dsh-settings-tab-panel=""
    >
      {children}
    </div>
  )
}

/** Props for one settings surface. */
export interface SettingsCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Rows provide their own vertical rhythm; content receives standard inset padding. */
  padding?: 'content' | 'rows' | 'none'
}

/**
 * Render a standard bordered settings surface.
 * @param props - Padding mode, children, and native div attributes.
 * @returns The shared settings card surface.
 */
export function SettingsCard({ className, padding = 'content', children, ...props }: SettingsCardProps) {
  return (
    <div {...props} className={clsx(css.card, css[padding], className)} data-dsh-settings-card="">
      {children}
    </div>
  )
}

/** Props for one label, description, content, and action row. */
export interface SettingsRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  action?: ReactNode
}

/**
 * Render a label, description, content, and action row.
 * @param props - Row content and native div attributes.
 * @returns The shared settings row structure.
 */
export function SettingsRow({ className, title, description, leading, action, children, ...props }: SettingsRowProps) {
  return (
    <div {...props} className={clsx(css.row, className)} data-dsh-settings-row="">
      {leading === undefined ? null : <div className={css.leading}>{leading}</div>}
      <div className={css.rowText}>
        <div className={css.rowTitle}>{title}</div>
        {description === undefined ? null : <div className={css.rowDescription}>{description}</div>}
      </div>
      {children === undefined ? null : <div className={css.rowContent}>{children}</div>}
      {action === undefined ? null : <div className={css.rowAction}>{action}</div>}
    </div>
  )
}

/** Props for a loading, empty, or error state inside a settings surface. */
export interface SettingsStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'danger'
}

/**
 * Render a loading, empty, or error-state frame without owning copy or semantics.
 * @param props - State copy, tone, action, and native div attributes.
 * @returns The shared settings state structure.
 */
export function SettingsState({
  className, title, description, action, tone = 'neutral', ...props
}: SettingsStateProps) {
  return (
    <div {...props} className={clsx(css.state, tone === 'danger' && css.danger, className)} data-dsh-settings-state="">
      <strong className={css.stateTitle}>{title}</strong>
      {description === undefined ? null : <div className={css.stateDescription}>{description}</div>}
      {action === undefined ? null : <div className={css.stateAction}>{action}</div>}
    </div>
  )
}

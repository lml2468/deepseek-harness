/**
 * The panel toggle in the conversation header's corner seat.
 *
 * It lives in the conversation's own header rather than in the frame's right
 * column so that a collapsed Sidebar costs the conversation nothing — no rail,
 * no width, and the transcript's scrollbar stays at the column's edge. The
 * corner seat is its own, past the utilities' edge, so the button neither joins
 * the utilities row nor moves it. It shares the panel's per-session store,
 * which the slot runtime allows because both seats are session-scoped.
 *
 * The glyph is the left sidebar's collapse icon mirrored. A short visible label
 * keeps the affordance discoverable among the conversation header utilities.
 */
import type { ReactNode } from 'react'
import { IconPanelLeftOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { createSidebarRightStore } from '../stores.ts'
import css from './ExpandButton.module.css'

/** The button's props: the header corner seat, the shared store, and copy. */
export type ExpandButtonProps =
  & PropsRuntime<'conversation.session.header.corner'>
  & PropsStore<ReturnType<typeof createSidebarRightStore>>
  & PropsLocale<'sidebarRight'>

/** The panel toggle, with state-specific accessible copy. */
export function ExpandButton({ sessionId, useStore, actions, t }: ExpandButtonProps): ReactNode {
  // A session with no surface yet is collapsed: the panel seat materializes the
  // surface on its own mount, and until then there is nothing expanded.
  const expanded = useStore(state => state.bySession[sessionId]?.layout.expanded ?? false)
  const label = expanded ? t('chrome.collapse') : t('chrome.expand')
  return (
    <button
      type="button"
      className={css.button}
      aria-label={label}
      title={label}
      data-sidebar-right-expand
      data-sidebar-right-expanded={expanded || undefined}
      onClick={() => { actions.toggleExpanded(sessionId) }}
    >
      <IconPanelLeftOutline16 className={css.icon} />
      <span>{t('chrome.label')}</span>
    </button>
  )
}

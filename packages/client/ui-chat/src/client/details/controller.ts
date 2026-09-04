import type { BoundActions } from '@deepseek-ai/dsh-client-store'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { createChatStore } from '../stores.ts'

type ChatActions = BoundActions<ReturnType<typeof createChatStore>>

/** Public controller for the current Session's right-hand Workbench. */
export interface IConversationDetailsController {
  readonly activeViewId: string | null
  /**
   * Open a registered Workbench View for the current mounted Session.
   * @param viewId - registered View id.
   * @param focus - optional View-owned focus target.
   */
  open(viewId: string, focus?: string): void
  /** Close the layout-owned Workbench column. */
  close(): void
}

interface AttachedDetails {
  actions: ChatActions
  activeViewId: string | null
}

/** Session-aware controller backed only by mounted Workbench presentation state. */
export class ConversationDetailsController implements IConversationDetailsController {
  private readonly attached = new Map<SessionId, AttachedDetails>()

  constructor(
    private readonly sessions: ISessions,
    private readonly layout: ILayout,
    private readonly views: () => ReadonlySet<string>,
  ) {}

  get activeViewId(): string | null {
    return this.current()?.activeViewId ?? null
  }

  /**
   * Attach one mounted Session's presentation actions.
   * @param sessionId - mounted Session id.
   * @param actions - Session-scoped Chat store actions.
   */
  attach(sessionId: SessionId, actions: ChatActions): void {
    const current = this.attached.get(sessionId)
    this.attached.set(sessionId, { actions, activeViewId: current?.activeViewId ?? null })
  }

  open(viewId: string, focus?: string): void {
    if (!this.views().has(viewId)) throw new Error(`conversation details: unknown view "${viewId}"`)
    const current = this.current()
    if (current === undefined) throw new Error('conversation details: no mounted current Session')
    current.actions.openDetailsView(viewId, focus)
    current.activeViewId = viewId
    this.layout.openDetails()
  }

  /**
   * Open a View from an already Session-addressed UI callback.
   * @param sessionId - mounted Session id.
   * @param viewId - registered View id.
   * @param focus - optional View-owned focus target.
   */
  openFor(sessionId: SessionId, viewId: string, focus?: string): void {
    if (!this.views().has(viewId)) throw new Error(`conversation details: unknown view "${viewId}"`)
    const current = this.attached.get(sessionId)
    if (current === undefined) throw new Error(`conversation details: Session "${sessionId}" is not mounted`)
    current.actions.openDetailsView(viewId, focus)
    current.activeViewId = viewId
    this.layout.openDetails()
  }

  /**
   * Reconcile mounted Session presentation when Workbench View plugins change.
   * @param viewIds - currently registered View ids in fallback order.
   */
  reconcileViews(viewIds: readonly string[]): void {
    const available = new Set(viewIds)
    const fallback = viewIds[0]
    const currentId = this.sessions.list.getSnapshot().current
    for (const [sessionId, details] of this.attached) {
      if (details.activeViewId === null || available.has(details.activeViewId)) continue
      if (fallback === undefined) {
        details.actions.clearDetailsView()
        details.activeViewId = null
        if (sessionId === currentId) this.layout.closeDetails()
      } else {
        details.actions.openDetailsView(fallback)
        details.activeViewId = fallback
      }
    }
  }

  close(): void {
    const current = this.current()
    current?.actions.clearDetailsView()
    if (current !== undefined) current.activeViewId = null
    this.layout.closeDetails()
  }

  private current(): AttachedDetails | undefined {
    const id = this.sessions.list.getSnapshot().current
    return id === undefined ? undefined : this.attached.get(id)
  }
}

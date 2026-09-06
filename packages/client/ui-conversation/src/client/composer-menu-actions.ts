import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InputState } from './contract/input.ts'

/** Runtime state and shell-owned gestures available to one Composer menu action. */
export interface ComposerActionContext {
  readonly sessionId: SessionId
  readonly input: InputState
  readonly canAddFiles: boolean
  openInputTrigger(source: string, trigger: '/' | '@'): void
  selectFiles(): void
}

/** One capability entry contributed to the resident Composer `+` menu. */
export interface ComposerMenuAction {
  readonly id: string
  readonly order: number
  readonly group: 'attach' | 'reference' | 'capability'
  readonly label: () => string
  readonly icon: ReactNode
  availability(context: ComposerActionContext): {
    readonly visible: boolean
    readonly disabledReason?: string | undefined
  }
  invoke(context: ComposerActionContext): void | Promise<void>
}

/** Effect-owned registry that orders Composer menu actions without owning capability state. */
export class ComposerMenuActionRegistry {
  /** Ordered snapshot consumed by the resident Composer. */
  readonly actions: SnapshotStore<readonly ComposerMenuAction[]> = createSnapshotStore([])
  private readonly entries = new Map<string, ComposerMenuAction>()

  /**
   * Register one action until its plugin effect is disposed.
   * @param action - action descriptor and invocation callback.
   * @returns disposer that removes the exact registration.
   */
  register(action: ComposerMenuAction): () => void {
    if (this.entries.has(action.id)) throw new Error(`composer menu action "${action.id}" is already registered`)
    this.entries.set(action.id, action)
    this.publish()
    return () => {
      if (this.entries.get(action.id) !== action) return
      this.entries.delete(action.id)
      this.publish()
    }
  }

  private publish(): void {
    this.actions.set([...this.entries.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)))
  }
}

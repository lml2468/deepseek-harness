/** Chat-owned Slot declarations and composed component props. */
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { SessionSeq } from '@deepseek-ai/dsh-session/types'
import type {
  CommandNode, CompactionSummaryNode, ConversationLocationDataStore, ConversationTurnDataMap,
  MessageImageLoader, MessageImagesOwnerProps, RenderMessageImages, ToolCallBlock, TurnErrorNode, TurnLocation,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  InjectFace, KeyedSnapshotSelectorHook, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore,
  SlotHookFactory, SnapshotSelectorHook,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { createChatStore } from '../stores.ts'
import type { IConversationDetailsController } from '../details/controller.ts'
import type {
  ConversationWorkbenchTab,
} from '../details/workbench-store.ts'
import type { ToolCallId, SelectionTarget } from './store.ts'
import type { ChatConversationViewNode, ChatNode, ChatNodeKind } from './chat-nodes.ts'
import type {
  ChatNodeProcessSource, ChatNodeSource, ChatSnapshot, ChatTurnProcessPresentation,
} from './snapshot.ts'
import type { TurnProcessSpec } from './turn-process.ts'
import type { TranscriptViewMode } from '../../chat-settings.ts'

/** Selector hook over the current Conversation binding's Chat target. */
export type UseChat = SnapshotSelectorHook<ChatSnapshot>

/** Per-key selector hook over one Chat Node. */
export type UseChatNode = KeyedSnapshotSelectorHook<ChatConversationViewNode | undefined>

/** Per-key selector hook over one Chat Node's Turn-process presentation. */
export type UseChatNodeProcess = KeyedSnapshotSelectorHook<ChatTurnProcessPresentation | undefined>

/** Owner currency of the completed-Turn extension chain. */
export interface TurnTailOwnerProps {
  turn: TurnLocation
  seq: number
  openFile: (path: string) => void
}

/** Turn identity and lifecycle exposed to a product-owned Assistant header. */
export interface TurnHeaderOwnerProps {
  turn: TurnLocation
}

/** Owner currency of finalized-assistant actions. */
export interface AssistantActionOwnerProps {
  messageId: MessageId
}

/** Extension actions beside one terminal Turn failure. */
export interface TurnErrorActionOwnerProps {
  node: TurnErrorNode
}

/** Optional prose file-mention provider consumed by Chat. */
export interface ChatFileMentions {
  /**
   * Resolve prose links for one closing Turn.
   * @param owner - closing-Turn identity and file opener.
   * @returns link resolver when available.
   */
  forClosing(owner: TurnTailOwnerProps): MarkdownFileMentions | undefined
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Optional prose file-mention provider. */
    chatFileMentions: ChatFileMentions
  }
}

/** Hook constrained to business data published on the current Chat Node's Turn. */
export type UseChatNodeTurnData = <Key extends Extract<keyof ConversationTurnDataMap, string>>(
  key: Key,
) => Readonly<ConversationTurnDataMap[Key]> | undefined

/** Slot-level Hook factory for keyed Chat renderers. */
export interface ChatNodeTurnDataInjected {
  hooks: { turnData: SlotHookFactory<'conversation.chat.node', UseChatNodeTurnData> }
}

/** Stable owner currency delivered to a keyed Chat renderer. */
export interface ChatNodeOwnerProps {
  selectedCallId?: ToolCallId | undefined
  cwd?: string | undefined
  openFile: (path: string) => void
  inspectCall: (callId: ToolCallId) => void
  forkAt: (seq: number) => void
  /**
   * Session-authorized image loader, down-threaded from the Chat view so a
   * chat-node renderer can render the attachment presentation slot directly
   * with only the durable references plus this loader, instead of receiving a
   * rendering closure.
   */
  loadImage: MessageImageLoader
  renderMessageImages: RenderMessageImages
  fileMentions: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined
  /** Turn-process state when this Node belongs to a projected Turn. */
  turnProcess?: TurnProcessOwnerProps | undefined
}

/** Shared presentation state for one Turn-process answer generation. */
export interface TurnProcessOwnerProps {
  readonly spec: TurnProcessSpec
  readonly foldable: boolean
  readonly open: boolean
  setOpen(open: boolean): void
}

/** Full props of one keyed Chat renderer. */
export type ChatNodeViewProps<Kind extends ChatNodeKind = ChatNodeKind> =
  PropsRuntime<'conversation.chat.node', Kind> & PropsLocale<'chat'>

/** Tool block rendered in the details panel. */
export interface DetailsToolOwnerProps {
  block: ToolCallBlock
  cwd?: string | undefined
}

/** One registered right-hand Workbench View. */
export interface DetailsViewTab {
  id: string
  label: string
  /** Whether the View appears in user-facing singleton launchers. */
  launchable: boolean
}

/** Owner state addressed to the active Workbench View. */
export interface DetailsViewOwnerProps {
  /** The active persisted tab instance addressed to this View. */
  tab: Readonly<ConversationWorkbenchTab>
  /** True while this instance owns the visible Workbench body. */
  active: boolean
  focus: string | null
  /** Replace this tab's JSON presentation state. */
  updateState(state: ConversationWorkbenchTab['state']): void
  /** Close this tab instance. */
  closeTab(): void
  completeFocus(): void
}

/** Command-row owner share. */
export interface CommandRowOwnerProps {
  node: CommandNode
  compaction?: CompactionSummaryNode
}

/** Full props of a registered command row. */
export type CommandRowProps = PropsRuntime<'conversation.chat.commandview'>

/** Shared Chat store handle. */
export type ChatStore = ReturnType<typeof createChatStore>

/** In-memory reader position resilient to transcript reflow. */
export interface ChatScrollPosition {
  readonly anchorKey: string
  readonly anchorTop: number
  readonly scrollTop: number
}

/** Business callbacks injected into the Chat view. */
export interface ChatViewInjected {
  hooks: {
    /** Persisted completed-Turn transcript presentation. */
    transcriptView: SnapshotStore<TranscriptViewMode>
  }
  keyedHooks: {
    /** Resolve the stable source for one Chat Node key. */
    chatNode: (key: string) => ChatNodeSource
    /** Resolve the stable Turn-process source for one Chat Node key. */
    chatNodeProcess: (key: string) => ChatNodeProcessSource
  }
  openDetails: (target: SelectionTarget) => void
  openFile: (path: string) => Promise<void>
  loadOlder: () => void
  /** Jump loader: page history back through seq; resolves when the window covers it. */
  loadThrough: (seq: SessionSeq) => Promise<void>
  loadImage: MessageImageLoader
  chatScroll: {
    save: (position: ChatScrollPosition | null) => void
    read: () => ChatScrollPosition | null
  }
  forkAt: (seq: number) => void
  fileMentions: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined
}

/** Full Chat view props. */
export type ChatViewSlotProps =
  PropsRuntime<'conversation.view'>
  & PropsRenderSlots<'conversation.chat.node' | 'conversation.message.images'>
  & PropsStore<ChatStore>
  & InjectFace<ChatViewInjected>
  & PropsLocale<'chat'>

/** Full props of the durable-message image renderer. */
export type MessageImagesProps = PropsRuntime<'conversation.message.images'> & PropsLocale<'conversation'>

/** Details-panel callbacks. */
export interface DetailsInjected {
  workbench: IConversationDetailsController
  closeDetails: () => void
  hooks: { detailsViews: SnapshotStore<readonly DetailsViewTab[]> }
  openDetailsView: (viewId: string) => void
}

/** Callbacks and live View roster for the Conversation Workbench launcher. */
export interface DetailsLauncherInjected {
  hooks: { detailsViews: SnapshotStore<readonly DetailsViewTab[]> }
  openDetails: () => void
}

/** Full props of the Conversation Workbench launcher. */
export type DetailsLauncherProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & InjectFace<DetailsLauncherInjected>
  & PropsLocale<'chat'>

/** Full details-panel props. */
export type DetailsSlotProps =
  PropsRuntime<'details'>
  & PropsRenderSlots<'conversation.details.view'>
  & InjectFace<DetailsInjected>
  & PropsLocale<'chat'>

/** Built-in Tool Workbench View props. */
export type ToolDetailsViewProps =
  PropsRuntime<'conversation.details.view'>
  & PropsRenderSlots<'conversation.details.tool'>
  & PropsStore<ChatStore>
  & PropsLocale<'chat'>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Selector hook over the current Conversation binding's Chat target. */
    useChat: UseChat
  }

  interface LocaleNamespaceMap {
    /** Chat target, transcript node, statistics, and details copy. */
    chat: import('../locale.ts').ChatKey
  }

  interface SlotMap {
    /** Ordered right-hand Workbench Views; only the selected id renders. */
    'conversation.details.view': { kind: 'list'; scope: 'session'; owner: DetailsViewOwnerProps }
    /**
     * Final Chat node renderer, keyed by `ChatNodeKind`. The component receives
     * the typed node, shared Chat actions, and Turn-data hook. Reusing a key
     * replaces that node renderer; a kind with no occupant renders no row.
     */
    'conversation.chat.node': {
      kind: 'keyed'
      scope: 'session'
      owner: ChatNodeOwnerProps
      keyProps: { [Kind in ChatNodeKind]: { node: ChatNode<Kind> } }
      hookContext: ConversationLocationDataStore<ConversationTurnDataMap> | undefined
      inject: ChatNodeTurnDataInjected
    }
    /**
     * Renderer for one consecutive group of durable message images. The owner
     * supplies image references, an authorized loader, and alignment. A
     * registration replaces the shipped gallery; without one, images are omitted.
     */
    'conversation.message.images': { kind: 'single'; scope: 'session'; owner: MessageImagesOwnerProps }
    /**
     * Command row keyed by the command name. The component receives the folded
     * command lifecycle and linked compaction when present. Reusing a key
     * replaces that command renderer; an unoccupied key uses the generic card.
     */
    'conversation.chat.commandview': { kind: 'keyed'; scope: 'session'; owner: CommandRowOwnerProps }
    /**
     * Selector-routed extension before a completed Turn's action row. The
     * component receives the Turn, closing sequence, and file opener. The first
     * selector that accepts the owner renders; an all-declined chain is empty.
     */
    'conversation.chat.turnTail': { kind: 'chain'; scope: 'session'; owner: TurnTailOwnerProps }
    /**
     * Ordered actions for one finalized assistant message. Each entry receives
     * the durable message id; a fresh `id` adds an action and reusing one replaces
     * that entry. With no entries, the standard action row remains unchanged.
     */
    'conversation.chat.assistant-actions': { kind: 'list'; scope: 'session'; owner: AssistantActionOwnerProps }
    /** Product-owned identity row shown once before one Turn's Assistant response. */
    'conversation.chat.turnHeader': { kind: 'single'; scope: 'session'; owner: TurnHeaderOwnerProps }
    /** Ordered product actions beside a terminal Turn failure. */
    'conversation.turn.error.actions': { kind: 'list'; scope: 'session'; owner: TurnErrorActionOwnerProps }
    /**
     * Whole details-panel body for the selected Tool call. The component receives
     * the running or settled block and optional workspace root. A registration
     * replaces the shipped Tool details renderer; absence uses the raw fallback.
     */
    'conversation.details.tool': { kind: 'single'; scope: 'session'; owner: DetailsToolOwnerProps }
  }
}

/** Browser attachment plugin: fills conversation's composer and image slots. */
import { createElement } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { IconPaperclipOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-trajectory/client'
import { ComposerAttachments } from './ComposerAttachments.tsx'
import { MessageImages } from './MessageImages.tsx'

/** Slot registry required by this presentation plugin. */
export const inject = ['slots', 'locale']

/** Register attachment presentation without exporting React components as package values. */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind('conversation')
  ctx.inject(['composerMenuActions'], scope => scope.effect(() => scope.composerMenuActions.register({
    id: 'attachment.images',
    order: 10,
    group: 'attach',
    label: () => t('image.add'),
    icon: createElement(IconPaperclipOutline16),
    availability: context => ({
      visible: true,
      ...(context.canAddImages ? {} : { disabledReason: t('image.dropBlocked') }),
    }),
    invoke: (context) => { context.selectImages() },
  }), 'ui-attachment: Composer action'))
  ctx.slots.inject('conversation.input.attachments', () => ctx.slots.register({
    name: 'conversation.input.attachments',
    locale: 'conversation',
  }, ComposerAttachments))
  ctx.slots.inject('conversation.message.images', () => ctx.slots.register({
    name: 'conversation.message.images',
    locale: 'conversation',
  }, MessageImages))
  ctx.slots.inject('conversation.trajectory.images', () => ctx.slots.register({
    name: 'conversation.trajectory.images',
    locale: 'conversation',
  }, MessageImages))
  // The tool image gallery reuses the message gallery renderer: its owner
  // carries the same images/loadImage/align share the message arm does.
  ctx.slots.inject('tool.call.images', () => ctx.slots.register({
    name: 'tool.call.images',
    locale: 'conversation',
  }, MessageImages))
}

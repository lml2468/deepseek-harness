import { describe, expect, it } from 'vitest'
import type { ComposerMenuAction } from '../src/client/composer-menu-actions.ts'
import { ComposerMenuActionRegistry } from '../src/client/composer-menu-actions.ts'

function action(id: string, order: number): ComposerMenuAction {
  return {
    id,
    order,
    group: 'capability',
    label: () => id,
    icon: null,
    availability: () => ({ visible: true }),
    invoke: () => {},
  }
}

describe('ComposerMenuActionRegistry', () => {
  it('orders contributions deterministically and publishes disposal', () => {
    const registry = new ComposerMenuActionRegistry()
    const removeLater = registry.register(action('later', 20))
    const removeBeta = registry.register(action('beta', 10))
    const removeAlpha = registry.register(action('alpha', 10))

    expect(registry.actions.getSnapshot().map(entry => entry.id)).toEqual(['alpha', 'beta', 'later'])

    removeBeta()
    expect(registry.actions.getSnapshot().map(entry => entry.id)).toEqual(['alpha', 'later'])
    removeBeta()
    expect(registry.actions.getSnapshot().map(entry => entry.id)).toEqual(['alpha', 'later'])

    removeAlpha()
    removeLater()
    expect(registry.actions.getSnapshot()).toEqual([])
  })

  it('rejects duplicate action ids without replacing the owner', () => {
    const registry = new ComposerMenuActionRegistry()
    const first = action('same', 10)
    const remove = registry.register(first)

    expect(() => registry.register(action('same', 20))).toThrow('already registered')
    expect(registry.actions.getSnapshot()).toEqual([first])

    remove()
    expect(registry.actions.getSnapshot()).toEqual([])
  })
})

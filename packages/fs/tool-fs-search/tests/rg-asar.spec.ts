import { sep } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const asarDir = `${sep}Applications${sep}App.app${sep}Contents${sep}Resources${sep}app.asar`
const unpackedDir = `${sep}Applications${sep}App.app${sep}Contents${sep}Resources${sep}app.asar.unpacked`
const suffix = `${sep}node_modules${sep}@vscode${sep}ripgrep-darwin-arm64${sep}bin${sep}rg`

const { dependencyRgPath, existsSync } = vi.hoisted(() => ({
  dependencyRgPath: { value: '' },
  existsSync: vi.fn(),
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, existsSync }
})

vi.mock('@vscode/ripgrep', () => ({ get rgPath() { return dependencyRgPath.value } }))

beforeEach(() => {
  vi.resetModules()
  existsSync.mockReset()
  Reflect.deleteProperty(process, 'pkg')
})

afterEach(() => {
  Reflect.deleteProperty(process, 'pkg')
})

describe('ripgrep resolution inside an Electron asar', () => {
  it('prefers the unpacked binary, which is the only copy execve can reach', async () => {
    // Electron's patched fs reports the archived path present, but app.asar is
    // one file on disk: spawning through it fails ENOTDIR.
    dependencyRgPath.value = `${asarDir}${suffix}`
    existsSync.mockReturnValue(true)
    const { resolveRgPath } = await import('@deepseek-ai/dsh-tool-fs-search')

    await expect(resolveRgPath()).resolves.toBe(`${unpackedDir}${suffix}`)
    expect(existsSync).toHaveBeenCalledWith(`${unpackedDir}${suffix}`)
  })

  it('keeps the resolved path when the packager unpacked nothing', async () => {
    dependencyRgPath.value = `${asarDir}${suffix}`
    existsSync.mockReturnValue(false)
    const { resolveRgPath } = await import('@deepseek-ai/dsh-tool-fs-search')

    await expect(resolveRgPath()).resolves.toBe(`${asarDir}${suffix}`)
  })

  it('leaves an unarchived path untouched', async () => {
    dependencyRgPath.value = `${sep}srv${sep}node_modules${sep}@vscode${sep}ripgrep${sep}bin${sep}rg`
    const { resolveRgPath } = await import('@deepseek-ai/dsh-tool-fs-search')

    await expect(resolveRgPath()).resolves.toBe(dependencyRgPath.value)
    expect(existsSync).not.toHaveBeenCalled()
  })

  it('does not rewrite a directory that merely starts with the archive name', async () => {
    dependencyRgPath.value = `${sep}srv${sep}app.asarx${sep}bin${sep}rg`
    const { resolveRgPath } = await import('@deepseek-ai/dsh-tool-fs-search')

    await expect(resolveRgPath()).resolves.toBe(dependencyRgPath.value)
    expect(existsSync).not.toHaveBeenCalled()
  })
})

import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractPnpmPackages, NoGlobalLayoutVersionsError, PnpmDirectoryNotFoundError } from '../src/extractor-pnpm.js'

vi.mock('node:fs')
vi.mock('node:fs/promises')

describe('extractPnpmPackages', () => {
	beforeEach(() => {
		vol.reset()
	})

	it('should throw PnpmDirectoryNotFoundError when pnpm directory does not exist', async () => {
		await expect(
			extractPnpmPackages({
				pnpmPath: '/home/user/.pnpm',
			}),
		).rejects.toThrow(PnpmDirectoryNotFoundError)
	})

	it('should throw NoGlobalLayoutVersionsError when global directory exists but has no layout versions', async () => {
		vol.mkdirSync('/home/user/.pnpm/global', { recursive: true })
		await expect(
			extractPnpmPackages({
				pnpmPath: '/home/user/.pnpm',
			}),
		).rejects.toThrow(NoGlobalLayoutVersionsError)
	})

	it('should extract all packages from a single global layout version', async () => {
		vol.fromJSON({
			'/home/user/.pnpm/global/5/node_modules/@antfu/ni/package.json': JSON.stringify({
				name: '@antfu/ni',
				version: '27.0.0',
			}),
			'/home/user/.pnpm/global/5/node_modules/@antfu/utils/package.json': JSON.stringify({
				name: '@antfu/utils',
				version: '9.0.0',
			}),
		})
		const result = await extractPnpmPackages({
			pnpmPath: '/home/user/.pnpm',
		})
		expect(result).toEqual([
			{ name: '@antfu/ni', version: '27.0.0' },
			{ name: '@antfu/utils', version: '9.0.0' },
		])
	})

	it('should extract packages only from the highest layout version when multiple versions exist', async () => {
		vol.fromJSON({
			'/home/user/.pnpm/global/5/node_modules/@antfu/ni/package.json': JSON.stringify({
				name: '@antfu/ni',
				version: '27.0.0',
			}),
			'/home/user/.pnpm/global/4/node_modules/@antfu/utils/package.json': JSON.stringify({
				name: '@antfu/utils',
				version: '9.0.0',
			}),
		})
		const result = await extractPnpmPackages({
			pnpmPath: '/home/user/.pnpm',
		})
		expect(result).toEqual([{ name: '@antfu/ni', version: '27.0.0' }])
	})
})

import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractNvmPackages, NoNvmNodeVersionError, NvmDirectoryNotFoundError } from '../src/extractor-nvm.js'

vi.mock('node:fs')
vi.mock('node:fs/promises')

describe('extractNvmPackages', () => {
	beforeEach(() => {
		vol.reset()
	})

	it('extract packages from nvm versions', async () => {
		vol.fromJSON({
			'/home/user/.nvm/versions/node/v22.0.0/lib/node_modules/pnpm/package.json': JSON.stringify({
				name: 'pnpm',
				version: '9.0.0',
			}),
			'/home/user/.nvm/versions/node/v22.0.0/lib/node_modules/tsx/package.json': JSON.stringify({
				name: 'tsx',
				version: '4.0.0',
			}),
			'/home/user/.nvm/versions/node/v20.10.0/lib/node_modules/npm/package.json': JSON.stringify({
				name: 'npm',
				version: '10.2.0',
			}),
		})

		const result = await extractNvmPackages({
			nvmPath: '/home/user/.nvm',
		})

		expect(result.length).toBe(2)
		expect(result[0]?.version).toBe('20.10.0')
		expect(result[0]?.packages).toContainEqual({ name: 'npm', version: '10.2.0' })
		expect(result[1]?.version).toBe('22.0.0')
		expect(result[1]?.packages).toContainEqual({ name: 'pnpm', version: '9.0.0' })
	})

	it('throw error when nvm node directory is not found', async () => {
		await expect(
			extractNvmPackages({
				nvmPath: '/home/user/.nvm',
			}),
		).rejects.toThrow(NvmDirectoryNotFoundError)
	})

	it('throw error when no node versions are installed', async () => {
		vol.mkdirSync('/home/user/.nvm/versions/node', { recursive: true })

		await expect(
			extractNvmPackages({
				nvmPath: '/home/user/.nvm',
			}),
		).rejects.toThrow(NoNvmNodeVersionError)
	})
})

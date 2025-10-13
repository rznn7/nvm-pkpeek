import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractPnpmPackages } from '../src/extractor-pnpm.js'

vi.mock('node:fs')
vi.mock('node:fs/promises')

describe('extractNvmPackages', () => {
	beforeEach(() => {
		vol.reset()
	})

	it('throw error when pnpm directory is not found', async () => {
		await expect(
			extractPnpmPackages({
				pnpmPath: '/home/user/.nvm',
			}),
		).rejects.toThrow('')
	})
})

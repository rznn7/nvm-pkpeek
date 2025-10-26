import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractYarnPackages, YarnDirectoryNotFoundError } from '../src/extractor-yarn.js'

vi.mock('node:fs')
vi.mock('node:fs/promises')

describe('extractYarnPackages', () => {
	beforeEach(() => {
		vol.reset()
	})

	it('should throw YarnDirectoryNotFoundError when pnpm directory does not exist', async () => {
		await expect(
			extractYarnPackages({
				yarnPath: '/home/user/.yarn',
			}),
		).rejects.toThrow(YarnDirectoryNotFoundError)
	})
})

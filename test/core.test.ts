import { describe, it, expect, vi, beforeEach } from 'vitest'
import { peek } from '../src/core.js'
import * as extractor from '../src/extractor-nvm.js'
import * as display from '../src/display.js'

vi.mock('../src/extractor-nvm.js')
vi.mock('../src/display.js')

describe('peek', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should call extractNvmPackages without version filter when no arguments provided', async () => {
		const mockVersionsInfo = [
			{ version: '22.0.0', packages: [{ name: 'pnpm', version: '9.0.0' }] },
		]
		vi.mocked(extractor.extractNvmPackages).mockResolvedValue(mockVersionsInfo)

		await peek(undefined, {})

		expect(extractor.extractNvmPackages).toHaveBeenCalledWith({
			versionFilter: undefined,
		})
		expect(display.display).toHaveBeenCalledWith(mockVersionsInfo, {})
	})

	it('should normalize and use provided node version as filter', async () => {
		const mockVersionsInfo = [
			{ version: '22.1.0', packages: [{ name: 'tsx', version: '4.0.0' }] },
		]
		vi.mocked(extractor.extractNvmPackages).mockResolvedValue(mockVersionsInfo)

		await peek('v22', {})

		expect(extractor.extractNvmPackages).toHaveBeenCalledWith({
			versionFilter: '22',
		})
	})

	it('should use current process version when current flag is true', async () => {
		const mockVersionsInfo = [
			{ version: '20.10.0', packages: [] },
		]
		vi.mocked(extractor.extractNvmPackages).mockResolvedValue(mockVersionsInfo)

		// process.version is something like 'v20.10.0'
		const expectedVersion = process.version.replace(/^v/, '')

		await peek(undefined, { current: true })

		expect(extractor.extractNvmPackages).toHaveBeenCalledWith({
			versionFilter: expectedVersion,
		})
	})

	it('should pass options to display function', async () => {
		const mockVersionsInfo = [
			{ version: '22.0.0', packages: [] },
		]
		vi.mocked(extractor.extractNvmPackages).mockResolvedValue(mockVersionsInfo)

		const options = { format: 'unix' as const, color: false }
		await peek(undefined, options)

		expect(display.display).toHaveBeenCalledWith(mockVersionsInfo, options)
	})
})

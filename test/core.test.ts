import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CliOptions } from '../src/cli.js'
import { peek } from '../src/core.js'
import * as display from '../src/display.js'
import * as extractorNvm from '../src/extractor-nvm.js'
import * as extractorPnpm from '../src/extractor-pnpm.js'

vi.mock('../src/extractor-nvm.js')
vi.mock('../src/extractor-pnpm.js')
vi.mock('../src/display.js')

describe('peek', () => {
	const mockNvmData = [
		{
			version: '22.0.0',
			packages: [{ name: 'npm', version: '10.0.0' }],
		},
	]

	const mockPnpmData = [{ name: 'pnpm', version: '9.0.0' }]

	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.spyOn(extractorNvm, 'extractNvmPackages').mockResolvedValue(mockNvmData)
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockResolvedValue(mockPnpmData)
		vi.spyOn(display, 'display').mockImplementation(() => {})
	})

	it('should extract packages from both nvm and pnpm when no specific version or current flag is provided', async () => {
		await peek(undefined, {})

		expect(extractorNvm.extractNvmPackages).toHaveBeenCalledWith({ versionFilter: undefined })
		expect(extractorPnpm.extractPnpmPackages).toHaveBeenCalled()
		expect(display.display).toHaveBeenCalledWith({ nvmData: mockNvmData, pnpmData: mockPnpmData }, {})
	})

	it('should filter nvm packages by node version prefix when provided', async () => {
		await peek('22', {})

		expect(extractorNvm.extractNvmPackages).toHaveBeenCalledWith({ versionFilter: '22' })
		expect(extractorPnpm.extractPnpmPackages).toHaveBeenCalled()
		expect(display.display).toHaveBeenCalledWith({ nvmData: mockNvmData, pnpmData: mockPnpmData }, {})
	})

	it('should use current node version when current flag is true', async () => {
		const currentVersion = process.version.replace(/^v/, '')

		await peek(undefined, { current: true })

		expect(extractorNvm.extractNvmPackages).toHaveBeenCalledWith({ versionFilter: currentVersion })
		expect(extractorPnpm.extractPnpmPackages).not.toHaveBeenCalled()
		expect(display.display).toHaveBeenCalledWith({ nvmData: mockNvmData, pnpmData: [] }, { current: true })
	})

	it('should skip pnpm extraction when current flag is true', async () => {
		await peek(undefined, { current: true })

		expect(extractorPnpm.extractPnpmPackages).not.toHaveBeenCalled()
		expect(display.display).toHaveBeenCalledWith({ nvmData: mockNvmData, pnpmData: [] }, { current: true })
	})

	it('should handle nvm extraction error gracefully and display warning', async () => {
		vi.spyOn(extractorNvm, 'extractNvmPackages').mockRejectedValue(new Error('NVM not found'))

		await peek(undefined, {})

		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no nvm installation found'))
		expect(display.display).toHaveBeenCalledWith({ nvmData: [], pnpmData: mockPnpmData }, {})
	})

	it('should handle pnpm extraction error gracefully and display warning', async () => {
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockRejectedValue(new Error('PNPM not found'))

		await peek(undefined, {})

		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no pnpm installation found'))
		expect(display.display).toHaveBeenCalledWith({ nvmData: mockNvmData, pnpmData: [] }, {})
	})

	it('should handle both nvm and pnpm extraction errors gracefully', async () => {
		vi.spyOn(extractorNvm, 'extractNvmPackages').mockRejectedValue(new Error('NVM not found'))
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockRejectedValue(new Error('PNPM not found'))

		await peek(undefined, {})

		expect(console.warn).toHaveBeenCalledTimes(2)
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no nvm installation found'))
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no pnpm installation found'))
		expect(display.display).toHaveBeenCalledWith({ nvmData: [], pnpmData: [] }, {})
	})

	it('should pass through all CLI options to display', async () => {
		const options: CliOptions = { current: false, format: 'unix' }

		await peek(undefined, options)

		expect(display.display).toHaveBeenCalledWith({ nvmData: mockNvmData, pnpmData: mockPnpmData }, options)
	})
})

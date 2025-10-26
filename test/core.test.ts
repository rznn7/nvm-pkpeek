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

	it('should filter packages by name when packageName is provided', async () => {
		const mockNvmDataWithMultiplePackages = [
			{
				version: '22.0.0',
				packages: [
					{ name: 'npm', version: '10.0.0' },
					{ name: 'typescript', version: '5.0.0' },
					{ name: 'eslint', version: '8.0.0' },
				],
			},
			{
				version: '20.0.0',
				packages: [
					{ name: 'npm', version: '9.0.0' },
					{ name: 'prettier', version: '3.0.0' },
				],
			},
		]

		const mockPnpmDataWithMultiplePackages = [
			{ name: 'typescript', version: '5.1.0' },
			{ name: 'eslint', version: '8.1.0' },
			{ name: 'prettier', version: '3.1.0' },
		]

		vi.spyOn(extractorNvm, 'extractNvmPackages').mockResolvedValue(mockNvmDataWithMultiplePackages)
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockResolvedValue(mockPnpmDataWithMultiplePackages)

		await peek('typescript', {})

		expect(display.display).toHaveBeenCalledWith(
			{
				nvmData: [
					{
						version: '22.0.0',
						packages: [{ name: 'typescript', version: '5.0.0' }],
					},
				],
				pnpmData: [{ name: 'typescript', version: '5.1.0' }],
			},
			{},
		)
	})

	it('should filter packages case-insensitively', async () => {
		const mockNvmDataWithMultiplePackages = [
			{
				version: '22.0.0',
				packages: [
					{ name: 'TypeScript', version: '5.0.0' },
					{ name: 'eslint', version: '8.0.0' },
				],
			},
		]

		const mockPnpmDataWithMultiplePackages = [
			{ name: 'TypeScript', version: '5.1.0' },
			{ name: 'ESLint', version: '8.1.0' },
		]

		vi.spyOn(extractorNvm, 'extractNvmPackages').mockResolvedValue(mockNvmDataWithMultiplePackages)
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockResolvedValue(mockPnpmDataWithMultiplePackages)

		await peek('typescript', {})

		expect(display.display).toHaveBeenCalledWith(
			{
				nvmData: [
					{
						version: '22.0.0',
						packages: [{ name: 'TypeScript', version: '5.0.0' }],
					},
				],
				pnpmData: [{ name: 'TypeScript', version: '5.1.0' }],
			},
			{},
		)
	})

	it('should remove nvm versions with no matching packages when filtering', async () => {
		const mockNvmDataWithMultipleVersions = [
			{
				version: '22.0.0',
				packages: [{ name: 'typescript', version: '5.0.0' }],
			},
			{
				version: '20.0.0',
				packages: [{ name: 'eslint', version: '8.0.0' }],
			},
		]

		vi.spyOn(extractorNvm, 'extractNvmPackages').mockResolvedValue(mockNvmDataWithMultipleVersions)
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockResolvedValue([])

		await peek('typescript', {})

		expect(display.display).toHaveBeenCalledWith(
			{
				nvmData: [
					{
						version: '22.0.0',
						packages: [{ name: 'typescript', version: '5.0.0' }],
					},
				],
				pnpmData: [],
			},
			{},
		)
	})

	it('should return empty arrays when no packages match the filter', async () => {
		const mockNvmDataWithPackages = [
			{
				version: '22.0.0',
				packages: [{ name: 'eslint', version: '8.0.0' }],
			},
		]

		const mockPnpmDataWithPackages = [{ name: 'prettier', version: '3.0.0' }]

		vi.spyOn(extractorNvm, 'extractNvmPackages').mockResolvedValue(mockNvmDataWithPackages)
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockResolvedValue(mockPnpmDataWithPackages)

		await peek('nonexistent', {})

		expect(display.display).toHaveBeenCalledWith(
			{
				nvmData: [],
				pnpmData: [],
			},
			{},
		)
	})

	it('should support partial name matching', async () => {
		const mockNvmDataWithPackages = [
			{
				version: '22.0.0',
				packages: [
					{ name: 'typescript', version: '5.0.0' },
					{ name: '@types/node', version: '20.0.0' },
				],
			},
		]

		vi.spyOn(extractorNvm, 'extractNvmPackages').mockResolvedValue(mockNvmDataWithPackages)
		vi.spyOn(extractorPnpm, 'extractPnpmPackages').mockResolvedValue([])

		await peek('type', {})

		expect(display.display).toHaveBeenCalledWith(
			{
				nvmData: [
					{
						version: '22.0.0',
						packages: [
							{ name: 'typescript', version: '5.0.0' },
							{ name: '@types/node', version: '20.0.0' },
						],
					},
				],
				pnpmData: [],
			},
			{},
		)
	})
})

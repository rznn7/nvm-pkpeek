import { describe, expect, it } from 'vitest'
import type { FilteredData } from '../src/filter.js'
import { filterByPackageName, filterDuplicatesOnly } from '../src/filter.js'

describe('filterByPackageName', () => {
	it('should filter packages by exact name match', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'typescript', version: '5.1.0' },
				{ name: 'eslint', version: '8.1.0' },
			],
		}

		const result = filterByPackageName(data, 'typescript')

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		})
	})

	it('should filter packages case-insensitively', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'TypeScript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'TypeScript', version: '5.1.0' },
				{ name: 'ESLint', version: '8.1.0' },
			],
		}

		const result = filterByPackageName(data, 'typescript')

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'TypeScript', version: '5.0.0' }],
				},
			],
			pnpmData: [{ name: 'TypeScript', version: '5.1.0' }],
		})
	})

	it('should support partial name matching', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: '@types/node', version: '20.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'typescript', version: '5.1.0' },
				{ name: '@types/react', version: '18.0.0' },
			],
		}

		const result = filterByPackageName(data, 'type')

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: '@types/node', version: '20.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'typescript', version: '5.1.0' },
				{ name: '@types/react', version: '18.0.0' },
			],
		})
	})

	it('should remove nvm versions with no matching packages', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
				{
					version: '20.0.0',
					packages: [{ name: 'eslint', version: '8.0.0' }],
				},
				{
					version: '18.0.0',
					packages: [{ name: 'typescript', version: '4.9.0' }],
				},
			],
			pnpmData: [{ name: 'prettier', version: '3.0.0' }],
		}

		const result = filterByPackageName(data, 'typescript')

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
				{
					version: '18.0.0',
					packages: [{ name: 'typescript', version: '4.9.0' }],
				},
			],
			pnpmData: [],
		})
	})

	it('should return empty arrays when no packages match', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'eslint', version: '8.0.0' }],
				},
			],
			pnpmData: [{ name: 'prettier', version: '3.0.0' }],
		}

		const result = filterByPackageName(data, 'nonexistent')

		expect(result).toEqual({
			nvmData: [],
			pnpmData: [],
		})
	})

	it('should match packages in scoped package names', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: '@babel/core', version: '7.0.0' },
						{ name: '@babel/preset-env', version: '7.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: '@babel/parser', version: '7.0.0' },
				{ name: 'babel-loader', version: '9.0.0' },
			],
		}

		const result = filterByPackageName(data, 'babel')

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: '@babel/core', version: '7.0.0' },
						{ name: '@babel/preset-env', version: '7.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: '@babel/parser', version: '7.0.0' },
				{ name: 'babel-loader', version: '9.0.0' },
			],
		})
	})
})

describe('filterDuplicatesOnly', () => {
	it('should keep packages that appear in multiple nvm versions', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
				{
					version: '20.0.0',
					packages: [
						{ name: 'typescript', version: '4.9.0' },
						{ name: 'prettier', version: '3.0.0' },
					],
				},
			],
			pnpmData: [],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
				{
					version: '20.0.0',
					packages: [{ name: 'typescript', version: '4.9.0' }],
				},
			],
			pnpmData: [],
		})
	})

	it('should keep packages that appear in both nvm and pnpm', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'typescript', version: '5.1.0' },
				{ name: 'prettier', version: '3.0.0' },
			],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		})
	})

	it('should keep packages that appear across nvm, pnpm, and multiple versions', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
				{
					version: '20.0.0',
					packages: [
						{ name: 'typescript', version: '4.9.0' },
						{ name: 'eslint', version: '7.32.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'typescript', version: '5.1.0' },
				{ name: 'prettier', version: '3.0.0' },
			],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
				{
					version: '20.0.0',
					packages: [
						{ name: 'typescript', version: '4.9.0' },
						{ name: 'eslint', version: '7.32.0' },
					],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		})
	})

	it('should remove packages that appear only once', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'unique-package', version: '1.0.0' },
					],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		})
	})

	it('should remove nvm versions with no duplicate packages', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
				{
					version: '20.0.0',
					packages: [{ name: 'unique-package', version: '1.0.0' }],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		})
	})

	it('should return empty arrays when no duplicates exist', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
			],
			pnpmData: [{ name: 'eslint', version: '8.0.0' }],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [],
			pnpmData: [],
		})
	})

	it('should handle data with only nvm versions', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
				{
					version: '20.0.0',
					packages: [{ name: 'typescript', version: '4.9.0' }],
				},
			],
			pnpmData: [],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [{ name: 'typescript', version: '5.0.0' }],
				},
				{
					version: '20.0.0',
					packages: [{ name: 'typescript', version: '4.9.0' }],
				},
			],
			pnpmData: [],
		})
	})

	it('should handle data with only pnpm packages', () => {
		const data: FilteredData = {
			nvmData: [],
			pnpmData: [
				{ name: 'typescript', version: '5.0.0' },
				{ name: 'eslint', version: '8.0.0' },
			],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [],
			pnpmData: [],
		})
	})

	it('should handle multiple versions and sources', () => {
		const data: FilteredData = {
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
						{ name: 'unique-22', version: '1.0.0' },
					],
				},
				{
					version: '20.0.0',
					packages: [
						{ name: 'typescript', version: '4.9.0' },
						{ name: 'prettier', version: '3.0.0' },
						{ name: 'unique-20', version: '1.0.0' },
					],
				},
				{
					version: '18.0.0',
					packages: [
						{ name: 'eslint', version: '7.32.0' },
						{ name: 'prettier', version: '2.8.0' },
						{ name: 'unique-18', version: '1.0.0' },
					],
				},
			],
			pnpmData: [
				{ name: 'typescript', version: '5.1.0' },
				{ name: 'unique-pnpm', version: '1.0.0' },
			],
		}

		const result = filterDuplicatesOnly(data)

		expect(result).toEqual({
			nvmData: [
				{
					version: '22.0.0',
					packages: [
						{ name: 'typescript', version: '5.0.0' },
						{ name: 'eslint', version: '8.0.0' },
					],
				},
				{
					version: '20.0.0',
					packages: [
						{ name: 'typescript', version: '4.9.0' },
						{ name: 'prettier', version: '3.0.0' },
					],
				},
				{
					version: '18.0.0',
					packages: [
						{ name: 'eslint', version: '7.32.0' },
						{ name: 'prettier', version: '2.8.0' },
					],
				},
			],
			pnpmData: [{ name: 'typescript', version: '5.1.0' }],
		})
	})
})

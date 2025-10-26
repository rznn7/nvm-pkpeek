import type { NvmVersion } from './extractor-nvm.js'
import type { PackageInfo } from './package-extraction.js'

export interface FilteredData {
	nvmData: NvmVersion[]
	pnpmData: PackageInfo[]
}

export function filterByPackageName(data: FilteredData, packageName: string): FilteredData {
	return {
		nvmData: data.nvmData
			.map(version => ({
				...version,
				packages: version.packages.filter(pkg => pkg.name.toLowerCase().includes(packageName.toLowerCase())),
			}))
			.filter(version => version.packages.length > 0),
		pnpmData: data.pnpmData.filter(pkg => pkg.name.toLowerCase().includes(packageName.toLowerCase())),
	}
}

export function filterDuplicatesOnly(data: FilteredData): FilteredData {
	const packageCounts = new Map<string, number>()

	for (const version of data.nvmData) {
		for (const pkg of version.packages) {
			packageCounts.set(pkg.name, (packageCounts.get(pkg.name) || 0) + 1)
		}
	}

	for (const pkg of data.pnpmData) {
		packageCounts.set(pkg.name, (packageCounts.get(pkg.name) || 0) + 1)
	}

	const duplicatePackageNames = new Set(
		Array.from(packageCounts.entries())
			.filter(([_, count]) => count > 1)
			.map(([name]) => name),
	)

	return {
		nvmData: data.nvmData
			.map(version => ({
				...version,
				packages: version.packages.filter(pkg => duplicatePackageNames.has(pkg.name)),
			}))
			.filter(version => version.packages.length > 0),
		pnpmData: data.pnpmData.filter(pkg => duplicatePackageNames.has(pkg.name)),
	}
}

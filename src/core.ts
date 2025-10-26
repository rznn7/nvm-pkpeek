import { yellow } from 'ansis'
import type { CliOptions } from './cli.js'
import { display } from './display.js'
import { extractNvmPackages, type NvmVersion } from './extractor-nvm.js'
import { extractPnpmPackages } from './extractor-pnpm.js'
import { normalizeVersion, PackageInfo } from './package-extraction.js'

export async function peek(packageName: string | undefined, options: CliOptions) {
	const { current = false, nodeVersion = '' } = options
	const versionFilter = getVersionFilter(current, nodeVersion)

	const nvmData = await extractNvmPackages({ versionFilter }).catch((): NvmVersion[] => {
		console.warn(yellow('[nvm-pkpeek]: no nvm installation found.'))
		return []
	})

	const pnpmData = current
		? []
		: await extractPnpmPackages().catch(() => {
				console.warn(yellow('[nvm-pkpeek]: no pnpm installation found.'))
				return []
			})

	const filteredData = packageName ? filterByPackageName({ nvmData, pnpmData }, packageName) : { nvmData, pnpmData }

	display(filteredData, options)
}

function getVersionFilter(useCurrentVersion: boolean | undefined, nodeVersion: string | undefined) {
	if (useCurrentVersion) return normalizeVersion(process.version)
	if (nodeVersion) return normalizeVersion(nodeVersion)

	return undefined
}

function filterByPackageName(data: { nvmData: NvmVersion[]; pnpmData: PackageInfo[] }, packageName: string) {
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

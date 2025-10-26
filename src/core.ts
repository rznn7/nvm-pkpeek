import { yellow } from 'ansis'
import type { CliOptions } from './cli.js'
import { display } from './display.js'
import { extractNvmPackages, type NvmVersion } from './extractor-nvm.js'
import { extractPnpmPackages } from './extractor-pnpm.js'
import { filterByPackageName, filterDuplicatesOnly } from './filter.js'
import { normalizeVersion, type PackageInfo } from './package-extraction.js'

export async function peek(packageName: string | undefined, options: CliOptions) {
	const { current = false, nodeVersion = '', duplicatesOnly = false } = options

	const versionFilter = getVersionFilter(current, nodeVersion)

	const [nvmData, pnpmData] = await Promise.all([
		extractNvmPackages({ versionFilter }).catch(handleNvmError),
		current ? Promise.resolve([]) : extractPnpmPackages().catch(handlePnpmError),
	])

	const filteredData = pipe(
		{ nvmData, pnpmData },
		data => (packageName ? filterByPackageName(data, packageName) : data),
		data => (duplicatesOnly ? filterDuplicatesOnly(data) : data),
	)

	display(filteredData, options)
}

function getVersionFilter(useCurrentVersion: boolean | undefined, nodeVersion: string | undefined) {
	if (useCurrentVersion) return normalizeVersion(process.version)
	if (nodeVersion) return normalizeVersion(nodeVersion)
	return undefined
}

function handleNvmError(): NvmVersion[] {
	console.warn(yellow('[nvm-pkpeek]: no nvm installation found.'))
	return []
}

function handlePnpmError(): PackageInfo[] {
	console.warn(yellow('[nvm-pkpeek]: no pnpm installation found.'))
	return []
}

function pipe<T>(value: T, ...fns: Array<(arg: T) => T>): T {
	return fns.reduce((acc, fn) => fn(acc), value)
}

import type { CliOptions } from './cli.js'
import { display } from './display.js'
import { extractNvmPackages } from './extractor-nvm.js'
import { extractPnpmPackages } from './extractor-pnpm.js'
import { normalizeVersion } from './package-extraction.js'

export async function peek(nodeVersion: string | undefined, options: CliOptions) {
	const { current = false } = options
	const versionFilter = getVersionFilter(nodeVersion, current)
	const nvmData = await extractNvmPackages({ versionFilter })
	const pnpmData = !current ? await extractPnpmPackages() : []

	display({ nvmData, pnpmData }, options)
}

function getVersionFilter(nodeVersion: string | undefined, useCurrentVersion: boolean | undefined) {
	if (useCurrentVersion) {
		return normalizeVersion(process.version)
	}
	if (nodeVersion) {
		return normalizeVersion(nodeVersion)
	}
	return undefined
}

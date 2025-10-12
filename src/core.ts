import type { CliOptions } from './cli.js'
import { display } from './display.js'
import { extractNvmPackages } from './extractor.js'

export async function peek(nodeVersion: string | undefined, options: CliOptions) {
	const { current = false } = options
	const versionFilter = getVersionFilter(nodeVersion, current)
	const versionsInfo = await extractNvmPackages({ versionFilter })

	display(versionsInfo, options)
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

function normalizeVersion(v: string): string {
	return v.replace(/^v/, '')
}

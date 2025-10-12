#!/usr/bin/env node

import { error, log } from 'node:console'
import { Ansis, red } from 'ansis'
import { Option, program } from 'commander'
import { extractNvmPackages, type VersionInfo } from './extractor.js'

export interface PkPeekOptions {
	current?: boolean
	format?: DisplayFormat
	color?: boolean
}

export type DisplayFormat = 'pretty' | 'unix'

program
	.name('nvm-pkpeek')
	.description('Know your globally installed node packages')
	.version('0.1.0')
	.argument('[node-version]', 'node version prefix to peek (e.g., "22" matches "22.x.x")')
	.addOption(new Option('-c, --current', 'peek currently used node version'))
	.addOption(new Option('-f, --format <format>', 'output format').choices(['pretty', 'unix']))
	.addOption(new Option('--no-color', 'disable colored output (only affects pretty format)'))
	.action(runCli)

program.parse()

async function runCli(nodeVersion: string | undefined, options: PkPeekOptions) {
	if (nodeVersion && options.current) {
		error(red('[nvm-pkpeek]: cannot use both [node-version] argument and -c/--current flag'))
		process.exit(1)
	}
	try {
		await main(nodeVersion, options)
	} catch (err) {
		if (err instanceof Error) {
			error(red(`[nvm-pkpeek]: ${err.message}`))
		} else {
			error(red('[nvm-pkpeek]: an unknown error occurred'))
		}
		process.exit(1)
	}
}

async function main(nodeVersion: string | undefined, options: PkPeekOptions) {
	const { useCurrentVersion, displayFormat, noColor } = processOptions(options)
	const versionFilter = getVersionFilter(useCurrentVersion, nodeVersion)

	const versionsInfo = await extractNvmPackages({ versionFilter })

	display(versionsInfo, displayFormat, noColor)
}

function processOptions(options: PkPeekOptions) {
	const { current, format, color } = options
	const noColor = !color
	const displayFormat = format ?? 'pretty'
	const useCurrentVersion = current

	return { useCurrentVersion, displayFormat, noColor }
}

function getVersionFilter(useCurrentVersion: boolean | undefined, nodeVersion: string | undefined) {
	if (useCurrentVersion) {
		return getCurrentNvmNodeVersion()
	} else if (nodeVersion) {
		return normalizeVersion(nodeVersion)
	} else {
		return undefined
	}
}

function getCurrentNvmNodeVersion() {
	return normalizeVersion(process.version)
}

function display(versionsInfo: VersionInfo[], displayFormat: DisplayFormat, noColor: boolean) {
	const displayHandlers: Record<DisplayFormat, () => void> = {
		pretty: () => displayPretty(versionsInfo, noColor),
		unix: () => displayUnix(versionsInfo),
	}

	displayHandlers[displayFormat]()
}

function displayPretty(versionsInfo: VersionInfo[], noColor: boolean) {
	const allPackageNameLengths = versionsInfo.flatMap(version => version.packages.map(pkg => pkg.name.length))
	const maxPackageNameLength = allPackageNameLengths.length > 0 ? Math.max(...allPackageNameLengths) : 0
	const ansis = safeAnsis(noColor)

	versionsInfo.forEach(version => {
		log(ansis.bold.cyan(`▸ Node ${version.version}`))
		version.packages.forEach(pkg => {
			log(`    ${pkg.name.padEnd(maxPackageNameLength + 2)}${ansis.dim(pkg.version)}`)
		})
	})
}

function displayUnix(versionsInfo: VersionInfo[]) {
	versionsInfo.forEach(version => {
		version.packages.forEach(pkg => {
			log(`${version.version}\t${pkg.name}\t${pkg.version}`)
		})
	})
}

const safeAnsis = (noColor: boolean) => (noColor ? new Ansis(0) : new Ansis())

function normalizeVersion(v: string): string {
	return v.replace(/^v/, '')
}

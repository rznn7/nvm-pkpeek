#!/usr/bin/env node

import { error, log } from 'node:console'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { Ansis, bold, dim, red } from 'ansis'
import { Option, program } from 'commander'

interface PkPeekOptions {
	current?: boolean
	format?: DisplayFormat
	color?: boolean
}

type DisplayFormat = 'pretty' | 'unix'

interface VersionInfo {
	version: string
	packages: PackageInfo[]
}

interface PackageInfo {
	name: string
	version: string
}

const safeAnsis = (noColor: boolean) => (noColor ? new Ansis(0) : new Ansis())

program
	.name('nvm-pkpeek')
	.description('Know your globally installed node packages')
	.version('0.1.0')
	.argument('[node-version]', 'node version prefix to peek (e.g., "22" matches "22.x.x")')
	.addOption(new Option('-f, --format <format>', 'output format').choices(['pretty', 'unix']))
	.addOption(new Option('-c, --current', 'peek currently used node version'))
	.addOption(new Option('--no-color', 'disable colored output (only affects pretty format)'))
	.action((nodeVersion: string | undefined, options: PkPeekOptions) => {
		if (nodeVersion && options.current) {
			error(red('[nvm-pkpeek]: cannot use both [node-version] argument and -c/--current flag'))
			process.exit(1)
		}
		main(nodeVersion, options)
	})

program.parse()

async function main(nodeVersion: string | undefined, options: PkPeekOptions) {
	const { useCurrentVersion, displayFormat, noColor } = processOptions(options)
	const versionFilter = getVersionFilter(useCurrentVersion, nodeVersion)
	const nvmPath = path.join(homedir(), '.nvm')
	const detectedNodeVersions = await detectNodeVersions(nvmPath)
	const versionsToPeek = getVersionsToPeek(detectedNodeVersions, versionFilter)
	const versionsInfo = await extractVersions(versionsToPeek, nvmPath)

	display(versionsInfo, displayFormat, noColor)
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

function processOptions(options: PkPeekOptions) {
	const { current, format, color } = options
	const noColor = !color
	const displayFormat = format ?? 'pretty'
	const useCurrentVersion = current

	return { useCurrentVersion, displayFormat, noColor }
}

function getCurrentNvmNodeVersion() {
	return normalizeVersion(process.version)
}

async function detectNodeVersions(nvmPath: string) {
	const nvmVersionsPath = path.join(nvmPath, 'versions', 'node')
	try {
		return await readdir(nvmVersionsPath)
	} catch {
		error(red(`[nvm-pkpeek]: could not access nvm node versions directory: ${nvmVersionsPath}`))
		process.exit(1)
	}
}

function getVersionsToPeek(detectedNodeVersions: string[], versionFilter?: string) {
	if (!versionFilter) return detectedNodeVersions

	const detectedNodeVersionsWithoutPrefix = detectedNodeVersions.map(normalizeVersion)
	const versionsToPeek = detectedNodeVersionsWithoutPrefix.filter(v => v.startsWith(versionFilter))

	if (versionsToPeek.length === 0) {
		error(red(`[nvm-pkpeek]: could not find version with prefix: ${bold(versionFilter)}`))
		error(dim(`[nvm-pkpeek]: detected versions: ${bold(detectedNodeVersions.join(', '))}`))
		process.exit(1)
	}

	return versionsToPeek.map(addVersionPrefix)
}

async function extractVersions(versionsToPeek: string[], nvmPath: string): Promise<VersionInfo[]> {
	return await Promise.all(
		versionsToPeek.map(async version => {
			const nodeModulesPath = path.join(nvmPath, 'versions', 'node', version, 'lib', 'node_modules')

			try {
				const nodeModulesEntries = await readdir(nodeModulesPath)
				const packages = await extractPackages(nodeModulesEntries, nodeModulesPath)
				return { version: normalizeVersion(version), packages }
			} catch {
				return { version: normalizeVersion(version), packages: [] }
			}
		}),
	)
}

async function extractPackages(nodeModulesEntries: string[], nodeModulesPath: string) {
	const results = await Promise.all(
		nodeModulesEntries.map(entry =>
			isScopeEntry(entry) ? extractScopedPackage(nodeModulesPath, entry) : extractPlainPackage(nodeModulesPath, entry),
		),
	)
	return results.flat()
}

async function extractPlainPackage(nodeModulesPath: string, entry: string) {
	const packageJsonPath = path.join(nodeModulesPath, entry, 'package.json')
	const packageInfo = await extractPackageInfo(packageJsonPath)
	return packageInfo ? [packageInfo] : []
}

async function extractScopedPackage(nodeModulesPath: string, entry: string) {
	const scopePath = path.join(nodeModulesPath, entry)

	try {
		const packagesInScope = await readdir(scopePath)
		const results = await Promise.all(
			packagesInScope.map(async packageName => {
				const packageJsonPath = path.join(scopePath, packageName, 'package.json')
				const packageInfo = await extractPackageInfo(packageJsonPath)
				return packageInfo ? [packageInfo] : []
			}),
		)
		return results.flat()
	} catch {
		return []
	}
}

async function extractPackageInfo(packageJsonPath: string): Promise<PackageInfo | undefined> {
	try {
		const packageJsonContent = await readFile(packageJsonPath, 'utf8')
		const { name, version } = JSON.parse(packageJsonContent)
		if (typeof name === 'string' && typeof version === 'string') {
			return { name, version }
		}
		return undefined
	} catch {
		return undefined
	}
}

function isScopeEntry(entry: string) {
	return entry.startsWith('@')
}

function normalizeVersion(v: string) {
	return v.replace(/^v/, '')
}

function addVersionPrefix(v: string) {
	return `v${v}`
}

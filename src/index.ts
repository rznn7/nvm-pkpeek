#!/usr/bin/env node

import { error, log } from 'node:console'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { bold, cyan, dim, red } from 'ansis'
import { Option, program } from 'commander'

interface PkPeekOptions {
	nodeVersion?: string
	current?: boolean
	format: DisplayFormat
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

program
	.name('nvm-pkpeek')
	.description('Know your globally installed node packages')
	.version('0.1.0')
	.addOption(new Option('-f, --format <format>', 'output format').choices(['pretty', 'unix']).default('pretty'))
	.addOption(new Option('--node-version <node-version>', 'specific node version to peek').conflicts('current'))
	.addOption(new Option('-c, --current', 'peek currently used node version').conflicts('nodeVersion'))
	.action((options: PkPeekOptions) => main(options))

program.parse()

async function main(options: PkPeekOptions) {
	const { versionToPeek, displayFormat } = processOptions(options)

	const nvmPath = path.join(homedir(), '.nvm')
	const detectedNodeVersions = await detectNodeVersions(nvmPath)
	const versionsToPeek = versionToPeek ? getVersionsToPeek(detectedNodeVersions, versionToPeek) : detectedNodeVersions
	const versionsInfo = await extractVersions(versionsToPeek, nvmPath)

	display(versionsInfo, displayFormat)
}

function display(versionsInfo: VersionInfo[], displayFormat: DisplayFormat) {
	const displayHandlers: Record<DisplayFormat, () => void> = {
		pretty: () => displayPretty(versionsInfo),
		unix: () => displayUnix(versionsInfo),
	}

	displayHandlers[displayFormat]()
}

function displayPretty(versionsInfo: VersionInfo[]) {
	const allPackageNameLengths = versionsInfo.flatMap(version => version.packages.map(pkg => pkg.name.length))
	const maxPackageNameLength = allPackageNameLengths.length > 0 ? Math.max(...allPackageNameLengths) : 0

	versionsInfo.forEach(version => {
		log(bold.cyan(`▸ Node ${version.version}`))
		version.packages.forEach(pkg => {
			log(`    ${pkg.name.padEnd(maxPackageNameLength + 2)}${dim(pkg.version)}`)
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

function processOptions(options: PkPeekOptions): { versionToPeek?: string; displayFormat: DisplayFormat } {
	const { current, nodeVersion, format } = options
	if (current) return { versionToPeek: getCurrentNvmNodeVersion(), displayFormat: format }
	if (nodeVersion) return { versionToPeek: processNodeVersionOption(nodeVersion), displayFormat: format }

	return { displayFormat: format }
}

function getCurrentNvmNodeVersion(): string {
	return normalizeVersion(process.version)
}

function processNodeVersionOption(nodeVersion: string): string | undefined {
	return nodeVersion ? normalizeVersion(nodeVersion) : undefined
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

function getVersionsToPeek(detectedNodeVersions: string[], versionToPeek: string): string[] {
	const detectedNodeVersionsWithoutPrefix = detectedNodeVersions.map(normalizeVersion)
	const versionsToPeek = detectedNodeVersionsWithoutPrefix.filter(v => v.startsWith(versionToPeek))

	if (versionsToPeek.length === 0) {
		error(red(`[nvm-pkpeek]: could not find version ${versionToPeek}`))
		error(dim(`[nvm-pkpeek]: detected versions: ${detectedNodeVersions.join(', ')}`))
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

async function extractPackages(nodeModulesEntries: string[], nodeModulesPath: string): Promise<PackageInfo[]> {
	const results = await Promise.all(
		nodeModulesEntries.map(entry =>
			isScopeEntry(entry) ? extractScopedPackage(nodeModulesPath, entry) : extractPlainPackage(nodeModulesPath, entry),
		),
	)
	return results.flat()
}

async function extractPlainPackage(nodeModulesPath: string, entry: string): Promise<PackageInfo[]> {
	const packageJsonPath = path.join(nodeModulesPath, entry, 'package.json')
	const packageInfo = await extractPackageInfo(packageJsonPath)
	return packageInfo ? [packageInfo] : []
}

async function extractScopedPackage(nodeModulesPath: string, entry: string): Promise<PackageInfo[]> {
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

async function extractPackageInfo(packageJsonPath: string): Promise<{ name: string; version: string } | undefined> {
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

import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export interface VersionInfo {
	version: string
	packages: PackageInfo[]
}

export interface PackageInfo {
	name: string
	version: string
}

export interface ExtractorOptions {
	versionFilter?: string
	nvmPath?: string
}

export async function extractNvmPackages(options: ExtractorOptions = {}): Promise<VersionInfo[]> {
	const { versionFilter = '', nvmPath = getNvmPath() } = options
	const detectedNodeVersions = await detectNodeVersions(nvmPath)
	const versionsToPeek = getVersionsToPeek(detectedNodeVersions, versionFilter)
	return await extractVersions(versionsToPeek, nvmPath)
}

function getNvmPath(): string {
	return process.env.NVM_DIR || path.join(homedir(), '.nvm')
}

async function detectNodeVersions(nvmPath: string) {
	const nvmVersionsPath = path.join(nvmPath, 'versions', 'node')
	try {
		return await readdir(nvmVersionsPath)
	} catch {
		throw new Error(`could not access nvm node versions directory: ${nvmVersionsPath}`)
	}
}

function getVersionsToPeek(detectedNodeVersions: string[], versionFilter: string) {
	if (!versionFilter) return detectedNodeVersions

	const detectedNodeVersionsWithoutPrefix = detectedNodeVersions.map(normalizeVersion)
	const versionsToPeek = detectedNodeVersionsWithoutPrefix.filter(v => v.startsWith(versionFilter))

	if (versionsToPeek.length === 0) {
		throw new Error(
			`could not find version with prefix: ${versionFilter}\ndetected versions: ${detectedNodeVersions.join(', ')}`,
		)
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

function isScopeEntry(entry: string): boolean {
	return entry.startsWith('@')
}

function normalizeVersion(v: string): string {
	return v.replace(/^v/, '')
}

function addVersionPrefix(v: string): string {
	return `v${v}`
}

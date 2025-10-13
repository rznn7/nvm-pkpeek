import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface PackageInfo {
	name: string
	version: string
}

export function isScopeEntry(entry: string): boolean {
	return entry.startsWith('@')
}

export function normalizeVersion(version: string): string {
	return version.replace(/^v/, '')
}

export function addVersionPrefix(version: string): string {
	return `v${version}`
}

export async function extractPackageInfo(packageJsonPath: string): Promise<PackageInfo | undefined> {
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

export async function extractPackagesFromDirectory(nodeModulesPath: string, entries: string[]): Promise<PackageInfo[]> {
	const results = await Promise.all(
		entries.map(entry =>
			isScopeEntry(entry)
				? extractScopedPackages(nodeModulesPath, entry)
				: extractSinglePackage(nodeModulesPath, entry),
		),
	)
	return results.flat()
}

async function extractSinglePackage(nodeModulesPath: string, entry: string): Promise<PackageInfo[]> {
	const packageJsonPath = path.join(nodeModulesPath, entry, 'package.json')
	const packageInfo = await extractPackageInfo(packageJsonPath)
	return packageInfo ? [packageInfo] : []
}

async function extractScopedPackages(nodeModulesPath: string, scopeName: string): Promise<PackageInfo[]> {
	const scopePath = path.join(nodeModulesPath, scopeName)
	try {
		const packagesInScope = await readdir(scopePath)
		const results = await Promise.all(packagesInScope.map(packageName => extractSinglePackage(scopePath, packageName)))
		return results.flat()
	} catch {
		return []
	}
}

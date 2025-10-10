#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

async function main() {
	const nvmVersionsPath = path.join(homedir(), '.nvm', 'versions', 'node')
	const installedNodeVersions = await readdir(nvmVersionsPath)
	const nodeVersionsWithPackages = await Promise.all(
		installedNodeVersions.map(async (version) => {
			const nodeModulesPath = path.join(
				nvmVersionsPath,
				version,
				'lib',
				'node_modules',
			)
			const nodeModulesEntries = await readdir(nodeModulesPath)
			const packagesExtracted = await Promise.all(
				extractPackages(nodeModulesEntries, nodeModulesPath),
			)
			const packages = packagesExtracted.flat().filter(Boolean)
			return { version, packages }
		}),
	)
	console.dir(nodeVersionsWithPackages, { depth: null })
}

main()

function extractPackages(
	nodeModulesEntries: string[],
	nodeModulesPath: string,
) {
	return nodeModulesEntries.map(async (entry) => {
		if (isScopeEntry(entry)) {
			return await extractScopedPackage(nodeModulesPath, entry)
		} else {
			return await extractPlainPackage(nodeModulesPath, entry)
		}
	})
}

async function extractPlainPackage(
	nodeModulesPath: string,
	entry: string,
): Promise<Record<string, string> | undefined> {
	const packagePath = path.join(nodeModulesPath, entry, 'package.json')
	const packageInfo = await extractPackageInfo(packagePath)
	if (packageInfo) {
		return { [packageInfo.name]: packageInfo.version }
	}
	return undefined
}

async function extractScopedPackage(
	nodeModulesPath: string,
	entry: string,
): Promise<(Record<string, string> | undefined)[]> {
	const scopePath = path.join(nodeModulesPath, entry)
	const packagesInScope = await readdir(scopePath)
	const scopeInfos = await Promise.all(
		packagesInScope.map(async (packageName) => {
			const packagePath = path.join(scopePath, packageName, 'package.json')
			const packageInfo = await extractPackageInfo(packagePath)
			if (packageInfo) {
				return { [`${entry}/${packageName}`]: packageInfo.version }
			}
			return undefined
		}),
	)
	return scopeInfos.filter(Boolean)
}

async function extractPackageInfo(
	packagePath: string,
): Promise<{ name: string; version: string } | undefined> {
	try {
		const packageJsonContent = await readFile(packagePath, 'utf8')
		const packageData = JSON.parse(packageJsonContent)
		const { name, version } = packageData
		if (typeof name === 'string' && typeof version === 'string') {
			return { name, version }
		}
		return undefined
	} catch (_) {
		return undefined
	}
}

function isScopeEntry(entry: string) {
	return entry.startsWith('@')
}

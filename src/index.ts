#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

async function main() {
	const nvmVersionsPath = path.join(homedir(), '.nvm', 'versions', 'node')
	const installedNodeVersions = await readdir(nvmVersionsPath)

	const nodeVersionsWithPackages = await Promise.all(
		installedNodeVersions.map(async (versionFolder) => {
			const nodeModulesPath = path.join(
				nvmVersionsPath,
				versionFolder,
				'lib',
				'node_modules',
			)

			const nodeModulesEntries = await readdir(nodeModulesPath)

			const globalPackages = await Promise.all(
				nodeModulesEntries.map(async (entry) => {
					if (entry.startsWith('@')) {
						const scopePath = path.join(nodeModulesPath, entry)
						const packagesInScope = await readdir(scopePath)
						const scopeInfos = await Promise.all(
							packagesInScope.map(async (packageName) => {
								const packagePath = path.join(
									scopePath,
									packageName,
									'package.json',
								)
								const packageInfo = await extractPackageInfo(packagePath)
								return { [packageName]: packageInfo }
							}),
						)
						return { [entry]: scopeInfos }
					} else {
						const packagePath = path.join(
							nodeModulesPath,
							entry,
							'package.json',
						)
						const packageInfo = await extractPackageInfo(packagePath)
						return { [entry]: packageInfo }
					}
				}),
			)

			return {
				version: versionFolder,
				packages: globalPackages,
			}
		}),
	)

	console.dir(nodeVersionsWithPackages, { depth: null })
}

main()

async function extractPackageInfo(packagePath: string) {
	const packageJsonContent = await readFile(packagePath, 'utf8')
	const packageData = JSON.parse(packageJsonContent)
	const version = packageData.version

	if (typeof version === 'string') {
		return { version }
	}

	return {}
}

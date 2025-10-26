import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import {
	extractPackageInfo,
	extractPackagesFromDirectory,
	isScopeEntry,
	type PackageInfo,
} from './package-extraction.js'

export class YarnDirectoryNotFoundError extends Error {
	constructor(path: string) {
		super(`could not access yarn global directory: ${path}`)
		this.name = 'YarnDirectoryNotFoundError'
	}
}

export interface YarnExtractorOptions {
	yarnPath?: string
}

export async function extractYarnPackages(options: YarnExtractorOptions = {}): Promise<PackageInfo[]> {
	const { yarnPath = getYarnPath() } = options

	const globalPackageJsonPath = path.join(yarnPath, 'global')
	const globalPackageJsonContent = await readFile(globalPackageJsonPath, 'utf8').catch(() => {
		throw new YarnDirectoryNotFoundError(yarnPath)
	})
	const { dependencies } = JSON.parse(globalPackageJsonContent)

	if (!isStringRecord(dependencies)) {
		throw new Error('Invalid dependencies format: expected Record<string, string>')
	}

	const packageInfoPromises = Object.keys(dependencies).map(packageName => {
		const packagePath = getPackageJsonPath(yarnPath, packageName)
		return extractPackageInfo(packagePath)
	})

	const results = await Promise.all(packageInfoPromises)
	return results.filter((pkg): pkg is PackageInfo => pkg !== undefined)
}

function getPackageJsonPath(yarnPath: string, packageName: string): string {
	const basePath = path.join(yarnPath, 'global', 'node_modules')

	if (isScopeEntry(packageName)) {
		const [scope, pkg] = packageName.split('/', 2)
		if (!scope || !pkg) {
			throw new Error(`Invalid scoped package name: ${packageName}`)
		}
		return path.join(basePath, scope, pkg, 'package.json')
	}

	return path.join(basePath, packageName, 'package.json')
}

function getYarnPath(): string {
	return process.env.YARN_HOME || path.join(homedir(), '.config', 'yarn')
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false
	}

	return Object.values(value).every(val => typeof val === 'string')
}

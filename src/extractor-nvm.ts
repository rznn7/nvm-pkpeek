import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import {
	addVersionPrefix,
	extractPackagesFromDirectory,
	normalizeVersion,
	type PackageInfo,
} from './package-extraction.js'

export class NvmDirectoryNotFoundError extends Error {
	constructor(path: string) {
		super(`could not access nvm node versions directory: ${path}`)
		this.name = 'NvmDirectoryNotFoundError'
	}
}

export class NoNvmNodeVersionError extends Error {
	constructor(path: string) {
		super(`could not find any node version installed at: ${path}`)
		this.name = 'NoNvmNodeVersionError'
	}
}

export interface NvmVersion {
	version: string
	packages: PackageInfo[]
}

export interface NvmExtractorOptions {
	versionFilter?: string
	nvmPath?: string
}

export async function extractNvmPackages(options: NvmExtractorOptions = {}): Promise<NvmVersion[]> {
	const { versionFilter = '', nvmPath = getNvmPath() } = options
	const detectedVersions = await detectNodeVersions(nvmPath)
	const versionsToExtract = filterVersions(detectedVersions, versionFilter)
	return await extractVersions(versionsToExtract, nvmPath)
}

function getNvmPath(): string {
	return process.env.NVM_DIR || path.join(homedir(), '.nvm')
}

async function detectNodeVersions(nvmPath: string): Promise<string[]> {
	const nvmVersionsPath = path.join(nvmPath, 'versions', 'node')

	let versions: string[]
	try {
		versions = await readdir(nvmVersionsPath)
	} catch {
		throw new NvmDirectoryNotFoundError(nvmVersionsPath)
	}

	if (versions.length === 0) {
		throw new NoNvmNodeVersionError(nvmVersionsPath)
	}

	return versions
}

function filterVersions(detectedVersions: string[], versionFilter: string): string[] {
	if (!versionFilter) return detectedVersions

	const normalizedVersions = detectedVersions.map(normalizeVersion)
	const matchingVersions = normalizedVersions.filter(v => v.startsWith(versionFilter))

	if (matchingVersions.length === 0) {
		throw new Error(
			`could not find version with prefix: ${versionFilter}\ndetected versions: ${detectedVersions.join(', ')}`,
		)
	}

	return matchingVersions.map(addVersionPrefix)
}

async function extractVersions(versions: string[], nvmPath: string): Promise<NvmVersion[]> {
	return await Promise.all(
		versions.map(async version => {
			const nodeModulesPath = path.join(nvmPath, 'versions', 'node', version, 'lib', 'node_modules')
			try {
				const entries = await readdir(nodeModulesPath)
				const packages = await extractPackagesFromDirectory(nodeModulesPath, entries)
				return { version: normalizeVersion(version), packages }
			} catch {
				return { version: normalizeVersion(version), packages: [] }
			}
		}),
	)
}

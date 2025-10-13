import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { extractPackagesFromDirectory, type PackageInfo } from './package-extraction.js'

export class PnpmDirectoryNotFoundError extends Error {
	constructor(path: string) {
		super(`could not access pnpm global directory: ${path}`)
		this.name = 'PnpmDirectoryNotFoundError'
	}
}

export class NoGlobalLayoutVersionsError extends Error {
	constructor(path: string) {
		super(`no global layout versions found in pnpm global directory: ${path}`)
		this.name = 'NoGlobalLayoutVersionsError'
	}
}

export interface PnpmExtractorOptions {
	pnpmPath?: string
}

export async function extractPnpmPackages(options: PnpmExtractorOptions = {}): Promise<PackageInfo[]> {
	const { pnpmPath = getPnpmPath() } = options
	const globalPath = path.join(pnpmPath, 'global')
	const highestLayoutVersion = await detectHighestLayoutVersion(globalPath)
	return await extractPackages(globalPath, highestLayoutVersion)
}

function getPnpmPath(): string {
	return process.env.PNPM_HOME || path.join(homedir(), '.local', 'share', 'pnpm')
}

async function detectHighestLayoutVersion(globalPath: string): Promise<number> {
	let globalDirEntries: Dirent<string>[]
	try {
		globalDirEntries = await readdir(globalPath, { withFileTypes: true })
	} catch {
		throw new PnpmDirectoryNotFoundError(globalPath)
	}

	const layoutVersions = globalDirEntries
		.filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
		.map(entry => parseInt(entry.name, 10))

	if (layoutVersions.length === 0) {
		throw new NoGlobalLayoutVersionsError(globalPath)
	}

	return Math.max(...layoutVersions)
}

async function extractPackages(globalPath: string, layoutVersion: number): Promise<PackageInfo[]> {
	const nodeModulesPath = path.join(globalPath, String(layoutVersion), 'node_modules')
	try {
		const moduleEntries = await readdir(nodeModulesPath)
		return await extractPackagesFromDirectory(nodeModulesPath, moduleEntries)
	} catch {
		return []
	}
}

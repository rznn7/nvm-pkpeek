import { log } from 'node:console'
import { Ansis } from 'ansis'
import type { CliOptions, FormatOption } from './cli.js'
import type { NvmVersion } from './extractor-nvm.js'
import type { PackageInfo } from './package-extraction.js'

export type DisplayOptions = Pick<CliOptions, 'format' | 'color'>

export function display(data: { nvmData: NvmVersion[]; pnpmData: PackageInfo[] }, options: DisplayOptions) {
	const { format = 'pretty', color = true } = options

	const displayHandlers: Record<FormatOption, () => void> = {
		pretty: () => displayPretty(data, color),
		unix: () => displayUnix(data),
	}

	displayHandlers[format]()
}

function displayPretty(data: { nvmData: NvmVersion[]; pnpmData: PackageInfo[] }, color: boolean) {
	const { nvmData, pnpmData } = data

	const allPackageNameLengths = [
		...nvmData.flatMap(nvmVersion => nvmVersion.packages),
		...pnpmData.map(pnpmPkg => pnpmPkg),
	].map(pkg => pkg.name.length)

	const maxPackageNameLength = allPackageNameLengths.length > 0 ? Math.max(...allPackageNameLengths) : 0
	const PADDING_EXTRA = 2
	const packageNamePadding = maxPackageNameLength + PADDING_EXTRA
	const ansis = safeAnsis(color)

	nvmData.forEach(nvmVersion => {
		log(ansis.bold.green(`▸ Node ${nvmVersion.version} (nvm)`))
		nvmVersion.packages.forEach(nvmPkg => {
			log(`    ${nvmPkg.name.padEnd(packageNamePadding)}${ansis.dim(nvmPkg.version)}`)
		})
	})

	if (pnpmData.length > 0) {
		log(ansis.bold.yellow(`▸ PNPM`))
		pnpmData.forEach(pnpmPkg => {
			log(`    ${pnpmPkg.name.padEnd(packageNamePadding)}${ansis.dim(pnpmPkg.version)}`)
		})
	}
}

function displayUnix(data: { nvmData: NvmVersion[]; pnpmData: PackageInfo[] }) {
	const { nvmData, pnpmData } = data
	nvmData.forEach(nvmVersion => {
		nvmVersion.packages.forEach(nvmPkg => {
			log(`nvm\t${nvmVersion.version}\t${nvmPkg.name}\t${nvmPkg.version}`)
		})
	})
	pnpmData.forEach(pnpmPkg => {
		log(`pnpm\t-\t${pnpmPkg.name}\t${pnpmPkg.version}`)
	})
}

function safeAnsis(color: boolean) {
	return color ? new Ansis() : new Ansis(0)
}

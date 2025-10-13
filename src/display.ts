import { log } from 'node:console'
import { Ansis } from 'ansis'
import type { CliOptions } from './cli.js'
import type { VersionInfo } from './extractor-nvm.js'

export type DisplayOptions = Pick<CliOptions, 'format' | 'color'>

export function display(versionsInfo: VersionInfo[], options: DisplayOptions) {
	const { format = 'pretty', color = true } = options

	const displayHandlers: Record<typeof format, () => void> = {
		pretty: () => displayPretty(versionsInfo, color),
		unix: () => displayUnix(versionsInfo),
	}

	displayHandlers[format]()
}

function displayPretty(versionsInfo: VersionInfo[], color: boolean) {
	const allPackageNameLengths = versionsInfo.flatMap(version => version.packages.map(pkg => pkg.name.length))
	const maxPackageNameLength = allPackageNameLengths.length > 0 ? Math.max(...allPackageNameLengths) : 0
	const ansis = safeAnsis(color)

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

function safeAnsis(color: boolean) {
	return color ? new Ansis() : new Ansis(0)
}

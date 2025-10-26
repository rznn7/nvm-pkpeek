import { error } from 'node:console'
import { red } from 'ansis'
import { Option, program } from 'commander'
import { peek } from './core.js'

export interface CliOptions {
	current?: boolean
	format?: FormatOption
	color?: boolean
	nodeVersion?: string
}

export type FormatOption = 'pretty' | 'unix'

export function setupCli() {
	program
		.name('nvm-pkpeek')
		.description('Know your globally installed node packages')
		.version('0.1.0')
		.argument('[package-name]', 'search for packages matching this name (partial match supported)')
		.addOption(
			new Option('-c, --current', 'peek the currently active Node version (npm global packages only)').conflicts(
				'nodeVersion',
			),
		)
		.addOption(
			new Option('-n, --node-version <version>', 'node version prefix to peek (e.g., "22" matches "22.x.x")').conflicts(
				'current',
			),
		)
		.addOption(new Option('-f, --format <format>', 'output format').choices(['pretty', 'unix']))
		.addOption(new Option('--no-color', 'disable colored output (only affects pretty format)'))
		.action(runCli)
	return program
}

async function runCli(packageName: string | undefined, options: CliOptions) {
	try {
		await peek(packageName, options)
	} catch (err) {
		if (err instanceof Error) {
			error(red(`[nvm-pkpeek]: ${err.message}`))
		} else {
			error(red('[nvm-pkpeek]: an unknown error occurred'))
		}
		process.exit(1)
	}
}

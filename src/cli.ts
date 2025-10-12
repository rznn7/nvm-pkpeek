import { error } from 'node:console'
import { red } from 'ansis'
import { Option, program } from 'commander'
import { type DisplayFormat, display } from './display.js'
import { extractNvmPackages } from './extractor.js'
import { peek } from './core.js'

export interface CliOptions {
	current?: boolean
	format?: DisplayFormat
	color?: boolean
}

export function setupCli() {
	program
		.name('nvm-pkpeek')
		.description('Know your globally installed node packages')
		.version('0.1.0')
		.argument('[node-version]', 'node version prefix to peek (e.g., "22" matches "22.x.x")')
		.addOption(new Option('-c, --current', 'peek currently used node version'))
		.addOption(new Option('-f, --format <format>', 'output format').choices(['pretty', 'unix']))
		.addOption(new Option('--no-color', 'disable colored output (only affects pretty format)'))
		.action(runCli)

	return program
}

async function runCli(nodeVersion: string | undefined, options: CliOptions) {
	if (nodeVersion && options.current) {
		error(red('[nvm-pkpeek]: cannot use both [node-version] argument and -c/--current flag'))
		process.exit(1)
	}
	try {
		await peek(nodeVersion, options)
	} catch (err) {
		if (err instanceof Error) {
			error(red(`[nvm-pkpeek]: ${err.message}`))
		} else {
			error(red('[nvm-pkpeek]: an unknown error occurred'))
		}
		process.exit(1)
	}
}

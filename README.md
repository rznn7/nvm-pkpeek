# 🔭 nvm-pkpeek

> Know your globally installed node packages

A simple CLI tool to view globally installed packages across different Node.js versions (managed by nvm) and pnpm.

[![npm version](https://badge.fury.io/js/nvm-pkpeek.svg?icon=si%3Anpm)](https://badge.fury.io/js/nvm-pkpeek)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/rznn7/nvm-pkpeek/actions/workflows/test.yml/badge.svg)](https://github.com/rznn7/nvm-pkpeek/actions/workflows/test.yml)

## Installation

```bash
npm install -g nvm-pkpeek
```

## Usage

```bash
# View all globally installed packages across all Node versions
pkpeek

# View packages for a specific Node version (prefix matching)
pkpeek 22

# View packages for the currently active Node version (npm only)
pkpeek --current

# Output in unix-friendly format (tab-separated)
pkpeek --format unix

# Disable colored output
pkpeek --no-color
```

## Examples

**View all packages:**
```bash
$ pkpeek
▸ Node 20.10.0 (nvm)
    npm        10.2.0
    tsx        4.0.0

▸ Node 22.0.0 (nvm)
    pnpm       9.0.0
    typescript 5.3.0

▸ PNPM
    @antfu/ni  27.0.0
```

**Search for packages by name:**
```bash
$ pkpeek typescript
▸ Node 22.0.0 (nvm)
    typescript 5.3.0
▸ PNPM
    typescript 5.3.2
```

**View packages for Node 22.x:**
```bash
$ pkpeek --node-version 22
▸ Node 22.0.0 (nvm)
    pnpm       9.0.0
    typescript 5.3.0
```

**Only duplicates:**
```bash
$ pkpeek ni -d
▸ Node 22.20.0 (nvm)
    @antfu/ni  26.1.0
▸ PNPM
    @antfu/ni  26.1.0
```

**Unix format output:**
```bash
$ pkpeek --format unix
nvm	20.10.0	npm	10.2.0
nvm	20.10.0	tsx	4.0.0
nvm	22.0.0	pnpm	9.0.0
pnpm	-	@antfu/ni	27.0.0
```

## Options

```
  -V, --version                 output the version number
  -c, --current                 peek the currently active Node version (npm global packages only)
  -n, --node-version <version>  node version prefix to peek (e.g., "22" matches "22.x.x")
  -d, --duplicates-only         show only packages installed in multiple Node versions
  -f, --format <format>         output format (choices: "pretty", "unix")
  --no-color                    disable colored output (only affects pretty format)
  -h, --help                    display help for command
```

## Requirements

- Node.js >= 20.0.0
- nvm (optional) - for viewing nvm-managed Node versions
- pnpm (optional) - for viewing pnpm global packages

## License

MIT

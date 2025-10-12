#!/usr/bin/env node

import { setupCli } from './cli.js'

const program = setupCli()
program.parse()

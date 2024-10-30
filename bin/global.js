#!/usr/bin/env node

import { Command } from 'commander';
import { addScanCommand } from '../src/commands/scan.js';
import { addConfigCommand } from '../src/commands/config.js';

const program = new Command();

program
    .name('sboot')
    .description('CLI tool for Spring Boot projects following Screaming Architecture')
    .version('1.0.0');

// Add commands
addScanCommand(program);

addConfigCommand(program);

program.parse(process.argv);
#!/usr/bin/env node

import { loadConfig } from '../src/config.js';
import { init } from '../src/init.js';
import { runSprint, runLoop, runTicket, runMultiSprint } from '../src/orchestrator.js';

const HELP = `
sprint-agents — Universal Claude agent orchestration

Usage:
  sprint-agents <command> [options]

Commands:
  init              Scaffold sprint-agents into the current project
  sprint            Run a single sprint iteration (generate jobs → run → merge → PR)
  loop              Continuously generate and run jobs until specs are covered
  ticket <file>     Generate and run jobs from a ticket markdown file
  multi-sprint <N>  Run N sprint iterations, then create one PR

Options:
  --help, -h        Show this help message

Environment:
  GITLAB_TOKEN      Required for GitLab MR creation (platform: "gitlab")
`.trim();

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command || command === '--help' || command === '-h') {
		console.log(HELP);
		process.exit(0);
	}

	switch (command) {
		case 'init': {
			await init();
			break;
		}

		case 'sprint': {
			const config = loadConfig();
			runSprint(config);
			break;
		}

		case 'loop': {
			const config = loadConfig();
			runLoop(config);
			break;
		}

		case 'ticket': {
			const ticketFile = args[1];
			if (!ticketFile) {
				console.error('ERROR: ticket command requires a file argument');
				console.error('Usage: sprint-agents ticket <file.md>');
				process.exit(1);
			}
			const config = loadConfig();
			runTicket(ticketFile, config);
			break;
		}

		case 'multi-sprint': {
			const iterationsArg = args[1];
			if (!iterationsArg) {
				console.error('ERROR: multi-sprint command requires an iteration count');
				console.error('Usage: sprint-agents multi-sprint <N>');
				process.exit(1);
			}
			const iterations = parseInt(iterationsArg, 10);
			if (isNaN(iterations) || iterations < 1) {
				console.error(`ERROR: iterations must be a positive integer (got '${iterationsArg}')`);
				process.exit(1);
			}
			const config = loadConfig();
			runMultiSprint(iterations, config);
			break;
		}

		default: {
			console.error(`Unknown command: ${command}`);
			console.error('Run "sprint-agents --help" for usage.');
			process.exit(1);
		}
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});

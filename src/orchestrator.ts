import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { SprintAgentsConfig } from './config.js';
import { createSprintBranch, createTicketBranch, ensureAgentsBranch, getCurrentBranch } from './branch.js';
import { getLastJobNumber, getNewJobFiles, generateJobs } from './job-generator.js';
import { runJobs, parseResults } from './job-runner.js';
import { updateChangelog } from './changelog.js';
import { createPR } from './pr-creator.js';
import { runE2E } from './e2e-runner.js';
import { notify } from './notify.js';
import { log, logHeader } from './utils.js';

function runIteration(config: SprintAgentsConfig, iteration: number, label: string, promptPath: string, extraVars: Record<string, string> = {}): { jobCount: number; done: boolean } {
	logHeader(`Iteration ${label}`);

	// Track job number before generation
	const lastJob = getLastJobNumber(config.jobsDir);

	log('Phase 1: Generating new jobs...');
	generateJobs(config, promptPath, extraVars);

	// Detect new job files
	const newJobs = getNewJobFiles(config.jobsDir, lastJob);

	if (newJobs.length === 0) {
		log('No new jobs generated — specs fully covered!');
		return { jobCount: 0, done: true };
	}

	log(`Phase 1 produced ${newJobs.length} new job(s):`);
	for (const j of newJobs) {
		console.log(`    - ${j}`);
	}

	// Phase 2: Run jobs
	console.log('');
	log('Phase 2: Running jobs...');
	const result = runJobs(newJobs, config);

	// Phase 3: Update changelog
	console.log('');
	log('Phase 3: Updating changelog...');
	const results = parseResults(result.output);
	updateChangelog(results, config, label);

	return { jobCount: newJobs.length, done: false };
}

export function runSprint(config: SprintAgentsConfig): void {
	const { branch, num } = createSprintBranch(config.baseBranch);
	const promptPath = resolve(config.promptsDir, 'generate-jobs.md');

	const { jobCount } = runIteration(config, 1, `Sprint ${num}`, promptPath);

	logHeader(`Sprint complete`);

	// E2E
	log('Running E2E tests...');
	runE2E(config);

	// PR
	log('Creating pull/merge request...');
	const date = new Date().toISOString().split('T')[0];
	createPR(branch, `Sprint ${num}: ${date}`, config);

	if (config.notifyOnComplete) {
		notify('Sprint Agents', `Sprint ${num} finished (${jobCount} jobs)`);
	}
}

export function runLoop(config: SprintAgentsConfig): void {
	ensureAgentsBranch(config.baseBranch);
	const promptPath = resolve(config.promptsDir, 'generate-jobs.md');

	let iteration = 0;
	while (true) {
		iteration++;
		const { done } = runIteration(config, iteration, `Loop — Iteration ${iteration}`, promptPath);

		if (done) break;

		// Push and create/update PR after each iteration in loop mode
		const loopBranch = getCurrentBranch();
		const date = new Date().toISOString().split('T')[0];
		createPR(loopBranch, `Agents: auto-generated changes (${date})`, config);

		log(`Iteration ${iteration} complete. Looping...`);
	}

	logHeader(`Loop finished after ${iteration} iteration(s)`);

	if (config.notifyOnComplete) {
		notify('Sprint Agents', `Loop finished after ${iteration} iteration(s)`);
	}
}

export function runTicket(ticketFile: string, config: SprintAgentsConfig): void {
	const ticketContent = readFileSync(ticketFile, 'utf-8');
	const ticketName = basename(ticketFile, '.md');

	logHeader(`Ticket: ${ticketFile}`);

	const branch = createTicketBranch(ticketName);
	const promptPath = resolve(config.promptsDir, 'ticket.md');

	const { jobCount } = runIteration(config, 1, `Ticket: ${ticketName}`, promptPath, {
		TICKET_CONTENT: ticketContent,
	});

	// E2E
	log('Running E2E tests...');
	runE2E(config);

	// PR
	log('Creating pull/merge request...');
	createPR(branch, `Ticket: ${ticketName}`, config);

	logHeader(`Ticket complete: ${ticketFile}`);
	console.log(`  Branch: ${branch}`);
	console.log(`  Jobs executed: ${jobCount}`);

	if (config.notifyOnComplete) {
		notify('Sprint Agents', `Ticket ${ticketName} complete (${jobCount} jobs)`);
	}
}

export function runMultiSprint(iterations: number, config: SprintAgentsConfig): void {
	const { branch, num } = createSprintBranch(config.baseBranch);
	const promptPath = resolve(config.promptsDir, 'generate-jobs.md');

	let completed = 0;
	let totalJobs = 0;

	for (let i = 1; i <= iterations; i++) {
		const { jobCount, done } = runIteration(
			config,
			i,
			`Sprint ${num} — Iteration ${i} / ${iterations}`,
			promptPath,
		);

		if (done) break;

		completed = i;
		totalJobs += jobCount;
		log(`Iteration ${i} complete. (${totalJobs} total jobs so far)`);
	}

	logHeader(`Multi-sprint finished: ${completed} / ${iterations} iteration(s)`);
	console.log(`  Total jobs executed: ${totalJobs}`);

	// E2E
	log('Running E2E tests before creating PR...');
	const e2ePassed = runE2E(config);

	// PR
	log('Creating pull/merge request...');
	const date = new Date().toISOString().split('T')[0];
	createPR(branch, `Sprint ${num}: ${completed} iteration(s), ${totalJobs} jobs (${date})`, config);

	logHeader('Summary');
	console.log(`  Branch: ${branch}`);
	console.log(`  Iterations completed: ${completed} / ${iterations}`);
	console.log(`  Total jobs: ${totalJobs}`);
	console.log(`  E2E: ${e2ePassed ? 'PASSED' : 'FAILED — review before merging'}`);

	if (config.notifyOnComplete) {
		notify('Sprint Agents', `Multi-sprint done: ${completed} iterations, ${totalJobs} jobs`);
	}
}

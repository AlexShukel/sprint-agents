import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { SprintAgentsConfig } from './config.js';
import { execLive, exec } from './utils.js';

export interface RunResult {
	output: string;
	jobCount: number;
}

export function runJobs(jobFiles: string[], config: SprintAgentsConfig): RunResult {
	const runJobsScript = resolve(config.jobsDir, 'run-jobs.sh');

	if (!existsSync(runJobsScript)) {
		console.error(`ERROR: ${runJobsScript} not found`);
		console.error('Run "sprint-agents init" to scaffold the jobs directory.');
		process.exit(1);
	}

	const args = jobFiles.join(' ');

	// Use tee to both display and capture output
	const output = execSync(`bash "${runJobsScript}" ${args} 2>&1 | tee /dev/stderr`, {
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'inherit'],
		maxBuffer: 50 * 1024 * 1024, // 50MB
	});

	return {
		output,
		jobCount: jobFiles.length,
	};
}

export function parseResults(output: string): Array<{ jobName: string; commitSha: string }> {
	const results: Array<{ jobName: string; commitSha: string }> = [];
	const lines = output.split('\n');

	let inResults = false;
	for (const line of lines) {
		if (line.includes('>>> RESULTS_START')) {
			inResults = true;
			continue;
		}
		if (line.includes('>>> RESULTS_END')) {
			break;
		}
		if (inResults) {
			const parts = line.split('|');
			if (parts.length >= 2 && parts[0].trim()) {
				results.push({
					jobName: parts[0].trim(),
					commitSha: parts[1].trim(),
				});
			}
		}
	}

	return results;
}

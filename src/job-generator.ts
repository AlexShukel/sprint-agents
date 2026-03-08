import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { SprintAgentsConfig } from './config.js';
import { exec, replacePlaceholders } from './utils.js';

export function getLastJobNumber(jobsDir: string): number {
	try {
		const files = readdirSync(jobsDir).filter(f => /^job-\d+/.test(f));
		if (files.length === 0) return 0;

		const numbers = files.map(f => {
			const match = f.match(/^job-(\d+)/);
			return match ? parseInt(match[1], 10) : 0;
		});
		return Math.max(...numbers);
	} catch {
		return 0;
	}
}

export function getNewJobFiles(jobsDir: string, lastJobNumber: number): string[] {
	try {
		const files = readdirSync(jobsDir)
			.filter(f => /^job-\d+.*\.md$/.test(f))
			.filter(f => {
				const match = f.match(/^job-(\d+)/);
				return match ? parseInt(match[1], 10) > lastJobNumber : false;
			})
			.sort()
			.map(f => `${jobsDir}/${f}`);
		return files;
	} catch {
		return [];
	}
}

function buildSpecFilesList(specFiles: string[]): string {
	return specFiles.map(f => `    - \`${f}\``).join('\n');
}

function buildScanDirsList(scanDirs: string[]): string {
	return scanDirs.map(d => `    - Check \`${d}\` for implemented code`).join('\n');
}

export function generateJobs(
	config: SprintAgentsConfig,
	promptTemplatePath: string,
	extraVars: Record<string, string> = {},
): void {
	const template = readFileSync(promptTemplatePath, 'utf-8');
	const lastJob = getLastJobNumber(config.jobsDir);
	const nextJob = lastJob + 1;

	console.log(`Last existing job: job-${lastJob}`);
	console.log(`Next job number:   ${nextJob}`);

	const vars: Record<string, string> = {
		LAST_JOB_NUMBER: String(lastJob),
		NEXT_JOB_NUMBER: String(nextJob),
		JOBS_DIR: config.jobsDir,
		SPEC_FILES_LIST: buildSpecFilesList(config.specFiles),
		SCAN_DIRS_LIST: buildScanDirsList(config.scanDirs),
		...extraVars,
	};

	const prompt = replacePlaceholders(template, vars);

	const modelFlag = config.claudeModel ? ` --model ${config.claudeModel}` : '';
	const cmd = `claude --print${modelFlag}`;

	// Write prompt to a temp file to avoid shell escaping issues
	const tmpFile = `/tmp/sprint-agents-prompt-${process.pid}.md`;
	writeFileSync(tmpFile, prompt);

	try {
		execSync(`${cmd} < "${tmpFile}"`, { stdio: 'inherit' });
	} finally {
		unlinkSync(tmpFile);
	}
}

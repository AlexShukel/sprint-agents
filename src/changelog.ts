import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SprintAgentsConfig } from './config.js';

interface ResultEntry {
	jobName: string;
	commitSha: string;
}

function buildCommitUrl(config: SprintAgentsConfig, sha: string): string {
	if (!sha) return '';
	if (config.platform === 'github') {
		return `https://github.com/${config.repo}/commit/${sha}`;
	}
	return `https://gitlab.com/${config.repo}/-/commit/${sha}`;
}

export function updateChangelog(
	results: ResultEntry[],
	config: SprintAgentsConfig,
	label: string,
): void {
	const changelogPath = resolve(config.jobsDir, 'CHANGELOG.md');

	if (!existsSync(changelogPath)) {
		writeFileSync(changelogPath, '# Changelog\n\nAutomatically updated by sprint-agents after each run.\n');
	}

	const date = new Date().toISOString().split('T')[0];
	const lines: string[] = [
		'',
		`## ${label} — ${date}`,
		'',
		'| Job | Commit |',
		'|-----|--------|',
	];

	for (const { jobName, commitSha } of results) {
		let commitLink = '';
		if (commitSha) {
			const shortSha = commitSha.slice(0, 7);
			const url = buildCommitUrl(config, commitSha);
			commitLink = `[\`${shortSha}\`](${url})`;
		}
		lines.push(`| ${jobName} | ${commitLink} |`);
	}

	appendFileSync(changelogPath, lines.join('\n') + '\n');
	console.log(`>>> Changelog updated: ${changelogPath}`);
}

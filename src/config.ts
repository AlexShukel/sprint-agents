import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SprintAgentsConfig {
	baseBranch: string;
	jobsDir: string;
	specsDir: string;
	promptsDir: string;
	platform: 'github' | 'gitlab';
	remote: string;
	repo: string;
	specFiles: string[];
	scanDirs: string[];
	e2eCommand: string | null;
	claudeModel: string | null;
	notifyOnComplete: boolean;
}

const CONFIG_FILE = 'sprint-agents.config.json';

const DEFAULTS: Partial<SprintAgentsConfig> = {
	baseBranch: 'main',
	jobsDir: 'jobs',
	specsDir: 'specs',
	promptsDir: 'prompts',
	platform: 'github',
	remote: 'origin',
	specFiles: [],
	scanDirs: ['src/'],
	e2eCommand: null,
	claudeModel: null,
	notifyOnComplete: true,
};

export function loadConfig(cwd: string = process.cwd()): SprintAgentsConfig {
	const configPath = resolve(cwd, CONFIG_FILE);

	if (!existsSync(configPath)) {
		console.error(`ERROR: ${CONFIG_FILE} not found in ${cwd}`);
		console.error('Run "sprint-agents init" to create one.');
		process.exit(1);
	}

	const raw = JSON.parse(readFileSync(configPath, 'utf-8'));

	const config: SprintAgentsConfig = {
		...DEFAULTS,
		...raw,
	} as SprintAgentsConfig;

	if (!config.repo) {
		console.error('ERROR: "repo" is required in sprint-agents.config.json');
		process.exit(1);
	}

	if (!['github', 'gitlab'].includes(config.platform)) {
		console.error(`ERROR: "platform" must be "github" or "gitlab" (got "${config.platform}")`);
		process.exit(1);
	}

	return config;
}

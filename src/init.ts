import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createInterface } from 'node:readline';

// In dist layout: dist/src/init.js → go up two levels to project root, then into templates/
const TEMPLATE_DIR = resolve(dirname(new URL(import.meta.url).pathname), '..', '..', 'templates');

export async function init(): Promise<void> {
	const cwd = process.cwd();
	console.log('Initializing sprint-agents in', cwd);
	console.log('');

	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const ask = (question: string, defaultValue: string): Promise<string> =>
		new Promise(res => {
			const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
			rl.question(prompt, answer => res(answer.trim() || defaultValue));
		});

	let baseBranch: string;
	let platform: string;
	let repo: string;

	try {
		baseBranch = await ask('Base branch', 'main');
		platform = await ask('Platform (github/gitlab)', 'github');
		repo = await ask('Repository (owner/repo)', '');
	} finally {
		rl.close();
	}

	if (!repo) {
		console.error('ERROR: Repository is required.');
		process.exit(1);
	}

	// Create config
	const configPath = resolve(cwd, 'sprint-agents.config.json');
	if (existsSync(configPath)) {
		console.log('sprint-agents.config.json already exists — skipping.');
	} else {
		const templateConfig = JSON.parse(readFileSync(resolve(TEMPLATE_DIR, 'sprint-agents.config.json'), 'utf-8'));
		templateConfig.baseBranch = baseBranch;
		templateConfig.platform = platform;
		templateConfig.repo = repo;
		writeFileSync(configPath, JSON.stringify(templateConfig, null, '\t') + '\n');
		console.log('Created sprint-agents.config.json');
	}

	// Create jobs directory
	const jobsDir = resolve(cwd, 'jobs');
	if (!existsSync(jobsDir)) {
		mkdirSync(jobsDir, { recursive: true });
	}

	copyIfNotExists(resolve(TEMPLATE_DIR, 'jobs/README.md'), resolve(jobsDir, 'README.md'));
	copyIfNotExists(resolve(TEMPLATE_DIR, 'jobs/CHANGELOG.md'), resolve(jobsDir, 'CHANGELOG.md'));

	const runJobsDest = resolve(jobsDir, 'run-jobs.sh');
	copyIfNotExists(resolve(TEMPLATE_DIR, 'jobs/run-jobs.sh'), runJobsDest);
	if (existsSync(runJobsDest)) {
		chmodSync(runJobsDest, 0o755);
	}

	// Create prompts directory
	const promptsDir = resolve(cwd, 'prompts');
	if (!existsSync(promptsDir)) {
		mkdirSync(promptsDir, { recursive: true });
	}

	copyIfNotExists(resolve(TEMPLATE_DIR, 'prompts/generate-jobs.md'), resolve(promptsDir, 'generate-jobs.md'));
	copyIfNotExists(resolve(TEMPLATE_DIR, 'prompts/ticket.md'), resolve(promptsDir, 'ticket.md'));

	// Update package.json if it exists
	const pkgPath = resolve(cwd, 'package.json');
	if (existsSync(pkgPath)) {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
		if (!pkg.scripts) pkg.scripts = {};
		let updated = false;

		const scripts: Record<string, string> = {
			sprint: 'sprint-agents sprint',
			loop: 'sprint-agents loop',
			ticket: 'sprint-agents ticket',
			'multi-sprint': 'sprint-agents multi-sprint',
		};

		for (const [name, cmd] of Object.entries(scripts)) {
			if (!pkg.scripts[name]) {
				pkg.scripts[name] = cmd;
				updated = true;
			}
		}

		if (updated) {
			writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
			console.log('Updated package.json scripts');
		}
	}

	console.log('');
	console.log('sprint-agents initialized! Here\'s what was created:');
	console.log('');
	console.log('  sprint-agents.config.json   — project configuration');
	console.log('  jobs/README.md              — job catalog (tracks all batches)');
	console.log('  jobs/CHANGELOG.md           — auto-generated changelog');
	console.log('  jobs/run-jobs.sh            — job runner script');
	console.log('  prompts/generate-jobs.md    — prompt for auto-generating jobs');
	console.log('  prompts/ticket.md           — prompt for ticket-based jobs');
	console.log('');
	console.log('Next steps:');
	console.log('');
	console.log('  1. Add your spec files and source directories to the config:');
	console.log('');
	console.log('     // sprint-agents.config.json');
	console.log('     {');
	console.log(`       "repo": "${repo}",`);
	console.log('       "specFiles": ["specs/feature-x.md", "specs/api.md"],');
	console.log('       "scanDirs": ["src/", "lib/"],');
	console.log('       "e2eCommand": "npm test"');
	console.log('     }');
	console.log('');
	console.log('  2. Run a single sprint (generate jobs → run → PR):');
	console.log('');
	console.log('     sprint-agents sprint');
	console.log('');
	console.log('  3. Or loop until all specs are implemented:');
	console.log('');
	console.log('     sprint-agents loop');
	console.log('');
	console.log('  4. Or break down a ticket into jobs and execute them:');
	console.log('');
	console.log('     sprint-agents ticket tickets/add-auth.md');
	console.log('');
	console.log('  5. Or run multiple sprint iterations, then create one PR:');
	console.log('');
	console.log('     sprint-agents multi-sprint 3');
}

function copyIfNotExists(src: string, dest: string): void {
	if (existsSync(dest)) {
		console.log(`${dest} already exists — skipping.`);
		return;
	}
	copyFileSync(src, dest);
	console.log(`Created ${dest}`);
}

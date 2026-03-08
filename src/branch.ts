import { exec } from './utils.js';

export function getCurrentBranch(): string {
	return exec('git branch --show-current');
}

export function branchExists(name: string): boolean {
	try {
		exec(`git show-ref --verify --quiet refs/heads/${name}`);
		return true;
	} catch {
		return false;
	}
}

export function createSprintBranch(baseBranch: string): { branch: string; num: number } {
	const current = getCurrentBranch();
	if (current !== baseBranch) {
		console.error(`ERROR: Must be on '${baseBranch}' branch to start sprint (currently on '${current}')`);
		process.exit(1);
	}

	let num = 1;
	while (branchExists(`sprint-${num}`)) {
		num++;
	}

	const branch = `sprint-${num}`;
	console.log(`Creating sprint branch '${branch}' from '${baseBranch}'...`);
	exec(`git checkout -b ${branch}`);
	return { branch, num };
}

export function createTicketBranch(ticketName: string): string {
	let branch = `ticket-${ticketName}`;
	if (branchExists(branch)) {
		let counter = 2;
		while (branchExists(`${branch}-${counter}`)) {
			counter++;
		}
		branch = `${branch}-${counter}`;
	}

	console.log(`Creating ticket branch '${branch}'...`);
	exec(`git checkout -b ${branch}`);
	return branch;
}

export function ensureAgentsBranch(baseBranch: string): void {
	const current = getCurrentBranch();
	if (current === 'agents') return;

	if (branchExists('agents')) {
		console.log("Checking out existing 'agents' branch...");
		exec('git checkout agents');
	} else {
		if (current !== baseBranch) {
			console.error(`ERROR: Must be on '${baseBranch}' or 'agents' branch to start loop mode`);
			process.exit(1);
		}
		console.log(`Creating 'agents' branch from '${baseBranch}'...`);
		exec('git checkout -b agents');
	}
}

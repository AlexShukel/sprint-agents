import { execSync, ExecSyncOptions } from 'node:child_process';

export function exec(cmd: string, opts: ExecSyncOptions = {}): string {
	return (execSync(cmd, {
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'pipe'],
		...opts,
	}) as string).trim();
}

export function execLive(cmd: string, opts: ExecSyncOptions = {}): void {
	execSync(cmd, {
		stdio: 'inherit',
		...opts,
	});
}

export function log(msg: string): void {
	console.log(`>>> ${msg}`);
}

export function logHeader(title: string): void {
	console.log('');
	console.log('=========================================');
	console.log(`  ${title}`);
	console.log('=========================================');
	console.log('');
}

export function replacePlaceholders(template: string, vars: Record<string, string>): string {
	let result = template;
	for (const [key, value] of Object.entries(vars)) {
		result = result.replaceAll(`{${key}}`, value);
	}
	return result;
}

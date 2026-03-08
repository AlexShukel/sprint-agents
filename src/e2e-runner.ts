import { SprintAgentsConfig } from './config.js';
import { execLive, log } from './utils.js';

export function runE2E(config: SprintAgentsConfig): boolean {
	if (!config.e2eCommand) {
		log('No e2eCommand configured — skipping E2E tests.');
		return true;
	}

	log('Running E2E tests...');
	try {
		execLive(config.e2eCommand);
		log('E2E tests passed.');
		return true;
	} catch {
		log('WARNING: E2E tests failed. Review the report before merging.');
		return false;
	}
}

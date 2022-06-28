import type { PluginDefinition } from '@balena/jellyfish-worker';
import { actions } from './actions';
import { contracts } from './contracts';
import { integrations } from './integrations';

// tslint:disable-next-line: no-var-requires
const { version } = require('../package.json');

/**
 * The Discourse Jellyfish plugin.
 */
export const discoursePlugin = (): PluginDefinition => {
	return {
		slug: 'plugin-discourse',
		name: 'Discourse Plugin',
		version,
		actions,
		contracts,
		integrationMap: integrations,
		requires: [
			{
				slug: 'plugin-default',
				version: '>=24.x',
			},
		],
	};
};

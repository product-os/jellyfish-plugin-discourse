import type { PluginDefinition } from '@balena/jellyfish-worker';
import { contracts } from './contracts';

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
		contracts,
	};
};

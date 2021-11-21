import { JellyfishPluginBase } from '@balena/jellyfish-plugin-base';
import { actions } from './actions';
import { cards } from './cards';
import integrations from './integrations';

/**
 * The Discourse Jellyfish plugin.
 */
export class DiscoursePlugin extends JellyfishPluginBase {
	constructor() {
		super({
			slug: 'jellyfish-plugin-discourse',
			name: 'Discourse Plugin',
			version: '1.0.0',
			actions,
			cards,
			integrations,
			requires: [
				{
					slug: 'action-library',
					version: '>=13.x',
				},
				{
					slug: 'jellyfish-plugin-default',
					version: '>=19.x',
				},
			],
		});
	}
}

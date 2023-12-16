import { PluginManager } from '@balena/jellyfish-worker';
import { discoursePlugin } from '../../lib';

const pluginManager = new PluginManager([discoursePlugin()]);

test('Expected cards are loaded', () => {
	const contracts = pluginManager.getCards();
	expect(contracts['channel-discussion-threads'].name).toEqual(
		'Blog Discussions',
	);
});

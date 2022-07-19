import { PluginManager } from '@balena/jellyfish-worker';
import { discoursePlugin } from '../../lib';

const pluginManager = new PluginManager([discoursePlugin()]);

test('Expected cards are loaded', () => {
	const contracts = pluginManager.getCards();
	expect(
		contracts['triggered-action-integration-discourse-mirror-event'].name,
	).toEqual('Triggered action for Discourse mirrors');
});

test('Expected integrations are loaded', () => {
	const integrations = pluginManager.getSyncIntegrations();
	expect(Object.keys(integrations).includes('discourse')).toBeTruthy();
});

test('Expected actions are loaded', () => {
	const actions = pluginManager.getActions();
	expect(
		Object.keys(actions).includes('action-integration-discourse-mirror-event'),
	).toBeTruthy();
});

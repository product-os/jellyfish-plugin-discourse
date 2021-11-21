import { cardMixins } from '@balena/jellyfish-core';
import { DiscoursePlugin } from '../../lib';

const context = {
	id: 'jellyfish-plugin-discourse-test',
};

const plugin = new DiscoursePlugin();

test('Expected cards are loaded', () => {
	const cards = plugin.getCards(context, cardMixins);

	// Sanity check
	expect(
		cards['triggered-action-integration-discourse-mirror-event'].name,
	).toEqual('Triggered action for Discourse mirrors');
});

test('Expected integrations are loaded', () => {
	const integrations = plugin.getSyncIntegrations(context);

	// Sanity check
	expect(integrations.discourse.slug).toEqual('discourse');
});

test('Expected actions are loaded', () => {
	const actions = plugin.getActions(context);

	// Sanity check
	expect(
		Object.keys(actions).includes('action-integration-discourse-mirror-event'),
	);
});

import { mirror } from '@balena/jellyfish-action-library/build/actions/mirror';
import type { ActionFile } from '@balena/jellyfish-plugin-base';

const handler: ActionFile['handler'] = async (
	session,
	context,
	card,
	request,
) => {
	return mirror('discourse', session, context, card, request);
};

export const actionIntegrationDiscourseMirrorEvent: ActionFile = {
	handler,
	card: {
		slug: 'action-integration-discourse-mirror-event',
		type: 'action@1.0.0',
		data: {
			filter: {
				type: 'object',
				required: ['type'],
				properties: {
					type: {
						type: 'string',
						enum: ['support-thread@1.0.0', 'message@1.0.0', 'whisper@1.0.0'],
					},
				},
			},
			arguments: {},
		},
	},
};

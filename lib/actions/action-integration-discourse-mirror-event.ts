import { ActionDefinition, mirror } from '@balena/jellyfish-worker';

const handler: ActionDefinition['handler'] = async (
	session,
	context,
	card,
	request,
) => {
	return mirror('discourse', session, context, card, request);
};

export const actionIntegrationDiscourseMirrorEvent: ActionDefinition = {
	handler,
	contract: {
		slug: 'action-integration-discourse-mirror-event',
		version: '1.0.0',
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

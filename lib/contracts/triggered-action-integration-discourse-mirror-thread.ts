import type { ContractDefinition } from '@balena/jellyfish-types/build/core';

export const triggeredActionIntegrationDiscourseMirrorThread: ContractDefinition =
	{
		slug: 'triggered-action-integration-discourse-mirror-thread',
		type: 'triggered-action@1.0.0',
		name: 'Triggered action for Discourse mirrors',
		markers: [],
		data: {
			filter: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
					},
					type: {
						type: 'string',
						const: 'support-thread@1.0.0',
					},
					data: {
						type: 'object',
						required: ['mirrors'],
						properties: {
							mirrors: {
								type: 'array',
								contains: {
									type: 'string',
									pattern: '^https://forums.balena.io',
								},
							},
							tags: {
								type: 'array',
							},
						},
					},
				},
			},
			action: 'action-integration-discourse-mirror-event@1.0.0',
			target: {
				$eval: 'source.id',
			},
			arguments: {},
		},
	};

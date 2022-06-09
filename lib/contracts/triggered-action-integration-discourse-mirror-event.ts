import type { ContractDefinition } from '@balena/jellyfish-types/build/core';

export const triggeredActionIntegrationDiscourseMirrorEvent: ContractDefinition =
	{
		slug: 'triggered-action-integration-discourse-mirror-event',
		type: 'triggered-action@1.0.0',
		name: 'Triggered action for Discourse mirrors',
		markers: [],
		data: {
			schedule: 'sync',
			filter: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						enum: ['message@1.0.0', 'whisper@1.0.0'],
					},
					data: {
						type: 'object',
					},
				},
				$$links: {
					'is attached to': {
						type: 'object',
						properties: {
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
								},
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

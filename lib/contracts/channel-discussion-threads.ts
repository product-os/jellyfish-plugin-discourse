import type { ContractDefinition } from '@balena/jellyfish-types/build/core';

export const channelDiscussionThreads: ContractDefinition = {
	slug: 'channel-discussion-threads',
	name: 'Blog Discussions',
	type: 'channel@1.0.0',
	markers: ['org-balena'],
	loop: 'loop-balena-io@1.0.0',
	data: {
		filter: {
			name: 'Blog discussion threads',
			schema: {
				type: 'object',
				additionalProperties: true,
				required: ['type', 'data'],
				properties: {
					type: {
						type: 'string',
						const: 'support-thread@1.0.0',
					},
					data: {
						type: 'object',
						additionalProperties: true,
						required: ['inbox', 'mirrors'],
						properties: {
							inbox: {
								type: 'string',
								const: 'Discussions',
							},
							mirrors: {
								type: 'array',
								items: {
									type: 'string',
									pattern: 'forums.balena.io',
								},
							},
						},
					},
				},
			},
		},
	},
};

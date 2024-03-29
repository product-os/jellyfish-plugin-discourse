import type { ViewContractDefinition } from 'autumndb';

export const viewAllForumThreads: ViewContractDefinition = {
	slug: 'view-all-forum-threads',
	name: 'Forums',
	type: 'view@1.0.0',
	markers: ['org-balena'],
	loop: 'loop-balena-io@1.0.0',
	data: {
		namespace: 'Support',
		allOf: [
			{
				name: 'Forum threads',
				schema: {
					anyOf: [
						{
							$$links: {
								'is owned by': {
									type: 'object',
									required: ['type'],
									properties: {
										type: {
											const: 'user@1.0.0',
										},
									},
								},
							},
						},
						true,
					],
					$$links: {
						'has attached element': {
							type: 'object',
							properties: {
								type: {
									enum: [
										'message@1.0.0',
										'create@1.0.0',
										'whisper@1.0.0',
										'update@1.0.0',
										'rating@1.0.0',
										'summary@1.0.0',
									],
								},
							},
							additionalProperties: true,
						},
					},
					type: 'object',
					properties: {
						active: {
							const: true,
							type: 'boolean',
						},
						type: {
							type: 'string',
							const: 'support-thread@1.0.0',
						},
						data: {
							type: 'object',
							required: ['mirrors'],
							properties: {
								inbox: {
									not: {
										type: 'string',
										const: 'Discussions',
									},
								},
								mirrors: {
									type: 'array',
									items: {
										type: 'string',
										pattern: 'forums.balena.io',
									},
								},
								category: {
									description:
										"This field is not required and should match cases where the field is not present OR is 'general'",
									const: 'general',
								},
								product: {
									const: 'balenaCloud',
								},
							},
						},
					},
					required: ['active', 'type', 'data'],
					additionalProperties: true,
				},
			},
		],
	},
};

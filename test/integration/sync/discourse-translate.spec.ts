/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ActionLibrary from '@balena/jellyfish-action-library';
import { defaultEnvironment } from '@balena/jellyfish-environment';
import { DefaultPlugin } from '@balena/jellyfish-plugin-default';
import { syncIntegrationScenario } from '@balena/jellyfish-test-harness';
import { DiscoursePlugin } from '../../../lib';
import webhooks from './webhooks/discourse';

const TOKEN = defaultEnvironment.integration.discourse;

syncIntegrationScenario.run(
	{
		test,
		before: beforeAll,
		beforeEach,
		after: afterAll,
		afterEach,
	},
	{
		basePath: __dirname,
		plugins: [ActionLibrary, DefaultPlugin, DiscoursePlugin],
		cards: ['support-thread', 'message', 'whisper'],
		scenarios: webhooks,
		baseUrl: 'https://forums.balena.io',
		stubRegex: /.*/,
		source: 'discourse',
		options: {
			token: TOKEN,
		},
		isAuthorized: (self: any, request: any) => {
			return (
				request.headers['api-key'] === self.options.token.api &&
				request.headers['api-username'] === self.options.token.username
			);
		},
	},
);

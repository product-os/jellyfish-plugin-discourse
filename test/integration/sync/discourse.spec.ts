/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ActionLibrary from '@balena/jellyfish-action-library';
import { syncIntegrationScenario } from '@balena/jellyfish-test-harness';
import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';
import { DiscoursePlugin } from '../../../lib';

// tslint:disable-next-line: no-var-requires
const DefaultPlugin = require('@balena/jellyfish-plugin-default');
const context: any = {
	id: 'jellyfish-plugin-discourse-test',
};

beforeAll(async () => {
	const plugins = [ActionLibrary, DefaultPlugin, DiscoursePlugin];
	const cards = ['support-thread', 'message', 'whisper'];
	await syncIntegrationScenario.before(context, plugins, cards);
	await syncIntegrationScenario.save(context);
});

afterAll(async () => {
	await syncIntegrationScenario.after(context);
});

afterEach(async () => {
	await syncIntegrationScenario.afterEach(context);
});

test('should not change the same user email', async () => {
	await context.jellyfish.insertCard(context.context, context.session, {
		slug: 'user-jviotti',
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'juan@resin.io',
			hash: 'PASSWORDLESS',
			roles: [],
		},
	});

	nock('https://forums.balena.io')
		.get('/admin/users/4.json')
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/admin-users-4-json.json'),
		);

	nock('https://forums.balena.io')
		.get('/t/6061.json')
		.query({
			print: true,
			include_raw: 1,
		})
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/t-6061-json-print-true-include-raw-1.json'),
		);

	nock('https://forums.balena.io')
		.get('/categories.json')
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/categories-json.json'),
		);

	nock('https://forums.balena.io')
		.get('/posts/33998.json')
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/posts-33998-json.json'),
		);

	for (const externalEvent of [
		Object.assign({}, require('./webhooks/discourse/inbound-tag-tag/01.json'), {
			source: 'discourse',
		}),
	]) {
		const event = await context.jellyfish.insertCard(
			context.context,
			context.session,
			{
				type: 'external-event@1.0.0',
				slug: `external-event-${uuidv4()}`,
				version: '1.0.0',
				data: externalEvent,
			},
		);

		const request = await context.queue.producer.enqueue(
			context.worker.getId(),
			context.session,
			{
				context: context.context,
				action: 'action-integration-import-event@1.0.0',
				card: event.id,
				type: event.type,
				arguments: {},
			},
		);

		await context.flush(context.session);
		const result = await context.queue.producer.waitResults(
			context.context,
			request,
		);
		expect(result.error).toBe(false);
	}

	const user = await context.jellyfish.getCardBySlug(
		context.context,
		context.session,
		'user-jviotti@latest',
	);

	expect(user.active).toBe(true);
	expect(user.data).toEqual({
		email: 'juan@resin.io',
		hash: 'PASSWORDLESS',
		roles: [],
		profile: {
			title: 'Software Engineer',
			name: {
				first: 'Juan',
			},
		},
	});
});

test('should add a new e-mail to a user', async () => {
	await context.jellyfish.insertCard(context.context, context.session, {
		slug: 'user-jviotti',
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'foo@bar.com',
			hash: 'PASSWORDLESS',
			roles: [],
		},
	});

	nock('https://forums.balena.io')
		.get('/admin/users/4.json')
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/admin-users-4-json.json'),
		);

	nock('https://forums.balena.io')
		.get('/t/6061.json')
		.query({
			print: true,
			include_raw: 1,
		})
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/t-6061-json-print-true-include-raw-1.json'),
		);

	nock('https://forums.balena.io')
		.get('/categories.json')
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/categories-json.json'),
		);

	nock('https://forums.balena.io')
		.get('/posts/33998.json')
		.reply(
			200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/posts-33998-json.json'),
		);

	for (const externalEvent of [
		Object.assign({}, require('./webhooks/discourse/inbound-tag-tag/01.json'), {
			source: 'discourse',
		}),
	]) {
		const event = await context.jellyfish.insertCard(
			context.context,
			context.session,
			{
				type: 'external-event@1.0.0',
				slug: `external-event-${uuidv4()}`,
				version: '1.0.0',
				data: externalEvent,
			},
		);

		const request = await context.queue.producer.enqueue(
			context.worker.getId(),
			context.session,
			{
				context: context.context,
				action: 'action-integration-import-event@1.0.0',
				card: event.id,
				type: event.type,
				arguments: {},
			},
		);

		await context.flush(context.session);
		const result = await context.queue.producer.waitResults(
			context.context,
			request,
		);
		expect(result.error).toBe(false);
	}

	const user = await context.jellyfish.getCardBySlug(
		context.context,
		context.session,
		'user-jviotti@latest',
	);

	expect(user.active).toBe(true);
	expect(user.data).toEqual({
		email: ['foo@bar.com', 'juan@resin.io'],
		roles: [],
		hash: 'PASSWORDLESS',
		profile: {
			title: 'Software Engineer',
			name: {
				first: 'Juan',
			},
		},
	});
});

import { testUtils as coreTestUtils } from 'autumndb';
import { channelsPlugin } from '@balena/jellyfish-plugin-channels';
import { defaultPlugin } from '@balena/jellyfish-plugin-default';
import { productOsPlugin } from '@balena/jellyfish-plugin-product-os';
import { UserContract } from '@balena/jellyfish-types/build/core';
import { testUtils as workerTestUtils } from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import nock from 'nock';
import { discoursePlugin } from '../../lib';

let ctx: workerTestUtils.TestContext;

beforeAll(async () => {
	ctx = await workerTestUtils.newContext({
		plugins: [
			productOsPlugin(),
			defaultPlugin(),
			channelsPlugin(),
			discoursePlugin(),
		],
	});

	// Disable all triggers
	ctx.worker.setTriggers(ctx.logContext, []);

	await workerTestUtils.translateBeforeAll(ctx);
});

afterEach(async () => {
	await workerTestUtils.translateAfterEach(ctx);
});

afterAll(() => {
	return workerTestUtils.destroyContext(ctx);
});

test('should not change the same user email', async () => {
	await ctx.kernel.insertContract(ctx.logContext, ctx.session, {
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
			require('./webhooks/inbound-tag-tag/stubs/1/admin-users-4-json.json'),
		);

	nock('https://forums.balena.io')
		.get('/t/6061.json')
		.query({
			print: true,
			include_raw: 1,
		})
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/t-6061-json-print-true-include-raw-1.json'),
		);

	nock('https://forums.balena.io')
		.get('/categories.json')
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/categories-json.json'),
		);

	nock('https://forums.balena.io')
		.get('/posts/33998.json')
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/posts-33998-json.json'),
		);

	for (const externalEvent of [
		Object.assign({}, require('./webhooks/inbound-tag-tag/01.json'), {
			source: 'discourse',
		}),
	]) {
		const event = await ctx.createContract(
			ctx.adminUserId,
			ctx.session,
			'external-event@1.0.0',
			coreTestUtils.generateRandomId(),
			externalEvent,
		);
		const request = await ctx.queue.producer.enqueue(
			ctx.worker.getId(),
			ctx.session,
			{
				logContext: ctx.logContext,
				action: 'action-integration-import-event@1.0.0',
				card: event.id,
				type: event.type,
				arguments: {},
			},
		);

		await ctx.flushAll(ctx.session);
		const result = await ctx.queue.producer.waitResults(
			ctx.logContext,
			request,
		);
		expect(result.error).toBe(false);
	}

	const user = await ctx.kernel.getContractBySlug(
		ctx.logContext,
		ctx.session,
		'user-jviotti@latest',
	);
	assert(user);

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
	nock('https://forums.balena.io')
		.persist()
		.get('/admin/users/4.json')
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/admin-users-4-json.json'),
		);

	nock('https://forums.balena.io')
		.persist()
		.get('/t/6061.json')
		.query({
			print: true,
			include_raw: 1,
		})
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/t-6061-json-print-true-include-raw-1.json'),
		);

	nock('https://forums.balena.io')
		.persist()
		.get('/categories.json')
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/categories-json.json'),
		);

	nock('https://forums.balena.io')
		.persist()
		.get('/posts/33998.json')
		.reply(
			200,
			require('./webhooks/inbound-tag-tag/stubs/1/posts-33998-json.json'),
		);

	await ctx.kernel.insertContract<UserContract>(ctx.logContext, ctx.session, {
		slug: 'user-jviotti',
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'foo@bar.com',
			hash: 'PASSWORDLESS',
			roles: [],
		},
	});

	for (const externalEvent of [
		Object.assign({}, require('./webhooks/inbound-tag-tag/01.json'), {
			source: 'discourse',
		}),
	]) {
		const event = await ctx.createContract(
			ctx.adminUserId,
			ctx.session,
			'external-event@1.0.0',
			'foobar',
			externalEvent,
		);
		const request = await ctx.queue.producer.enqueue(
			ctx.worker.getId(),
			ctx.session,
			{
				logContext: ctx.logContext,
				action: 'action-integration-import-event@1.0.0',
				card: event.id,
				type: event.type,
				arguments: {},
			},
		);
		await ctx.flushAll(ctx.session);

		const result = await ctx.queue.producer.waitResults(
			ctx.logContext,
			request,
		);
		expect(result.error).toBe(false);
	}

	const user = await ctx.kernel.getContractBySlug(
		ctx.logContext,
		ctx.session,
		'user-jviotti@latest',
	);
	assert(user);

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

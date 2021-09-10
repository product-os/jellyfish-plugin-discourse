/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { integrationHelpers } from '@balena/jellyfish-test-harness';
import * as _ from 'lodash';
import Bluebird from 'bluebird';
import request from 'request';
import { v4 as uuid } from 'uuid';
import { strict as assert } from 'assert';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { Contract } from '@balena/jellyfish-types/build/core';
import { ProductOsPlugin } from '@balena/jellyfish-plugin-product-os';
import { DefaultPlugin } from '@balena/jellyfish-plugin-default';
import ActionLibrary = require('@balena/jellyfish-action-library');
import { DiscoursePlugin } from '../../../lib';
const TOKEN = environment.integration.discourse;

let ctx: integrationHelpers.IntegrationTestContext;
let userSession: string;
let user: Contract;

const setUser = async (username: string) => {
	// Create the user, only if it doesn't exist yet
	user =
		(await ctx.jellyfish.getCardBySlug(
			ctx.context,
			ctx.session,
			`user-${username}@latest`,
		)) ||
		(await ctx.jellyfish.insertCard(ctx.context, ctx.session, {
			type: 'user@1.0.0',
			slug: `user-${username}`,
			data: {
				email: `${username}@example.com`,
				hash: 'foobar',
				roles: ['user-community'],
			},
		}));

	// Force login, even if we don't know the password
	const session = await ctx.jellyfish.insertCard(ctx.context, ctx.session, {
		slug: `session-${user.slug}-integration-tests-${uuid()}`,
		type: 'session@1.0.0',
		data: {
			actor: user.id,
		},
	});

	userSession = session.id;
};

beforeAll(async () => {
	ctx = await integrationHelpers.before([
		ActionLibrary,
		ProductOsPlugin,
		DefaultPlugin,
		DiscoursePlugin,
	]);

	const username = environment.integration.discourse.username;

	await setUser(username);
});

afterAll(() => {
	return integrationHelpers.after(ctx);
});

const category = environment.test.integration.discourse.category;

const createWhisper = (target: Contract, body: string) => {
	return ctx.createWhisper(user.id, userSession, target, body);
};

const createMessage = (target: Contract, body: string) => {
	return ctx.createMessage(user.id, userSession, target, body);
};

const deleteTopic = async (id: string) => {
	return new Bluebird((resolve, reject) => {
		request(
			{
				method: 'DELETE',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: `/t/${id}.json`,
				headers: {
					'Api-Key': TOKEN.api,
					'Api-Username': TOKEN.username,
				},
			},
			(error, response, body) => {
				if (error) {
					return reject(error);
				}

				if (response.statusCode === 429) {
					return deleteTopic(id).then(resolve).catch(reject);
				}

				if (response.statusCode !== 200) {
					return reject(
						new Error(
							`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`,
						),
					);
				}

				return resolve();
			},
		);
	});
};

const getTopic = async (id) => {
	return new Bluebird((resolve, reject) => {
		request(
			{
				method: 'GET',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: `/t/${id}.json?include_raw=1`,
				headers: {
					'Api-Key': TOKEN.api,
					'Api-Username': TOKEN.username,
				},
			},
			(error, response, body) => {
				if (error) {
					return reject(error);
				}

				if (response.statusCode === 429) {
					return getTopic(id).then(resolve).catch(reject);
				}

				if (response.statusCode === 404) {
					return resolve(null);
				}

				if (response.statusCode !== 200) {
					return reject(
						new Error(
							`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`,
						),
					);
				}

				return resolve(body);
			},
		);
	});
};

const createSupportThread = async (
	username: string,
	title: string,
	description: string,
): Promise<any> => {
	return new Bluebird((resolve, reject) => {
		request(
			{
				method: 'POST',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: '/posts.json',
				body: {
					title,
					raw: description,
					category: _.parseInt(category),
				},
				headers: {
					'Api-Key': TOKEN.api,
					'Api-Username': username,
				},
			},
			(error, response, body) => {
				if (error) {
					return reject(error);
				}

				if (response.statusCode === 429) {
					return createSupportThread(username, title, description)
						.then(resolve)
						.catch(reject);
				}

				if (response.statusCode !== 200) {
					return reject(
						new Error(
							`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`,
						),
					);
				}

				return resolve(body);
			},
		);
	});
};

const startSupportThread = async (username: string) => {
	const title = ctx.generateRandomWords(5);
	const description = ctx.generateRandomWords(10);

	const post = await createSupportThread(username, title, description);
	const slug = ctx.generateRandomSlug({
		prefix: 'support-thread-discourse-test',
	});

	if (!post.topic_id) {
		throw new Error(`No topic id in post: ${JSON.stringify(post, null, 2)}`);
	}

	const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

	const result = await ctx.worker.insertCard(
		ctx.context,
		userSession,
		typeContract,
		{
			attachEvents: true,
			actor: user.id,
		},
		{
			name: title,
			slug,
			version: '1.0.0',
			data: {
				mirrors: [`https://forums.balena.io/t/${post.topic_id}`],
				environment: 'production',
				inbox: 'S/Forums',
				mentionsUser: [],
				alertsUser: [],
				description: '',
				status: 'open',
			},
		},
	);

	await ctx.flushAll(userSession);

	return result;
};

describe('mirror', () => {
	it('should send, but not sync, a whisper to a deleted thread', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		await deleteTopic(topicId as string);

		const message = ctx.generateRandomWords(5);

		const eventResponse = await createWhisper(supportThread, message);

		assert(eventResponse !== null);

		// Give it some time to make sure that no syncing took place
		await Bluebird.delay(5000);

		const thread = await ctx.jellyfish.getCardBySlug(
			ctx.context,
			ctx.session,
			`${eventResponse.slug}@${eventResponse.version}`,
		);

		assert(thread !== null);

		expect(thread.data.mirrors).toBeFalsy();

		const topic: any = await getTopic(topicId);

		expect(
			_.some(topic.post_stream.posts, {
				raw: message,
			}),
		).toBeFalsy();
	});

	it('should send, but not sync, a message to a deleted thread', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		await deleteTopic(topicId as string);

		const message = ctx.generateRandomWords(5);

		const eventResponse = await createMessage(supportThread, message);
		assert(eventResponse !== null);

		// Give it some time to make sure that no syncing took place
		await Bluebird.delay(5000);

		const thread = await ctx.jellyfish.getCardBySlug(
			ctx.context,
			ctx.session,
			`${eventResponse.slug}@${eventResponse.version}`,
		);

		assert(thread !== null);

		expect(thread.data.mirrors).toBeFalsy();

		const topic: any = await getTopic(topicId);

		expect(
			_.some(topic.post_stream.posts, {
				raw: message,
			}),
		).toBeFalsy();
	});

	it.only('should send a whisper as a non moderator user', async () => {
		const { nonModeratorUsername } = environment.test.integration.discourse;

		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		// Switch to a non-moderator user for the next part of the test
		await setUser(nonModeratorUsername);

		const content = ctx.generateRandomWords(50);
		const whisper = await createWhisper(supportThread, content);
		assert(whisper !== null);
		const postNumber = parseInt(
			(whisper as any).data.mirrors[0].split('/').pop(),
			10,
		);

		const mirrorId: string = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		expect(lastPost.username).not.toBe(nonModeratorUsername);
		expect(lastPost.username).toBe(environment.integration.discourse.username);
		expect(lastPost.cooked).toBe(
			[
				`<p>(${nonModeratorUsername}) ${content}</p>`,
				'<hr>',
				'<blockquote>',
				[
					'<p>This message was posted as',
					`<a class="mention" href="/u/${lastPost.username}">@${lastPost.username}</a> because`,
					`<a class="mention" href="/u/${nonModeratorUsername}">@${nonModeratorUsername}</a>`,
					'is not a Discourse moderator</p>',
				].join(' '),
				'</blockquote>',
			].join('\n'),
		);
		expect(lastPost.post_type).toBe(4);

		// Switch back to standard test user for other tests
		await setUser(environment.integration.discourse.username);
	});

	it('should send a message as a non moderator user', async () => {
		const { nonModeratorUsername } = environment.test.integration.discourse;

		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		// Switch to a non-moderator user for the next part of the test
		await setUser(nonModeratorUsername);

		const content = ctx.generateRandomWords(50);
		const message = await createMessage(supportThread, content);
		const postNumber = parseInt(
			(message as any).data.mirrors[0].split('/').pop(),
			10,
		);

		const mirrorId: string = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		expect(lastPost.username).not.toBe(nonModeratorUsername);
		expect(lastPost.cooked).toBe(`<p>${content}</p>`);
		expect(lastPost.post_type).toBe(1);

		// Switch back to standard test user for other tests
		await setUser(environment.integration.discourse.username);
	});

	it('should not update a post by defining no new tags', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/tags',
					value: [],
				},
			],
		);

		await ctx.flushAll(userSession);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		expect(topic.tags).toEqual([]);
		const firstPost = topic.post_stream.posts[0];
		expect(firstPost.updated_at).toBe(firstPost.created_at);
	});

	it('should add and remove a thread tag', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/tags',
					value: ['foo'],
				},
			],
		);

		await ctx.flushAll(userSession);

		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/tags',
					value: [],
				},
			],
		);

		await ctx.flushAll(userSession);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		expect(topic.tags).toEqual([]);
	});

	it('should add a thread tag', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/data/tags',
					value: ['foo'],
				},
			],
		);

		const mirrorId = (supportThread as any).data.mirrors[0];

		await Bluebird.delay(5000);
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		expect(topic.tags).toEqual(['foo']);
	});

	it('should not sync top level tags', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/tags',
					value: [],
				},
			],
		);

		// Wait to make sure no syncing happens
		await Bluebird.delay(5000);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		expect(topic.tags).toEqual([]);
	});

	it('should send a whisper', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const content = ctx.generateRandomWords(50);
		const whisper: any = await createWhisper(supportThread, content);
		const postNumber = parseInt(whisper.data.mirrors[0].split('/').pop(), 10);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		expect(lastPost.username).toBe(environment.integration.discourse.username);
		expect(lastPost.cooked).toBe(`<p>${content}</p>`);
		expect(lastPost.post_type).toBe(4);
	});

	it('should update a whisper', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const content = ctx.generateRandomWords(50);
		const whisper: any = await createWhisper(supportThread, content);
		const postNumber = parseInt(whisper.data.mirrors[0].split('/').pop(), 10);

		const mirrorId = (supportThread as any).data.mirrors[0];

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		const newContent = ctx.generateRandomWords(50);
		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			whisper,
			[
				{
					op: 'replace',
					path: '/data/payload/message',
					value: newContent,
				},
			],
		);

		await ctx.flushAll(userSession);

		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		expect(lastPost.username).toBe(environment.integration.discourse.username);
		expect(lastPost.cooked).toBe(`<p>${newContent}</p>`);
		expect(lastPost.post_type).toBe(4);
	});

	it('should send a message', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const content = ctx.generateRandomWords(50);
		const message: any = await createMessage(supportThread, content);
		const postNumber = parseInt(message.data.mirrors[0].split('/').pop(), 10);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		expect(lastPost.username).toBe(environment.integration.discourse.username);
		expect(lastPost.cooked).toBe(`<p>${content}</p>`);
		expect(lastPost.post_type).toBe(1);
	});

	it('should update a message', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const content = ctx.generateRandomWords(50);
		const message: any = await createMessage(supportThread, content);
		const postNumber = parseInt(message.data.mirrors[0].split('/').pop(), 10);

		const mirrorId = (supportThread as any).data.mirrors[0];

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		const newContent = ctx.generateRandomWords(50);
		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			message,
			[
				{
					op: 'replace',
					path: '/data/payload/message',
					value: newContent,
				},
			],
		);

		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		expect(lastPost.username).toBe(environment.integration.discourse.username);
		expect(lastPost.cooked).toBe(`<p>${newContent}</p>`);
		expect(lastPost.post_type).toBe(1);
	});

	it('should update the thread title', async () => {
		const supportThread = await startSupportThread(
			environment.integration.discourse.username,
		);

		assert(supportThread !== null);

		const newTitle = `${ctx.generateRandomWords(10)} ${uuid()}`;

		const typeContract = ctx.worker.typeContracts['support-thread@1.0.0'];

		await ctx.worker.patchCard(
			ctx.context,
			userSession,
			typeContract,
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/name',
					value: newTitle,
				},
			],
		);

		const mirrorId = (supportThread as any).data.mirrors[0];
		const topic: any = await getTopic(_.last(mirrorId.split('/')));
		expect(topic.title).toEqual(newTitle);
	});
});

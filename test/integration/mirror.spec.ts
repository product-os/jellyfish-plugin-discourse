import { defaultEnvironment } from '@balena/jellyfish-environment';
import { testUtils as workerTestUtils } from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import {
	AutumnDBSession,
	testUtils as autumndbTestUtils,
	UserContract,
} from 'autumndb';
import Bluebird from 'bluebird';
import _ from 'lodash';
import nock from 'nock';
import request from 'request';
import { discoursePlugin } from '../../lib';

const TOKEN = defaultEnvironment.integration.discourse;
const { category } = defaultEnvironment.test.integration.discourse;

let ctx: workerTestUtils.TestContext;
let user: UserContract;
let session: AutumnDBSession;

beforeAll(async () => {
	ctx = await workerTestUtils.newContext({
		plugins: [discoursePlugin()],
	});

	// Standard user
	await ctx.createUser(defaultEnvironment.integration.discourse.username);
	await ctx.createUser(
		defaultEnvironment.test.integration.discourse.nonModeratorUsername,
	);
});

afterEach(() => {
	nock.cleanAll();
});

afterAll(() => {
	return workerTestUtils.destroyContext(ctx);
});

const setUser = async (username: string) => {
	const result = await ctx.kernel.getContractBySlug<UserContract>(
		ctx.logContext,
		ctx.session,
		`user-${username}@latest`,
	);
	assert(result);
	user = result;
	session = { actor: user };
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
			(error: any, response: any, body: any) => {
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

				console.log('deleteTopic.body:', body);
				return resolve();
			},
		);
	});
};

const getTopic = async (id: string) => {
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
			(error: any, response: any, body: any) => {
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

				console.log('getTopic.body:', body);
				return resolve(body);
			},
		);
	});
};

const createPost = async (
	username: string,
	title: string,
	description: string,
): Promise<any> => {
	const post: any = await new Bluebird((resolve, reject) => {
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
			(error: any, response: any, body: any) => {
				if (error) {
					return reject(error);
				}

				if (response.statusCode === 429) {
					return createPost(username, title, description)
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

				console.log('createPost.body:', body);
				return resolve(body);
			},
		);
	});
	assert(post.topic_id);

	return post;
};

const startSupportThread = async (username: string) => {
	const title = autumndbTestUtils.generateRandomId();
	const description = autumndbTestUtils.generateRandomId();
	const post = await createPost(username, title, description);

	return ctx.createSupportThread(user.id, session, title, {
		mirrors: [`https://forums.balena.io/t/${post.topic_id}`],
		environment: 'production',
		inbox: 'S/Forums',
		mentionsUser: [],
		alertsUser: [],
		description: '',
		status: 'open',
	});
};

describe('mirror', () => {
	it.only('should send, but not sync, a whisper to a deleted thread', async () => {
		nock('https://forums.balena.io')
			.persist()
			.get('/users/jellyfish.json')
			.reply(200, {
				user: {
					id: 1,
					username: 'jellyfish',
				},
			});
		nock('https://forums.balena.io')
			.persist()
			.get('/u/jellyfish/emails.json')
			.reply(200, {
				email: 'jellyfish@balena.io',
			});

		nock('https://forums.balena.io').persist().post('/posts.json').reply(200, {
			topic_id: 123,
		});
		nock('https://forums.balena.io').delete('/t/123.json').reply(200, {});
		nock('https://forums.balena.io')
			.get('/t/123.json?include_raw=1')
			.reply(200, {
				post_stream: {
					posts: [],
				},
			});
		nock('https://forums.balena.io')
			.persist()
			.get('/t/123.json')
			.reply(200, {
				post_stream: {
					posts: [],
				},
			});
		nock('https://forums.balena.io')
			.persist()
			.get('/t/123')
			.reply(200, {
				post_stream: {
					posts: [],
				},
			});
		nock('https://forums.balena.io')
			.put('/t/-/123.json')
			.reply(200, {
				post_stream: {
					posts: [],
				},
			});

		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);

		// Delete the remote thread
		await deleteTopic(topicId);

		// Create a whisper on the local support thread
		const message = autumndbTestUtils.generateRandomId();
		const eventResponse = await ctx.createWhisper(
			user.id,
			session,
			supportThread,
			message,
		);

		// Wait a bit to make sure that no syncing took place
		await new Promise((resolve) => {
			setTimeout(resolve, 5000);
		});

		// Confirm that no mirrors were set on local whisper
		const whisper = await ctx.kernel.getContractBySlug(
			ctx.logContext,
			ctx.session,
			`${eventResponse.slug}@${eventResponse.version}`,
		);
		assert(whisper);
		expect(whisper.data.mirrors).toBeFalsy();

		// Confirm that the whisper doesn't exist remotely
		const topic: any = await getTopic(topicId);
		expect(
			_.some(topic.post_stream.posts, {
				raw: message,
			}),
		).toBeFalsy();
	});

	it('should send, but not sync, a message to a deleted thread', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		await deleteTopic(topicId);

		// Create a message on the local support thread
		const content = autumndbTestUtils.generateRandomId();
		const eventResponse = await ctx.createMessage(
			user.id,
			session,
			supportThread,
			content,
		);

		// Wait a bit to make sure that no syncing took place
		await new Promise((resolve) => {
			setTimeout(resolve, 5000);
		});

		// Confirm that no mirrors were set on local whisper
		const message = await ctx.kernel.getContractBySlug(
			ctx.logContext,
			ctx.session,
			`${eventResponse.slug}@${eventResponse.version}`,
		);
		assert(message);
		expect(message.data.mirrors).toBeFalsy();

		// Confirm that the whisper doesn't exist remotely
		const topic: any = await getTopic(topicId);
		expect(
			_.some(topic.post_stream.posts, {
				raw: content,
			}),
		).toBeFalsy();
	});

	it('should send a whisper as a non moderator user', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const { nonModeratorUsername } =
			defaultEnvironment.test.integration.discourse;
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Create whisper on support thread with non-moderator user
		await setUser(nonModeratorUsername);
		const content = autumndbTestUtils.generateRandomId();
		const whisper = await ctx.createWhisper(
			user.id,
			session,
			supportThread,
			content,
		);
		await ctx.waitForMatch({
			type: 'object',
			required: ['id', 'data'],
			properties: {
				id: {
					type: 'string',
					const: whisper.id,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					properties: {
						mirrors: {
							type: 'array',
							minItems: 1,
						},
					},
				},
			},
		});

		// Get remote post number from local whisper
		const postNumber = parseInt(
			(whisper.data as any).mirrors[0].split('/').pop(),
			10,
		);

		// Get last post from remote topic
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		// Confirm remote post properties
		expect(lastPost.username).not.toBe(nonModeratorUsername);
		expect(lastPost.username).toBe(
			defaultEnvironment.integration.discourse.username,
		);
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
	});

	it('should send a message as a non moderator user', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const { nonModeratorUsername } =
			defaultEnvironment.test.integration.discourse;
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Create message on support thread with non-moderator user
		await setUser(nonModeratorUsername);
		const content = autumndbTestUtils.generateRandomId();
		const message = await ctx.createMessage(
			user.id,
			session,
			supportThread,
			content,
		);
		await ctx.waitForMatch({
			type: 'object',
			required: ['id', 'data'],
			properties: {
				id: {
					type: 'string',
					const: message.id,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					properties: {
						mirrors: {
							type: 'array',
							minItems: 1,
						},
					},
				},
			},
		});

		// Get remote post number from local message
		const postNumber = parseInt(
			(message.data as any).mirrors[0].split('/').pop(),
			10,
		);

		// Get last post from remote topic
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		// Confirm remote post properties
		expect(lastPost.username).toBe(nonModeratorUsername);
		expect(lastPost.cooked).toBe(`<p>${content}</p>`);
		expect(lastPost.post_type).toBe(1);
	});

	it('should not update a post by defining no new tags', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Patch support thread tags with no changes
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['support-thread@1.0.0'],
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/data/tags',
					value: [],
				},
			],
		);
		await ctx.flushAll(session);

		// Confirm remote post properties
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		expect(topic.tags).toEqual([]);
		const firstPost = topic.post_stream.posts[0];
		expect(firstPost.updated_at).toBe(firstPost.created_at);
	});

	it('should add and remove a thread tag', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Add a tag to the local support thread
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['support-thread@1.0.0'],
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
		await ctx.flushAll(session);

		// Now remove the new tag
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['support-thread@1.0.0'],
			{
				attachEvents: true,
				actor: user.id,
			},
			supportThread,
			[
				{
					op: 'replace',
					path: '/data/tags',
					value: [],
				},
			],
		);
		await ctx.flushAll(session);

		// Check that the remote topic has no tags
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		await ctx.retry(
			() => {
				return getTopic(topicId);
			},
			(topic: any) => {
				return topic.tags.length === 0;
			},
		);
	});

	it('should add a thread tag', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Add a tag to the local support thread
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['support-thread@1.0.0'],
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
		await ctx.flushAll(session);

		// Check that the remote topic has the new tag
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		await ctx.retry(
			() => {
				return getTopic(topicId);
			},
			(topic: any) => {
				return topic.tags.length === 1 && topic.tags[0] === 'foo';
			},
		);
	});

	it('should not sync top level tags', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Add a new top-level tag
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['support-thread@1.0.0'],
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
		await ctx.flushAll(session);

		// Wait to make sure no syncing happens
		await new Promise((resolve) => {
			setTimeout(resolve, 5000);
		});

		// Confirm that the remote topic has no tags
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		expect(topic.tags).toEqual([]);
	});

	it('should send a whisper', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Create a whisper on the local support thread
		const content = autumndbTestUtils.generateRandomId();
		const whisper = await ctx.createWhisper(
			user.id,
			session,
			supportThread,
			content,
		);
		await ctx.waitForMatch({
			type: 'object',
			required: ['id', 'data'],
			properties: {
				id: {
					type: 'string',
					const: whisper.id,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					properties: {
						mirrors: {
							type: 'array',
							minItems: 1,
						},
					},
				},
			},
		});

		// Get the remote post number from the local whisper
		const postNumber = parseInt(
			(whisper.data as any).mirrors[0].split('/').pop(),
			10,
		);

		// Get the last post from the remote topic
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		// Confirm remote post properties
		expect(lastPost.username).toBe(
			defaultEnvironment.integration.discourse.username,
		);
		expect(lastPost.cooked).toBe(`<p>${content}</p>`);
		expect(lastPost.post_type).toBe(4);
	});

	it('should update a whisper', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Create a whisper on the local support thread
		const content = autumndbTestUtils.generateRandomId();
		const whisper = await ctx.createWhisper(
			user.id,
			session,
			supportThread,
			content,
		);
		await ctx.waitForMatch({
			type: 'object',
			required: ['id', 'data'],
			properties: {
				id: {
					type: 'string',
					const: whisper.id,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					properties: {
						mirrors: {
							type: 'array',
							minItems: 1,
						},
					},
				},
			},
		});

		// Update the local whisper
		const newContent = autumndbTestUtils.generateRandomId();
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['whisper@1.0.0'],
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
		await ctx.flushAll(session);

		// Get last post from remote topic
		const postNumber = parseInt(
			(whisper.data as any).mirrors[0].split('/').pop(),
			10,
		);
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		// Confirm that the remote post has the updated content
		expect(lastPost.username).toBe(
			defaultEnvironment.integration.discourse.username,
		);
		expect(lastPost.cooked).toBe(`<p>${newContent}</p>`);
		expect(lastPost.post_type).toBe(4);
	});

	it('should send a message', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Create a message on the local support thread
		const content = autumndbTestUtils.generateRandomId();
		const message = await ctx.createMessage(
			user.id,
			session,
			supportThread,
			content,
		);
		await ctx.waitForMatch({
			type: 'object',
			required: ['id', 'data'],
			properties: {
				id: {
					type: 'string',
					const: message.id,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					properties: {
						mirrors: {
							type: 'array',
							minItems: 1,
						},
					},
				},
			},
		});

		// Get the remote post number from the local message
		const postNumber = parseInt(
			(message.data as any).mirrors[0].split('/').pop(),
			10,
		);

		// Get the last post from the remote topic
		const mirrorId: string = (supportThread as any).data.mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		// Confirm remote post properties
		expect(lastPost.username).toBe(
			defaultEnvironment.integration.discourse.username,
		);
		expect(lastPost.cooked).toBe(`<p>${content}</p>`);
		expect(lastPost.post_type).toBe(1);
	});

	it('should update a message', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Create a message on the local support thread
		const content = autumndbTestUtils.generateRandomId();
		const message = await ctx.createMessage(
			user.id,
			session,
			supportThread,
			content,
		);
		await ctx.waitForMatch({
			type: 'object',
			required: ['id', 'data'],
			properties: {
				id: {
					type: 'string',
					const: message.id,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					properties: {
						mirrors: {
							type: 'array',
							minItems: 1,
						},
					},
				},
			},
		});

		// Update the local message
		const newContent = autumndbTestUtils.generateRandomId();
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['message@1.0.0'],
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
		await ctx.flushAll(session);

		// Get last post from remote topic
		const postNumber = parseInt(
			(message.data as any).mirrors[0].split('/').pop(),
			10,
		);
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		const topic: any = await getTopic(topicId);
		const lastPost = _.find(topic.post_stream.posts, {
			post_number: postNumber,
		});

		// Confirm that the remote post has the updated content
		expect(lastPost.username).toBe(
			defaultEnvironment.integration.discourse.username,
		);
		expect(lastPost.cooked).toBe(`<p>${newContent}</p>`);
		expect(lastPost.post_type).toBe(1);
	});

	it('should update the thread title', async () => {
		await setUser(defaultEnvironment.integration.discourse.username);

		// Create a Discourse thread and tie it to a support thread
		const supportThread = await startSupportThread(
			defaultEnvironment.integration.discourse.username,
		);

		// Update local support thread title
		const newTitle = autumndbTestUtils.generateRandomId();
		await ctx.worker.patchCard(
			ctx.logContext,
			session,
			ctx.worker.typeContracts['support-thread@1.0.0'],
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
		await ctx.flushAll(session);

		// Confirm that the remote topic's title has changed
		const mirrorId: string = (supportThread.data as any).mirrors[0];
		const topicId = _.last(mirrorId.split('/'));
		assert(topicId);
		await ctx.retry(
			() => {
				return getTopic(topicId);
			},
			(topic: any) => {
				return topic.title === newTitle;
			},
		);
	});
});

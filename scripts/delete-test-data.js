#!/usr/bin/env node

/*
 * This script searches for and deletes old test Discourse posts and topics.
 * Usage: INTEGRATION_DISCOURSE_USERNAME=<...> INTEGRATION_DISCOURSE_TOKEN=<...> ./scripts/delete-test-data.js
 */

const environment = require('@balena/jellyfish-environment').defaultEnvironment;
const axios = require('axios');
const qs = require('qs');

const forums = 'https://forums.balena.io';
const headers = {
	'Api-Username': environment.integration.discourse.username,
	'Api-Key': environment.integration.discourse.api
};

const TIMEOUT = 10000;
const today = new Date();
const yesterday = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0];

/**
 * @summary Search for old test Discourse topics
 * @function
 *
 * @returns {Promise<Array<Object>>} - list of topics to delete
 */
async function getTopics() {
	const query = qs.stringify({
		q: `#sandbox before:${yesterday} @jellyfish`
	});
	const results = await new Promise((resolve) => {
		resolve(axios({
			method: 'GET',
			headers,
			url: `${forums}/search.json?${query}`
		}));
	});
	return results.data.topics;
}

/**
 * @summary Search for and remove old test topics
 * @function
 *
 * @returns {Promise<void>}
 */
async function deleteTopics() {
	const topics = await getTopics();
	if (!topics || topics.length < 1) {
		return;
	}

	for (const topic of topics) {
		console.log('Deleting topic:', topic.id, `(${topic.title})`);
		await new Promise((resolve) => {
			setTimeout(resolve, TIMEOUT);
		});
		await new Promise((resolve) => {
			resolve(axios({
				method: 'DELETE',
				headers,
				url: `${forums}/t/${topic.id}.json`
			}));
		});
	};
	await deleteTopics();
}

async function run() {
	await deleteTopics();
}

run();

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { v4 as uuidv4 } from 'uuid';
import * as utils from '../../../lib/integrations/utils';

describe('attachCards()', () => {
	test('should return a link card', () => {
		const fromCard = {
			id: uuidv4(),
			slug: `foo-${uuidv4()}`,
			type: 'foo@1.0.0',
		};
		const toCard = {
			id: uuidv4(),
			slug: `bar-${uuidv4()}`,
			type: 'bar@1.0.0',
		};
		const options = {
			actor: uuidv4(),
		};
		const result = utils.attachCards(new Date(), fromCard, toCard, options);
		expect(result.actor).toEqual(options.actor);
		expect(result.card).toEqual({
			slug: `link-${fromCard.slug}-is-attached-to-${toCard.slug}`,
			type: 'link@1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: fromCard.id,
					type: fromCard.type,
				},
				to: {
					id: toCard.id,
					type: toCard.type,
				},
			},
		});
	});
});

describe('postEvent()', () => {
	test('should return an empty array when no event card is provided', () => {
		const result = utils.postEvent([], undefined, {}, {});
		expect(result).toEqual([]);
	});

	test('should return an array of expected objects', () => {
		const sequence = [
			{
				id: uuidv4(),
				slug: `card-${uuidv4()}`,
				type: 'card@1.0.0',
			},
		];
		const eventCard = {
			id: uuidv4(),
			slug: `event-${uuidv4()}`,
			type: 'event@1.0.0',
			data: {
				timestamp: new Date().getTime(),
			},
		};
		const targetCard = {
			id: uuidv4(),
			slug: `target-${uuidv4()}`,
			type: 'target@1.0.0',
		};
		const options = {
			actor: uuidv4(),
		};
		const result = utils.postEvent(sequence, eventCard, targetCard, options);

		expect(result[0]).toEqual({
			time: new Date(eventCard.data.timestamp),
			actor: options.actor,
			card: eventCard,
		});
		expect(result[1]).toEqual({
			time: new Date(eventCard.data.timestamp),
			actor: options.actor,
			card: {
				name: 'is attached to',
				slug: `link-${eventCard.slug}-is-attached-to-${targetCard.slug}`,
				type: 'link@1.0.0',
				data: {
					inverseName: 'has attached element',
					from: {
						id: {
							$eval: `cards[${sequence.length}].id`,
						},
						type: eventCard.type,
					},
					to: {
						type: targetCard.type,
					},
				},
			},
		});
	});
});

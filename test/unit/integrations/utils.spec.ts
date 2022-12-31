import { randomUUID } from 'node:crypto';
import * as utils from '../../../lib/integrations/utils';

describe('attachCards()', () => {
	test('should return a link card', () => {
		const fromCard = {
			id: randomUUID(),
			slug: `foo-${randomUUID()}`,
			type: 'foo@1.0.0',
		};
		const toCard = {
			id: randomUUID(),
			slug: `bar-${randomUUID()}`,
			type: 'bar@1.0.0',
		};
		const options = {
			actor: randomUUID(),
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
				id: randomUUID(),
				slug: `card-${randomUUID()}`,
				type: 'card@1.0.0',
			},
		];
		const eventCard = {
			id: randomUUID(),
			slug: `event-${randomUUID()}`,
			type: 'event@1.0.0',
			data: {
				timestamp: new Date().getTime(),
			},
		};
		const targetCard = {
			id: randomUUID(),
			slug: `target-${randomUUID()}`,
			type: 'target@1.0.0',
		};
		const options = {
			actor: randomUUID(),
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

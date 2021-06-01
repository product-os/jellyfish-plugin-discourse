/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

export function attachCards(
	date: any,
	fromCard: any,
	toCard: any,
	options: any,
): any {
	return {
		time: date,
		actor: options.actor,
		card: {
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
		},
	};
}

export function postEvent(
	sequence: any,
	eventCard: any,
	targetCard: any,
	options: any,
): any {
	if (!eventCard) {
		return [];
	}

	const date = new Date(eventCard.data.timestamp);
	return [
		{
			time: date,
			actor: options.actor,
			card: eventCard,
		},
		attachCards(
			date,
			{
				id: {
					$eval: `cards[${sequence.length}].id`,
				},
				slug: eventCard.slug,
				type: eventCard.type,
			},
			{
				id: eventCard.data.target,
				slug: targetCard.slug,
				type: targetCard.type,
			},
			{
				actor: options.actor,
			},
		),
	];
}

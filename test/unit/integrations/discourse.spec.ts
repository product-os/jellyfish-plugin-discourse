import * as integration from '../../../lib/integrations/discourse';

const isEventValid = integration['isEventValid'];
const context = {
	id: 'jellyfish-plugin-discourse-test',
};

describe('isEventValid()', () => {
	test('should return true given no signature header', async () => {
		const result = isEventValid(
			{
				api: 'xxxxx',
				signature: 'secret',
			},
			'....',
			{},
			context,
		);
		expect(result).toBe(true);
	});

	test('should return false given a signature but no key', async () => {
		const result = isEventValid(
			null,
			'....',
			{ 'x-discourse-event-signature': 'sha256=aaaabbbbcccc' },
			context,
		);
		expect(result).toBe(false);
	});

	test('should return false given a signature mismatch', async () => {
		const result = isEventValid(
			{
				api: 'xxxxx',
				signature: 'secret',
			},
			'{"foo":"bar"}',
			{ 'x-discourse-event-signature': 'sha256=foobarbaz' },
			context,
		);
		expect(result).toBe(false);
	});

	test('should return true given a signature match', async () => {
		const result = isEventValid(
			{
				api: 'xxxxx',
				signature: 'secret',
			},
			'{"foo":"bar"}',
			{
				'x-discourse-event-signature':
					'sha256=3f3ab3986b656abb17af3eb1443ed6c08ef8fff9fea83915909d1b421aec89be',
			},
			context,
		);
		expect(result).toBe(true);
	});
});

import { randomUUID } from 'node:crypto';
import { discourseIntegrationDefinition } from '../../../lib/integrations/discourse';

const logContext = {
	id: `test-${randomUUID()}`,
};

describe('isEventValid()', () => {
	test('should return true given no signature header', async () => {
		const result = discourseIntegrationDefinition.isEventValid(
			logContext,
			{
				api: 'xxxxx',
				signature: 'secret',
			},
			'....',
			{},
		);
		expect(result).toBe(true);
	});

	test('should return false given a signature but no key', async () => {
		const result = discourseIntegrationDefinition.isEventValid(
			logContext,
			null,
			'....',
			{ 'x-discourse-event-signature': 'sha256=aaaabbbbcccc' },
		);
		expect(result).toBe(false);
	});

	test('should return false given a signature mismatch', async () => {
		const result = discourseIntegrationDefinition.isEventValid(
			logContext,
			{
				api: 'xxxxx',
				signature: 'secret',
			},
			'{"foo":"bar"}',
			{ 'x-discourse-event-signature': 'sha256=foobarbaz' },
		);
		expect(result).toBe(false);
	});

	test('should return true given a signature match', async () => {
		const result = discourseIntegrationDefinition.isEventValid(
			logContext,
			{
				api: 'xxxxx',
				signature: 'secret',
			},
			'{"foo":"bar"}',
			{
				'x-discourse-event-signature':
					'sha256=3f3ab3986b656abb17af3eb1443ed6c08ef8fff9fea83915909d1b421aec89be',
			},
		);
		expect(result).toBe(true);
	});
});

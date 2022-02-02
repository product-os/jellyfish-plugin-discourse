import type { IntegrationDefinition, Map } from '@balena/jellyfish-worker';
import { discourseIntegrationDefinition } from './discourse';

export const integrations: Map<IntegrationDefinition> = {
	discourse: discourseIntegrationDefinition,
};

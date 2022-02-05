import type { ActionDefinition } from '@balena/jellyfish-worker';
import { actionIntegrationDiscourseMirrorEvent } from './action-integration-discourse-mirror-event';

export const actions: ActionDefinition[] = [
	actionIntegrationDiscourseMirrorEvent,
];

import type { ActionFile } from '@balena/jellyfish-plugin-base';
import type { ContractData } from '@balena/jellyfish-types/build/core';
import { actionIntegrationDiscourseMirrorEvent } from './action-integration-discourse-mirror-event';

export const actions: Array<ActionFile<ContractData>> = [
	actionIntegrationDiscourseMirrorEvent,
];

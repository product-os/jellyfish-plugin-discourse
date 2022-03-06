import type { ContractDefinition } from '@balena/jellyfish-types/build/core';
import { channelDiscussionThreads } from './channel-discussion-threads';
import { triggeredActionIntegrationDiscourseMirrorEvent } from './triggered-action-integration-discourse-mirror-event';

export const contracts: ContractDefinition[] = [
	channelDiscussionThreads,
	triggeredActionIntegrationDiscourseMirrorEvent,
];

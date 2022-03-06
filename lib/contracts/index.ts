import type { ContractDefinition } from '@balena/jellyfish-types/build/core';
import { channelDiscussionThreads } from './channel-discussion-threads';
import { triggeredActionIntegrationDiscourseMirrorEvent } from './triggered-action-integration-discourse-mirror-event';
import { viewAllForumThreads } from './view-all-forum-threads';

export const contracts: ContractDefinition[] = [
	channelDiscussionThreads,
	triggeredActionIntegrationDiscourseMirrorEvent,
	viewAllForumThreads,
];

import type { ContractDefinition } from 'autumndb';
import { channelDiscussionThreads } from './channel-discussion-threads';
import { triggeredActionIntegrationDiscourseMirrorEvent } from './triggered-action-integration-discourse-mirror-event';
import { triggeredActionIntegrationDiscourseMirrorThread } from './triggered-action-integration-discourse-mirror-thread';
import { viewAllForumThreads } from './view-all-forum-threads';

export const contracts: ContractDefinition[] = [
	channelDiscussionThreads,
	triggeredActionIntegrationDiscourseMirrorEvent,
	triggeredActionIntegrationDiscourseMirrorThread,
	viewAllForumThreads,
];

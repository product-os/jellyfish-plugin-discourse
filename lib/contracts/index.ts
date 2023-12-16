import type { ContractDefinition } from 'autumndb';
import { channelDiscussionThreads } from './channel-discussion-threads';
import { viewAllForumThreads } from './view-all-forum-threads';

export const contracts: ContractDefinition[] = [
	channelDiscussionThreads,
	viewAllForumThreads,
];

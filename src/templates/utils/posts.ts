import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';

import { get_repo_id, make_bsky_post_aturi } from './url.ts';
import type { ContextMap } from '../context.ts';

export interface PostGraphEntry {
	ancestor: string | null;
	descendants: string[];
}

export type PostGraphMap = Map<At.Uri, PostGraphEntry>;
export type AllPostsMap = Map<At.Uri, AppBskyFeedPost.Record>;

export function create_posts_graph(ctx: ContextMap) {
	const graph = new Map<At.Uri, PostGraphEntry>();
	const posts = new Map<At.Uri, AppBskyFeedPost.Record>();

	for (const [did, archive] of ctx) {
		for (const [rkey, post] of archive.records.posts) {
			const uri = make_bsky_post_aturi(did, rkey);
			const parent_uri = post.reply?.parent.uri;

			// Always populate posts map
			posts.set(uri, post);

			if (!parent_uri) {
				continue;
			}

			const parent_repo = get_repo_id(parent_uri);

			if (!ctx.has(parent_repo)) {
				continue;
			}

			// Add ourself to the parent entry
			{
				let parent_entry = graph.get(parent_uri);
				if (parent_entry) {
					parent_entry.descendants.push(uri);
				} else {
					graph.set(parent_uri, { ancestor: null, descendants: [uri] });
				}
			}

			// Now mark that down in our entry
			{
				let our_entry = graph.get(uri);
				if (our_entry) {
					our_entry.ancestor = parent_uri;
				} else {
					graph.set(uri, { ancestor: parent_uri, descendants: [] });
				}
			}
		}
	}

	return {
		graph: graph,
		posts: posts,
	};
}

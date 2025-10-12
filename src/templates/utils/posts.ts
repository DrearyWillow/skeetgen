import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';

import { get_repo_id, make_bsky_post_aturi } from './url.ts';
import type { ContextMap } from '../context.ts';

export interface PostGraphEntry {
	ancestor: At.Uri | null;
	descendants: At.Uri[];
}

export type PostGraphMap = Map<At.Uri, PostGraphEntry>;
export type AllPostsMap = Map<At.Uri, AppBskyFeedPost.Record>;
export type QuotesMap = Map<At.Uri, At.Uri[]>;

export function create_posts_graph(ctx: ContextMap) {
	const graph: PostGraphMap = new Map();
	const posts: AllPostsMap = new Map();
	const quotes: QuotesMap = new Map();

	for (const [did, archive] of ctx) {
		for (const [rkey, post] of archive.records.posts) {
			const uri = make_bsky_post_aturi(did, rkey);

			// always populate posts map
			posts.set(uri, post);

			// only add entry to the quotes map if also archiving the quoted repo
			const quoted_uri =
				post.embed?.$type === 'app.bsky.embed.record'
					? post.embed?.record?.uri
					: post.embed?.$type === 'app.bsky.embed.recordWithMedia'
						? post.embed?.record?.record?.uri
						: undefined;
			if (quoted_uri && ctx.has(get_repo_id(quoted_uri))) {
				get_or_init_array(quotes, quoted_uri, () => []).push(uri);
			}

			// only add entries to the graph map if also archiving the parent repo
			const parent_uri = post.reply?.parent.uri;
			if (parent_uri && ctx.has(get_repo_id(parent_uri))) {
				// add ourself to the parent entry
				retrieve_graph_entry(parent_uri).descendants.push(uri);
				// now mark that down in our entry
				retrieve_graph_entry(uri).ancestor = parent_uri;
			}
		}
	}

	function get_or_init_array<K, V>(map: Map<K, V>, key: K, init: () => V) {
		let array = map.get(key);
		if (!array) {
			array = init();
			map.set(key, array);
		}
		return array;
	}

	function retrieve_graph_entry(uri: At.Uri) {
		return get_or_init_array(graph, uri, () => ({ ancestor: null, descendants: [] }));
	}

	return {
		graph: graph,
		posts: posts,
		quotes: quotes,
	};
}

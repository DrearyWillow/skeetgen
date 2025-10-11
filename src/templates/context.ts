import type { TrustedHTML } from '@intrnl/jsx-to-string';

import type {
	AppBskyActorDefs,
	AppBskyActorProfile,
	AppBskyFeedGenerator,
	AppBskyFeedPost,
	AppBskyFeedThreadgate,
	AppBskyGraphList,
	At,
} from '@mary/bluesky-client/lexicons';

import { CID } from 'multiformats/cid';

export interface ContextData {
	posts_dir: string;
	blob_dir: string;
	asset_dir: string;

	records: {
		feeds: Map<string, AppBskyFeedGenerator.Record>;
		lists: Map<string, AppBskyGraphList.Record>;
		posts: Map<string, AppBskyFeedPost.Record>;
		threadgates: Map<string, AppBskyFeedThreadgate.Record>;
		profile?: AppBskyActorProfile.Record;
	};

	profile: AppBskyActorDefs.ProfileViewBasic;

	archive: Blob;
}

export type ContextMap = Map<At.DID, ContextData>;

export function render_page(page: TrustedHTML): string {
	return '<!doctype html>' + page.value;
}

export function get_blob_str(blob: At.Blob) {
	const ref = CID.asCID(blob.ref);

	if (ref !== null) {
		return ref.toString();
	}

	// Old blob interface
	if ('cid' in blob) {
		return blob.cid as string;
	}

	return blob.ref.$link;
}

export function is_did(str: At.DID): str is At.DID {
	return str.startsWith('did:');
}

// import type { PostGraphEntry } from './utils/posts.ts';

// let curr_context: PageContext | undefined;

// export interface BaseContext {
// 	posts_dir: string;
// 	blob_dir: string;
// 	asset_dir: string;

// 	profile: AppBskyActorDefs.ProfileViewBasic;

// 	records: {
// 		feeds: Map<string, AppBskyFeedGenerator.Record>;
// 		lists: Map<string, AppBskyGraphList.Record>;
// 		posts: Map<string, AppBskyFeedPost.Record>;
// 		threadgates: Map<string, AppBskyFeedThreadgate.Record>;
// 	};

// 	post_graph: Map<string, PostGraphEntry>;
// }

// export interface PageContext extends BaseContext {
// 	path: string;
// }

// export interface RenderPageOptions {
// 	context: PageContext;
// 	render: () => TrustedHTML;
// }

// export function render_page({ context, render }: RenderPageOptions): string {
// 	const prev_context = curr_context;

// 	try {
// 		curr_context = context;
// 		return '<!doctype html>' + render().value;
// 	} finally {
// 		curr_context = prev_context;
// 	}
// }

// export function get_page_context(): PageContext {
// 	return curr_context!;
// }

import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';
import { repeat } from '@intrnl/jsx-to-string';

// import { get_page_context } from '../context.ts';
import { get_post_url } from '../utils/url.ts';

import ReplyPost from './ReplyPost.tsx';
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';
import type { AllPostsMap, PostGraphMap } from '../utils/posts.ts';

export interface ReplyTreeProps {
	uri: At.Uri;
	post: AppBskyFeedPost.Record;
	depth: number;
	has_next: boolean;
	ctx: ContextMap;
	archive: ContextData;
	path: string;
	graph: PostGraphMap;
	posts: AllPostsMap;
}

const MOBILE_DEPTH_LIMIT = 3;
const DESKTOP_DEPTH_LIMIT = 7;

function ReplyTree({ uri, post, depth, has_next, ctx, archive, path, graph, posts }: ReplyTreeProps) {
	const children: [uri: At.Uri, post: AppBskyFeedPost.Record][] = [];

	{
		const entry = graph.get(uri);
		if (entry !== undefined) {
			const descendants = entry.descendants;

			for (let i = 0, ilen = descendants.length; i < ilen; i++) {
				const child_uri = descendants[i];
				const child_post = posts.get(child_uri);

				if (child_post !== undefined) {
					children.push([child_uri, child_post]);
				}
			}
		}
	}

	const render_children = () => {
		return repeat(children, ([uri, child_post], index) => (
			<ReplyTree
				uri={uri}
				post={child_post}
				depth={depth + 1}
				has_next={index !== children.length - 1}
				ctx={ctx}
				archive={archive}
				path={path}
				graph={graph}
				posts={posts}
			/>
		));
	};

	const render_has_more = () => {
		return (
			<div class="ReplyTree__hasMore">
				<div class="ReplyTree__hasMoreLine"></div>

				<a href={get_post_url(uri, ctx, path)} class="Link ReplyTree__hasMoreText">
					show {children.length} {children.length === 1 ? 'reply' : 'replies'}
				</a>
			</div>
		);
	};

	return (
		<div class="ReplyTree">
			{has_next ? <div class="ReplyTree__hasSiblingLine"></div> : null}

			<ReplyPost
				uri={uri}
				post={post}
				has_children={children.length > 0}
				has_parent={depth > 0}
				ctx={ctx}
				archive={archive}
				path={path}
			/>

			{children.length > 0 && (
				<div class="ReplyTree__children">
					{depth >= DESKTOP_DEPTH_LIMIT ? (
						render_has_more()
					) : depth === MOBILE_DEPTH_LIMIT ? (
						// match exactly so that we only render this once
						<>
							<div class="ReplyTree__mobileOnly">{render_has_more()}</div>
							<div class="ReplyTree__desktopOnly">{render_children()}</div>
						</>
					) : (
						render_children()
					)}
				</div>
			)}
		</div>
	);
}

export default ReplyTree;

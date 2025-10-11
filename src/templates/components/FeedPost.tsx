import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';

// import { get_page_context } from '../context.ts';
import { format_abs_date, format_abs_date_time } from '../intl/time.ts';
import { get_blob_url, get_post_url, get_relative_url, get_repo_id, sanitize_did } from '../utils/url.ts';

import Embed from './Embed.tsx';
import RichTextRenderer from './RichTextRenderer.tsx';
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';
import type { PostGraphMap } from '../utils/posts.ts';

export interface FeedPost {
	uri: At.Uri;
	post: AppBskyFeedPost.Record;
	/** Changes the condition for reply counter display from >1 to >0 */
	always_show_replies: boolean;
	/** Post is connected to a parent */
	has_prev: boolean;
	/** Draw a line connecting this post to the next */
	has_next: boolean;
	ctx: ContextMap;
	path: string;
	graph: PostGraphMap;
}

function FeedPost({ uri, post, always_show_replies, has_prev, has_next, ctx, path, graph }: FeedPost) {
	// const href = get_post_url(postref, ctx, path);
	const href = get_post_url(uri, ctx, path);

	// const uri = postref_to_uri(postref);
	const archive = ctx.get(get_repo_id(uri) as At.DID) as ContextData;
	const profile_page_url = get_relative_url(
		`/profile/${sanitize_did(archive.profile.did)}/posts/1.html`,
		path,
	);

	let reply_count = 0;
	{
		const entry = graph.get(uri);
		if (entry !== undefined) {
			reply_count = entry.descendants.length;
		}
	}

	return (
		<div class="FeedPost">
			<div class="FeedPost__context">
				{!has_prev && post.reply !== undefined ? (
					<div class="FeedPost__contextItem">
						<div class="FeedPost__contextLine"></div>
						<a href={href} class="FeedPost__contextText">
							Show full thread
						</a>
					</div>
				) : null}
			</div>

			<div class="FeedPost__content">
				<div class="FeedPost__aside">
					<a href={profile_page_url}>
						<div class="FeedPost__avatarContainer">
							{archive.profile.avatar ? (
								<img
									loading="lazy"
									src={get_blob_url(archive.profile.avatar, archive, path)}
									class="FeedPost__avatar"
								/>
							) : null}
						</div>
					</a>

					{has_next ? <div class="FeedPost__hasNextLine"></div> : null}
				</div>

				<div class="FeedPost__main">
					<div class="FeedPost__header">
						<span class="FeedPost__nameContainer">
							{archive.profile.displayName ? (
								<bdi class="FeedPost__displayNameContainer">
									<a href={profile_page_url}>
										<span class="FeedPost__displayName">{archive.profile.displayName}</span>
									</a>
								</bdi>
							) : (
								<a href={profile_page_url}>
									<span class="FeedPost__handle">@{archive.profile.handle}</span>
								</a>
							)}
						</span>

						<span aria-hidden="true" class="FeedPost__dot">
							·
						</span>

						<a href={href} aria-label={format_abs_date_time(post.createdAt)} class="FeedPost__date">
							<time datetime={post.createdAt}>{format_abs_date(post.createdAt)}</time>
						</a>
					</div>

					<div class="FeedPost__body">
						<RichTextRenderer text={post.text} facets={post.facets} />
					</div>

					{post.embed ? (
						<Embed embed={post.embed} large={false} ctx={ctx} path={path} archive={archive} />
					) : null}

					{reply_count > (always_show_replies ? 0 : 1) && (
						<a href={href} class="Link FeedPost__replies">
							{reply_count} replies
						</a>
					)}
				</div>
			</div>
		</div>
	);
}

export default FeedPost;

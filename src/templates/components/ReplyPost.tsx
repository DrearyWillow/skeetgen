import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';

// import { get_page_context } from '../context.ts';
import { format_abs_date, format_abs_date_time } from '../intl/time.ts';
import { get_blob_url, get_post_url, get_relative_url, sanitize_did } from '../utils/url.ts';

import Embed from './Embed.tsx';
import RichTextRenderer from './RichTextRenderer.tsx';
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';

export interface ReplyPostProps {
	uri: At.Uri;
	post: AppBskyFeedPost.Record;
	has_children: boolean;
	has_parent: boolean;
	ctx: ContextMap;
	archive: ContextData;
	path: string;
}

function ReplyPost({ uri, post, has_children, has_parent, ctx, archive, path }: ReplyPostProps) {
	const profile_page_url = get_relative_url(
		`/profile/${sanitize_did(archive.profile.did)}/posts/1.html`,
		path,
	);

	return (
		<div class="ReplyPost">
			<div class="ReplyPost__aside">
				<a href={profile_page_url}>
					<div class="ReplyPost__avatarContainer">
						{archive.profile.avatar ? (
							<img
								loading="lazy"
								src={get_blob_url(archive.profile.avatar, archive, path)}
								class="ReplyPost__avatar"
							/>
						) : null}
					</div>
				</a>

				{has_children ? <div class="ReplyPost__hasChildrenLine"></div> : null}
				{has_parent ? <div class="ReplyPost__hasParentLine"></div> : null}
			</div>

			<div class="ReplyPost__main">
				<div class="ReplyPost__header">
					<span class="ReplyPost__nameContainer">
						{archive.profile.displayName ? (
							<a href={profile_page_url}>
								<bdi class="ReplyPost__displayNameContainer">
									<span class="ReplyPost__displayName">{archive.profile.displayName}</span>
								</bdi>
							</a>
						) : (
							<a href={profile_page_url}>
								<span class="ReplyPost__handle">@{archive.profile.handle}</span>
							</a>
						)}
					</span>

					<span aria-hidden="true" class="ReplyPost__dot">
						·
					</span>

					<a
						href={get_post_url(uri, ctx, path)}
						aria-label={format_abs_date_time(post.createdAt)}
						class="ReplyPost__datetime"
					>
						<time datetime={post.createdAt}>{format_abs_date(post.createdAt)}</time>
					</a>
				</div>

				<div class="ReplyPost__body">
					<RichTextRenderer text={post.text} facets={post.facets} />
				</div>

				{post.embed ? (
					<Embed embed={post.embed} large={false} archive={archive} ctx={ctx} path={path} />
				) : null}
			</div>
		</div>
	);
}

export default ReplyPost;

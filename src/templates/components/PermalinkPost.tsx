import { repeat } from '@intrnl/jsx-to-string';

import type { AppBskyFeedPost } from '@mary/bluesky-client/lexicons';

// import { get_page_context } from '../context.ts';
import { format_abs_date_time } from '../intl/time.ts';
import { get_blob_url, get_relative_url, sanitize_did } from '../utils/url.ts';

import Embed from './Embed.tsx';
import RichTextRenderer from './RichTextRenderer.tsx';
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';

interface PermalinkPostProps {
	post: AppBskyFeedPost.Record;
	ctx: ContextMap;
	archive: ContextData;
	path: string;
}

function PermalinkPost({ post, ctx, archive, path }: PermalinkPostProps) {
	const profile_page_url = get_relative_url(
		`/profile/${sanitize_did(archive.profile.did)}/posts/1.html`,
		path,
	);

	return (
		<div class="PermalinkPost">
			<div class="PermalinkPost__header">
				<a href={profile_page_url}>
					<div class="PermalinkPost__avatarContainer">
						{archive.profile.avatar ? (
							<img
								loading="lazy"
								src={get_blob_url(archive.profile.avatar, archive, path)}
								class="PermalinkPost__avatar"
							/>
						) : null}
					</div>
				</a>

				<span class="PermalinkPost__nameContainer">
					<a href={profile_page_url}>
						<bdi class="PermalinkPost__displayNameContainer">
							<span class="PermalinkPost__displayName">{archive.profile.displayName}</span>
						</bdi>
					</a>
					<a href={profile_page_url}>
						<span class="PermalinkPost__handle">@{archive.profile.handle}</span>
					</a>
				</span>
			</div>

			<div class="PermalinkPost__body">
				<RichTextRenderer text={post.text} facets={post.facets} />
			</div>

			{post.embed ? <Embed embed={post.embed} large={true} ctx={ctx} path={path} archive={archive} /> : null}

			{post.tags ? (
				<div class="PermalinkPost__tags">
					{repeat(post.tags, (tag) => (
						<div class="PermalinkPost__tag">
							<span>#</span>
							<span class="PermalinkPost__tagText">{tag}</span>
						</div>
					))}
				</div>
			) : null}

			<div class="PermalinkPost__footer">
				<time datetime={post.createdAt} class="PermalinkPost__date">
					{format_abs_date_time(post.createdAt)}
				</time>
			</div>
		</div>
	);
}

export default PermalinkPost;

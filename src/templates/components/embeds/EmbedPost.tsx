import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';

import { format_abs_date } from '../../intl/time.ts';
import { get_blob_url, get_post_url, get_repo_id } from '../../utils/url.ts';

import EmbedImage from './EmbedImage.tsx';
import type { ContextMap } from '../../context.ts';
import type { ExtendedEmbed } from '../../utils/embed.ts';
import EmbedVideo from './EmbedVideo.tsx';

export interface EmbedPostProps {
	uri: At.Uri;
	record: AppBskyFeedPost.Record;
	large: boolean;
	ctx: ContextMap;
	path: string;
}

function EmbedPost({ uri, record, large, ctx, path }: EmbedPostProps) {
	const text = record.text;
	const images = get_post_images(record);
	const video = get_post_video(record);

	const show_large_media = (images !== undefined || video !== undefined) && (large || !text);

	const did = get_repo_id(uri) as At.DID;
	const archive = ctx.get(did);

	return (
		<a href={get_post_url(uri, ctx, path)} class="EmbedPost Interactive">
			<div class="EmbedPost__header">
				<div class="EmbedPost__avatarContainer">
					{archive?.profile.avatar ? (
						<img
							loading="lazy"
							src={get_blob_url(archive.profile.avatar, archive, path)}
							class="EmbedPost__avatar"
						/>
					) : null}
				</div>

				<span class="EmbedPost__nameContainer">
					{archive?.profile.displayName ? (
						<bdi class="EmbedPost__displayNameContainer">
							<span class="EmbedPost__displayName">{archive.profile.displayName}</span>
						</bdi>
					) : (
						<span class="EmbedPost__handle">@{archive?.profile.handle}</span>
					)}
				</span>

				<span aria-hidden="true" class="EmbedPost__dot">
					·
				</span>

				<span class="EmbedPost__date">{format_abs_date(record.createdAt)}</span>
			</div>

			{text ? (
				<div class="EmbedPost__body">
					{images && !large && archive ? (
						<div class="EmbedPost__imageAside">
							<EmbedImage
								images={images}
								is_bordered={true}
								allow_standalone_ratio={false}
								archive={archive}
								path={path}
							/>
						</div>
					) : video && !large && archive ? (
						<div class="EmbedPost__videoAside">
							<EmbedVideo video={video} is_bordered={true} archive={archive} path={path} />
						</div>
					) : null}

					<div class="EmbedPost__text">{text}</div>
				</div>
			) : null}

			{images && show_large_media && archive ? (
				<>
					{text ? <div class="EmbedPost__divider"></div> : null}
					<EmbedImage
						images={images}
						is_bordered={false}
						allow_standalone_ratio={false}
						archive={archive}
						path={path}
					/>
				</>
			) : video && show_large_media && archive ? (
				<>
					{text ? <div class="EmbedPost__divider"></div> : null}
					<EmbedVideo video={video} is_bordered={false} archive={archive} path={path} />
				</>
			) : null}
		</a>
	);
}

export default EmbedPost;

function get_post_images(post: AppBskyFeedPost.Record) {
	const embed = post.embed;

	if (embed) {
		const $type = embed.$type;

		if ($type === 'app.bsky.embed.images') {
			return embed.images;
		} else if ($type === 'app.bsky.embed.recordWithMedia') {
			const media = embed.media;

			if (media.$type === 'app.bsky.embed.images') {
				return media.images;
			}
		}
	}
}

function get_post_video(post: AppBskyFeedPost.Record) {
	const embed = post.embed as ExtendedEmbed;

	if (embed) {
		const $type = embed.$type;

		if ($type === 'app.bsky.embed.video') {
			return embed;
		} else if ($type === 'app.bsky.embed.recordWithMedia') {
			const media = embed.media;

			if (media.$type === 'app.bsky.embed.video') {
				return media;
			}
		}
	}
}

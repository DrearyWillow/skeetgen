import type { At } from '@mary/bluesky-client/lexicons';

// import { get_page_context } from '../context.ts';
import { get_collection_ns, get_record_key, get_repo_id } from '../utils/url.ts';

import type {
	EmbeddedImage,
	EmbeddedLink,
	EmbeddedRecord,
	EmbeddedVideo,
	ExtendedEmbed,
} from '../utils/embed.ts';

import EmbedFeed from './embeds/EmbedFeed.tsx';
import EmbedImage from './embeds/EmbedImage.tsx';
import EmbedLink from './embeds/EmbedLink.tsx';
import EmbedList from './embeds/EmbedList.tsx';
import EmbedNotFound from './embeds/EmbedNotFound.tsx';
import EmbedPost from './embeds/EmbedPost.tsx';
// import EmbedAltText from './embeds/EmbedAltText.tsx'
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';
import EmbedVideo from './embeds/EmbedVideo.tsx';

export interface EmbedProps {
	// embed: NonNullable<AppBskyFeedPost.Record['embed']>;
	embed: ExtendedEmbed;
	large: boolean;
	ctx: ContextMap;
	archive: ContextData;
	path: string;
}

function Embed({ embed, large, ctx, archive, path }: EmbedProps) {
	let images: EmbeddedImage[] | undefined;
	let link: EmbeddedLink | undefined;
	let record: EmbeddedRecord | undefined;
	let video: EmbeddedVideo | undefined;

	{
		const $type = embed.$type;

		if ($type == 'app.bsky.embed.external') {
			link = embed.external;
		} else if ($type === 'app.bsky.embed.images') {
			images = embed.images;
		} else if ($type === 'app.bsky.embed.video') {
			video = embed;
		} else if ($type === 'app.bsky.embed.record') {
			record = embed.record;
		} else if ($type === 'app.bsky.embed.recordWithMedia') {
			const rec = embed.record.record;

			const media = embed.media;
			const mediatype = media.$type;

			record = rec;

			if (mediatype === 'app.bsky.embed.external') {
				link = media.external;
			} else if (mediatype === 'app.bsky.embed.images') {
				images = media.images;
			} else if (mediatype === 'app.bsky.embed.video') {
				video = media;
			}
		}
	}

	return (
		<div class="Embed">
			{link ? <EmbedLink link={link} path={path} archive={archive} /> : null}
			{images ? (
				<EmbedImage
					images={images}
					is_bordered={true}
					allow_standalone_ratio={true}
					path={path}
					archive={archive}
				/>
			) : null}
			{video ? <EmbedVideo video={video} is_bordered={true} archive={archive} path={path} /> : null}
			{/* TODO: alt text link chips */}
			{/* {(images || video) && large ? <EmbedAltText video={video} images={images}  /> : null} */}
			{record ? render_record(record, large, ctx, path) : null}
		</div>
	);
}

export default Embed;

function render_record(record: EmbeddedRecord, large: boolean, ctx: ContextMap, path: string) {
	const uri = record.uri;

	const ns = get_collection_ns(uri);
	const did = get_repo_id(uri) as At.DID;
	const rkey = get_record_key(uri);

	// Look up DID to see if this repo is archived
	const archive = ctx.get(did);

	if (ns === 'app.bsky.feed.post') {
		if (archive) {
			const post = archive.records.posts.get(rkey);

			if (post !== undefined) {
				return <EmbedPost uri={uri} record={post} large={large} ctx={ctx} path={path} />;
			}
		}

		return <EmbedNotFound uri={uri} ctx={ctx} />;
	}

	if (ns === 'app.bsky.feed.generator') {
		if (archive) {
			const feed = archive.records.feeds.get(rkey);

			if (feed !== undefined) {
				return <EmbedFeed record={feed} archive={archive} path={path} />;
			}
		}

		return <EmbedNotFound uri={uri} ctx={ctx} />;
	}

	if (ns === 'app.bsky.graph.list') {
		if (archive) {
			const list = archive.records.lists.get(rkey);

			if (list !== undefined) {
				return <EmbedList record={list} archive={archive} path={path} />;
			}
		}

		return <EmbedNotFound uri={uri} ctx={ctx} />;
	}

	return null;
}

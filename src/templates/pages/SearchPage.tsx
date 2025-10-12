import { html } from '@intrnl/jsx-to-string';

import { get_asset_url, get_tid_segment, sanitize_did } from '../utils/url.ts';

import Page from '../components/Page.tsx';
import type { ContextMap } from '../context.ts';
import type { ExtendedEmbed } from '../utils/embed.ts';
import type { At } from '@mary/bluesky-client/lexicons';

const enum PostFlags {
	HAS_EMBED_IMAGE = 1 << 0,
	HAS_EMBED_LINK = 1 << 1,
	HAS_EMBED_RECORD = 1 << 2,
	HAS_EMBED_FEED = 1 << 3,
	HAS_EMBED_LIST = 1 << 4,
	HAS_EMBED_VIDEO = 1 << 5,
}

type MinimumProfile = {
	displayName: string;
	handle: string;
	did: At.DID;
};

export interface SearchPageProps {
	ctx: ContextMap;
	path: string;
}

type PostEntry = [rkey: string, text: string, ts: number, flag: number, alt: string, profile: MinimumProfile];

const is_nan = Number.isNaN;

export function SearchPage({ ctx, path }: SearchPageProps) {
	const entries: PostEntry[] = [];

	{
		for (const [did, archive] of ctx) {
			const profile = {
				displayName: archive.profile.displayName || '',
				handle: archive.profile.handle,
				did: archive.profile.did,
			};

			for (const [rkey, post] of archive.records.posts) {
				const text = typeof post.text === 'string' ? post.text.trim() : '';

				const ts = new Date(post.createdAt).getTime();
				const is_ts_valid = !is_nan(ts);

				let flag = 0;
				const alt_parts: string[] = [];

				{
					const embed = post.embed as ExtendedEmbed;
					if (embed !== undefined) {
						const $type = embed.$type;

						if ($type === 'app.bsky.embed.external') {
							flag |= PostFlags.HAS_EMBED_LINK;
							push_alt_part(alt_parts, embed);
						} else if ($type === 'app.bsky.embed.images') {
							flag |= PostFlags.HAS_EMBED_IMAGE;
							push_alt_part(alt_parts, embed);
						} else if ($type === 'app.bsky.embed.video') {
							flag |= PostFlags.HAS_EMBED_VIDEO;
							push_alt_part(alt_parts, embed);
						} else if ($type === 'app.bsky.embed.record') {
							flag |= PostFlags.HAS_EMBED_RECORD;
						} else if ($type === 'app.bsky.embed.recordWithMedia') {
							const media = embed.media;
							const $mediatype = media.$type;

							flag |= PostFlags.HAS_EMBED_RECORD;

							if ($mediatype === 'app.bsky.embed.external') {
								flag |= PostFlags.HAS_EMBED_LINK;
								push_alt_part(alt_parts, media);
							} else if ($mediatype === 'app.bsky.embed.images') {
								flag |= PostFlags.HAS_EMBED_IMAGE;
								push_alt_part(alt_parts, media);
							} else if ($mediatype === 'app.bsky.embed.video') {
								flag |= PostFlags.HAS_EMBED_VIDEO;
								push_alt_part(alt_parts, media);
							}
						}
					}
				}

				const alt = alt_parts.join(' ');

				if (!text && !alt) {
					continue;
				}

				const postref = `${sanitize_did(did)}/${get_tid_segment(rkey)}`;
				entries.push([postref, text, is_ts_valid ? ts : 0, flag, alt, profile]);
			}
		}
	}

	return (
		<Page title={`Search posts`} ctx={ctx} path={path}>
			<div id="root">
				<noscript>
					<p class="SearchPage__noscript">This search page requires JavaScript to run.</p>
				</noscript>

				<p class="SearchPage__loading">Loading search, this might take a while.</p>
			</div>

			{/* Wrapping it in a <div hidden> should prevent layout/style recalcs for when we remove the <script> node */}
			<div hidden>
				<script id="search-json" type="application/json">
					{/* I'm gonna pull what's referred to as a "gamer move" */}
					{html(JSON.stringify(entries).replaceAll('</script>', '<\\/script>'))}
				</script>

				<script src={get_asset_url('search.js', ctx, path)}></script>
			</div>
		</Page>
	);
}

function push_alt_part(alt_parts: string[], embed: ExtendedEmbed) {
	if (embed.$type === 'app.bsky.embed.images') {
		for (const img of embed.images) {
			const text = img.alt;
			if (typeof text === 'string' && text.trim()) {
				alt_parts.push(text.trim());
			}
		}
	} else if (embed.$type === 'app.bsky.embed.video') {
		const text = embed.alt;
		if (typeof text === 'string' && text.trim()) {
			alt_parts.push(text.trim());
		}
	} else if (embed.$type === 'app.bsky.embed.external') {
		// support gif alt text hack
		// https://github.com/bluesky-social/social-app/blob/main/src/lib/gif-alt-text.ts#L1
		const text = embed.external.description;
		if (typeof text === 'string' && text.startsWith('Alt: ')) {
			alt_parts.push(text.replace('Alt: ', '').trim());
		}
	}
}

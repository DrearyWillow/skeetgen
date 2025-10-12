// page: posts/:rkey.html

import { repeat, type JSXNode } from '@intrnl/jsx-to-string';

import type { AppBskyFeedPost, At } from '@mary/bluesky-client/lexicons';
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';
import type { AllPostsMap, PostGraphMap, QuotesMap } from '../utils/posts.ts';

import { get_blob_str } from '../context.ts';
import {
	get_blob_url,
	get_bsky_app_url,
	get_collection_ns,
	get_post_url,
	get_relative_url,
	get_repo_id,
    uri_to_postref,
} from '../utils/url.ts';

import type { EmbeddedImage, EmbeddedRecord, EmbeddedVideo, ExtendedEmbed } from '../utils/embed.ts';

import FeedPost from '../components/FeedPost.tsx';
import Page from '../components/Page.tsx';
import PermalinkPost from '../components/PermalinkPost.tsx';
import ReplyTree from '../components/ReplyTree.tsx';
import { format_long } from '../intl/number.ts';

const MAX_ANCESTORS = 6;

const enum ExternalReply {
	// Top-most post isn't linking to a reply
	NO,
	// Top-most post is replying to own post, but it no longer exists.
	SAME_USER,
	// Top-most post is linking to another user.
	YES,
}

export function ThreadPage(
	uri: At.Uri,
	post: AppBskyFeedPost.Record,
	ctx: ContextMap,
	graph: PostGraphMap,
	posts: AllPostsMap,
	quotes: QuotesMap,
	path: string,
) {
	const did = get_repo_id(uri) as At.DID;
	const archive = ctx.get(did) as ContextData;
	const uri_quotes = quotes.get(uri) || [];

	let top_uri = uri;
	let top_post = post;

	let ancestors: [uri: At.Uri, post: AppBskyFeedPost.Record][] = [];
	let children: [uri: At.Uri, post: AppBskyFeedPost.Record][] = [];

	let reply_state = ExternalReply.NO;
	let root_uri: At.Uri | undefined;
	let is_ancestor_overflowing = false;

	{
		const entry = graph.get(uri);
		if (entry !== undefined) {
			// Collect children replies to this post
			// const posts = archive.records.posts
			{
				const descendants = entry.descendants;

				for (let i = 0, ilen = descendants.length; i < ilen; i++) {
					const child_uri = descendants[i];
					const child_post = posts.get(child_uri);

					if (child_post !== undefined) {
						children.push([child_uri, child_post]);
					}
				}
			}

			// Collect parent replies to this post
			{
				let parent_uri: string | null | undefined = entry.ancestor;
				let count = 0;

				while (parent_uri != null && !is_ancestor_overflowing) {
					const parent_post = posts.get(parent_uri);
					if (parent_post === undefined) {
						break;
					}

					top_uri = parent_uri;
					top_post = parent_post;
					is_ancestor_overflowing = ++count >= MAX_ANCESTORS;

					ancestors.unshift([parent_uri, parent_post]);

					const parent_entry = graph.get(parent_uri);
					parent_uri = parent_entry?.ancestor;
				}
			}
		}
	}

	// Check if the top-most post contains a reply
	{
		const reply = top_post.reply;

		if (reply !== undefined) {
			{
				const parent_uri = reply.parent.uri;
				const repo = get_repo_id(parent_uri);

				reply_state = ctx.has(repo) ? ExternalReply.SAME_USER : ExternalReply.YES;
			}

			{
				const reply_root_uri = reply.root.uri;
				const repo = get_repo_id(reply_root_uri);

				if (ctx.has(repo) && graph.has(reply_root_uri)) {
					root_uri = reply_root_uri;
				}
			}
		}
	}

	return (
		<Page
			title={`${archive.profile.displayName || `@${archive.profile.handle}`}: "${post.text}"`}
			head={get_embed_head(archive, post, path)}
			ctx={ctx}
			path={path}
		>
			{ancestors.length > 0 || reply_state !== ExternalReply.NO ? (
				<details class="ThreadAncestors">
					<summary class="Interactive ThreadAncestors__header">
						<svg class="ThreadAncestors__accordionIcon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
						</svg>

						<span class="ThreadAncestors__accordionText">Show parent replies</span>
					</summary>

					<div class="ThreadAncestors__list">
						{is_ancestor_overflowing || reply_state !== ExternalReply.NO ? (
							<div class="ThreadCut">
								<div class="ThreadCut__aside">
									<div class="ThreadCut__line"></div>
								</div>
								<div class="ThreadCut__main">
									{is_ancestor_overflowing ? (
										<a href={get_post_url(top_uri, ctx, path)} class="Link">
											View parent reply
										</a>
									) : (
										<>
											<p class="ThreadCut__headerText">
												{reply_state === ExternalReply.SAME_USER
													? `This post has been deleted`
													: `The post below is a reply to another user`}
											</p>

											<div class="ThreadCut__actions">
												{reply_state !== ExternalReply.SAME_USER ? (
													<a href={get_bsky_app_url(top_uri)} target="_blank" class="Link">
														view in bsky.app
													</a>
												) : null}

												{reply_state !== ExternalReply.SAME_USER && root_uri ? (
													<span aria-hidden="true" class="ThreadCut__actionSeparator">
														|
													</span>
												) : null}

												{root_uri ? (
													<a href={get_post_url(root_uri, ctx, path)} class="Link">
														view root post
													</a>
												) : null}
											</div>
										</>
									)}
								</div>
							</div>
						) : null}

						{repeat(ancestors, ([parent_uri, parent_post]) => (
							<FeedPost
								uri={parent_uri}
								post={parent_post}
								always_show_replies={false}
								has_prev={true}
								has_next={true}
								ctx={ctx}
								path={path}
								graph={graph}
							/>
						))}
					</div>
				</details>
			) : null}

			<PermalinkPost post={post} ctx={ctx} archive={archive} path={path} />

			{uri_quotes.length > 0 ? (
				<div class="ThreadPage__quoteContainer">
					<hr />
					<a
                        href={get_relative_url(`/quotes/${uri_to_postref(uri)}/1.html`, path)}
						class="ThreadPage__quoteInfo"
					>
						<span class="ThreadPage__quoteCount">{format_long(uri_quotes.length)}</span>
						<span>{uri_quotes.length === 1 ? `quote` : `quotes`}</span>
					</a>
				</div>
			) : null}

			<hr />

			<div class="ThreadPage__descendants">
				{repeat(children, ([child_uri, child_post]) => (
					<ReplyTree
						uri={child_uri}
						post={child_post}
						depth={0}
						has_next={false}
						ctx={ctx}
						archive={archive}
						path={path}
						graph={graph}
						posts={posts}
					/>
				))}
			</div>
		</Page>
	);
}

function get_embed_head(archive: ContextData, post: AppBskyFeedPost.Record, path: string): JSXNode {
	const nodes: JSXNode = [];

	const embed = post.embed as ExtendedEmbed;
	const reply = post.reply;

	const profile = archive.profile;
	const title = profile.displayName ? `${profile.displayName} (@${profile.handle})` : profile.handle;

	let header = '';
	let text = post.text;

	if (reply) {
		const parent_uri = reply.parent.uri;
		const repo = get_repo_id(parent_uri);

		if (repo === profile.did) {
			header += `[replying to self] `;
		} else {
			header += `[replying to ${repo}] `;
		}
	}

	if (embed) {
		const $type = embed.$type;

		let images: EmbeddedImage[] | undefined;
		let record: EmbeddedRecord | undefined;
		let video: EmbeddedVideo | undefined;

		if ($type === 'app.bsky.embed.images') {
			images = embed.images;
		} else if ($type === 'app.bsky.embed.video') {
			video = embed;
		} else if ($type === 'app.bsky.embed.record') {
			record = embed.record;
		} else if ($type === 'app.bsky.embed.recordWithMedia') {
			const media = embed.media as ExtendedEmbed;

			record = embed.record.record;

			if (media.$type === 'app.bsky.embed.images') {
				images = images;
			}

			if (media.$type === 'app.bsky.embed.video') {
				video = media;
			}
		}

		if (images !== undefined) {
			const img = images[0];
			const url = get_blob_url(get_blob_str(img.image), archive, path);

			nodes.push(
				<>
					<meta name="twitter:card" content="summary_large_image" />
					<meta property="og:image" content={url} />
				</>,
			);
		}

		if (video !== undefined) {
			const url = get_blob_url(get_blob_str(video.video), archive, path);

			nodes.push(
				<>
					<meta name="twitter:card" content="player" />
					<meta property="og:video" content={url} />
				</>,
			);
		}

		if (record !== undefined) {
			const uri = record.uri;

			const repo = get_repo_id(uri);
			const ns = get_collection_ns(uri);

			if (ns === 'app.bsky.feed.post') {
				if (repo === profile.did) {
					header += `[quoting self] `;
				} else {
					header += `[quoting ${repo}] `;
				}
			}
		}
	}

	if (header) {
		text = `${header}\n\n${text}`;
	}

	nodes.push(
		<>
			<meta property="og:title" content={title} />
			<meta property="og:description" content={text} />
		</>,
	);

	return nodes;
}

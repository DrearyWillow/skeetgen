import { showSaveFilePicker, type FileSystemFileHandle } from 'native-file-system-adapter';

import type { DidDocument } from '@mary/bluesky-client';
import type {
	AppBskyActorProfile,
	AppBskyFeedGenerator,
	AppBskyFeedPost,
	AppBskyFeedThreadgate,
	AppBskyGraphList,
	At,
} from '@mary/bluesky-client/lexicons';

import { CarBlockIterator } from '@ipld/car';
import { decode as decode_cbor } from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';

import { target } from '../utils/controller.ts';
import { assert, create_iterable_reader, iterate_stream } from '../utils/misc.ts';
import { untar, write_tar_entry } from '../utils/tar.ts';

import { get_blob_str, render_page, type ContextData, type ContextMap } from '../templates/context.ts';
import { chunked } from '../templates/utils/misc.ts';
import { create_posts_graph, type AllPostsMap, type PostGraphMap } from '../templates/utils/posts.ts';
import { get_tid_segment, make_bsky_post_aturi, sanitize_did } from '../templates/utils/url.ts';

import { SearchPage } from '../templates/pages/SearchPage.tsx';
import { ThreadPage } from '../templates/pages/ThreadPage.tsx';
import {
	TimelinePage,
	type TimelineType,
	type TimelineTypeRecord,
} from '../templates/pages/TimelinePage.tsx';
import { WelcomePage } from '../templates/pages/WelcomePage.tsx';
import type { ExtendedEmbed } from '../templates/utils/embed.ts';
import { ProfilePage } from '../templates/pages/ProfilePage.tsx';

const supports_fsa = 'showDirectoryPicker' in globalThis;

const decoder = new TextDecoder();

class GenerateArchiveForm extends HTMLElement {
	private form = target<HTMLFormElement>(this, 'form');
	private status = target<HTMLParagraphElement>(this, 'status');

	private picker_input = target<HTMLInputElement>(this, 'picker_input');
	private picker_label = target<HTMLSpanElement>(this, 'picker_label');

	private fsa_large_warning = target<HTMLDivElement>(this, 'fsa_large_warning');

	handle_before_unload = (ev: BeforeUnloadEvent) => {
		ev.preventDefault();
		ev.returnValue = true;
	};

	connectedCallback() {
		{
			const $picker_input = this.picker_input.get()!;
			const $picker_label = this.picker_label.get()!;

			const $fsa_large_warning = this.fsa_large_warning.get()!;

			$picker_input.addEventListener('input', () => {
				const files = Array.from($picker_input.files || []);
				$picker_label.textContent =
					files.length > 0 ? `${files.length} file(s) selected` : `No files selected.`;
				$fsa_large_warning.style.display = !supports_fsa && files.some((f) => f.size > 1e7) ? '' : 'none';
			});
		}

		{
			const $form = this.form.get()!;
			const $status = this.status.get()!;

			let controller: AbortController | undefined;

			$form.addEventListener('submit', (ev) => {
				ev.preventDefault();

				controller?.abort();
				controller = new AbortController();

				const data = new FormData($form);
				const archives = data.getAll('archive') as File[];
				const with_media = !!data.get('with_media');

				const signal = controller.signal;

				$status.textContent = '';
				$status.classList.remove('text-red-500');
				$status.classList.add('opacity-50');

				const date = new Date().toISOString();

				const promise = showSaveFilePicker({
					suggestedName: `${date}-archive.tar`,

					// @ts-expect-error - not sure why the polyfill isn't typed correctly.
					id: 'skeetgen-archive',
					startIn: 'downloads',
					types: [
						{
							description: 'Tarball archive',
							accept: { 'application/x-tar': ['.tar'] },
						},
					],
				});

				promise.then((fd: FileSystemFileHandle) => {
					if (signal.aborted) {
						return;
					}

					window.addEventListener('beforeunload', this.handle_before_unload);

					this.generate_archive(signal, fd, archives, with_media).then(
						() => {
							// If we got here, we're still dealing with our own controller.
							controller!.abort();

							window.removeEventListener('beforeunload', this.handle_before_unload);
						},
						(err) => {
							if (signal.aborted) {
								return;
							}

							console.error(err);

							window.removeEventListener('beforeunload', this.handle_before_unload);

							$status.textContent = err.message;
							$status.classList.add('text-red-500');
							$status.classList.remove('opacity-50');
						},
					);
				});
			});
		}
	}

	async copy_all_blobs(signal: AbortSignal, writable: FileSystemWritableFileStream, ctx: ContextMap) {
		const $status = this.status.get()!;
		signal.throwIfAborted();
		$status.textContent = `Copying media files`;

		let log = true;
		let count = 0;

		for (const [did, archive] of ctx) {
			const stream = archive.archive.stream();
			const reader = create_iterable_reader(iterate_stream(stream));

			for await (const entry of untar(reader)) {
				signal.throwIfAborted();

				if (entry.name.startsWith('blobs/')) {
					const buffer = new Uint8Array(entry.size);

					await entry.read(buffer);
					const sanitized_did = sanitize_did(did);
					const filename = entry.name.replace('blobs/', `blobs/${sanitized_did}/`);
					await writable.write(write_tar_entry({ filename: filename, data: buffer }));

					count++;

					if (log) {
						log = false;
						$status.textContent = `Copying media files (${count} copied)`;

						setTimeout(() => (log = true), 500);
					}
				}
			}
		}
	}

	async render_profile_pages(
		signal: AbortSignal,
		writable: FileSystemWritableFileStream,
		ctx: ContextMap,
		graph: PostGraphMap,
	) {
		signal.throwIfAborted();

		for (const [did, archive] of ctx) {
			const did_posts = new Map();
			for (const [rkey, post] of archive.records.posts) {
				did_posts.set(make_bsky_post_aturi(did, rkey), post);
			}

			// Collect all [uri, post] pairs into an array
			const post_tuples = [...did_posts];

			// Sort newest-first by createdAt
			post_tuples.sort((a, b) => {
				const dateA = new Date(a[1].createdAt).getTime();
				const dateB = new Date(b[1].createdAt).getTime();

				const safeA = Number.isNaN(dateA) ? 0 : dateA;
				const safeB = Number.isNaN(dateB) ? 0 : dateB;

				return safeB - safeA;
			});

			const root_posts = post_tuples.filter(([, post]) => post.reply === undefined);

			const media_posts = post_tuples.filter(([, post]) => {
				const embed = post.embed as ExtendedEmbed;
				return (
					embed !== undefined &&
					(embed.$type === 'app.bsky.embed.images' ||
						embed.$type === 'app.bsky.embed.video' ||
						(embed.$type === 'app.bsky.embed.recordWithMedia' &&
							(embed.media.$type === 'app.bsky.embed.images' ||
								embed.media.$type === 'app.bsky.embed.video')))
				);
			});

			const video_posts = post_tuples.filter(([, post]) => {
				const embed = post.embed as ExtendedEmbed;
				return (
					embed !== undefined &&
					(embed.$type === 'app.bsky.embed.video' ||
						(embed.$type === 'app.bsky.embed.recordWithMedia' &&
							embed.media.$type === 'app.bsky.embed.video'))
				);
			});

			const post_counts: TimelineTypeRecord = {
				posts: root_posts.length,
				with_replies: post_tuples.length,
				media: media_posts.length,
				videos: video_posts.length,
			};

			await write_profile_pages('posts', root_posts, archive, post_counts);
			await write_profile_pages('with_replies', post_tuples, archive, post_counts);
			await write_profile_pages('media', media_posts, archive, post_counts);
			await write_profile_pages('videos', video_posts, archive, post_counts);
		}

		async function write_profile_pages(
			type: TimelineType,
			tuples: [uri: string, post: AppBskyFeedPost.Record][],
			archive: ContextData,
			post_counts: TimelineTypeRecord,
		) {
			const pages = chunked(tuples, 50);

			// Push an empty page
			if (pages.length === 0) {
				pages.push([]);
			}

			for (let i = 0, ilen = pages.length; i < ilen; i++) {
				const page = pages[i];

				const path = `profile/${sanitize_did(archive.profile.did)}/${type}/${i + 1}.html`;
				await writable.write(
					write_tar_entry({
						filename: path,
						data: render_page(
							ProfilePage({
								type: type,
								current_page: i + 1,
								total_pages: ilen,
								posts: page,
								path: `/${path}`,
								ctx: ctx,
								graph: graph,
								profile_archive: archive,
								post_counts: post_counts,
							}),
						),
					}),
				);
			}
		}
	}

	async render_timeline_pages(
		signal: AbortSignal,
		writable: FileSystemWritableFileStream,
		ctx: ContextMap,
		graph: PostGraphMap,
		posts: AllPostsMap,
	) {
		// Render timelines
		{
			signal.throwIfAborted();

			// Collect all [uri, post] pairs into an array
			const post_tuples = [...posts];

			// Sort newest-first by createdAt
			{
				post_tuples.sort((a, b) => {
					const dateA = new Date(a[1].createdAt).getTime();
					const dateB = new Date(b[1].createdAt).getTime();

					const safeA = Number.isNaN(dateA) ? 0 : dateA;
					const safeB = Number.isNaN(dateB) ? 0 : dateB;

					return safeB - safeA;
				});
			}

			// All posts
			{
				await write_timeline_pages('with_replies', post_tuples);
			}

			// Root posts only
			{
				const root_posts = post_tuples.filter(([, post]) => post.reply === undefined);
				await write_timeline_pages('posts', root_posts);
			}

			// Image or video posts only
			{
				const media_posts = post_tuples.filter(([, post]) => {
					const embed = post.embed as ExtendedEmbed;

					return (
						embed !== undefined &&
						(embed.$type === 'app.bsky.embed.images' ||
							embed.$type === 'app.bsky.embed.video' ||
							(embed.$type === 'app.bsky.embed.recordWithMedia' &&
								(embed.media.$type === 'app.bsky.embed.images' ||
									embed.media.$type === 'app.bsky.embed.video')))
					);
				});

				await write_timeline_pages('media', media_posts);
			}

			// Video posts only
			{
				const video_posts = post_tuples.filter(([, post]) => {
					const embed = post.embed as ExtendedEmbed;

					return (
						embed !== undefined &&
						(embed.$type === 'app.bsky.embed.video' ||
							(embed.$type === 'app.bsky.embed.recordWithMedia' &&
								embed.media.$type === 'app.bsky.embed.video'))
					);
				});

				await write_timeline_pages('videos', video_posts);
			}
		}

		async function write_timeline_pages(
			type: TimelineType,
			tuples: [uri: string, post: AppBskyFeedPost.Record][],
		) {
			const pages = chunked(tuples, 50);

			// Push an empty page
			if (pages.length === 0) {
				pages.push([]);
			}

			for (let i = 0, ilen = pages.length; i < ilen; i++) {
				const page = pages[i];

				const path = `timeline/${type}/${i + 1}.html`;
				await writable.write(
					write_tar_entry({
						filename: path,
						data: render_page(
							TimelinePage({
								type: type,
								current_page: i + 1,
								total_pages: ilen,
								posts: page,
								path: `/${path}`,
								ctx: ctx,
								graph: graph,
							}),
						),
					}),
				);
			}
		}
	}

	async create_context_map(signal: AbortSignal, archives: Blob[]) {
		let total_posts: number = 0;

		const ctx = new Map<At.DID, ContextData>();

		for (const archive of archives) {
			let did: DidDocument;
			let profile: AppBskyActorProfile.Record | undefined;
			const feeds = new Map<string, AppBskyFeedGenerator.Record>();
			const lists = new Map<string, AppBskyGraphList.Record>();
			const posts = new Map<string, AppBskyFeedPost.Record>();
			const threadgates = new Map<string, AppBskyFeedThreadgate.Record>();
			let car_buf: Uint8Array | undefined;
			let did_buf: Uint8Array | undefined;

			// Grab the DID document and repository CAR from the archive.
			{
				const stream = archive.stream();
				const reader = create_iterable_reader(iterate_stream(stream));

				for await (const entry of untar(reader)) {
					if (entry.name === 'repo.car') {
						car_buf = new Uint8Array(entry.size);
						await entry.read(car_buf);
					}

					if (entry.name === 'did.json') {
						did_buf = new Uint8Array(entry.size);
						await entry.read(did_buf);
					}

					// Once we have these two there's no need to continue traversing
					if (car_buf !== undefined && did_buf !== undefined) {
						break;
					}
				}

				if (did_buf === undefined) {
					throw new Error(`did.json not found inside the archive`);
				}
				if (car_buf === undefined) {
					throw new Error(`repo.car not found inside the archive`);
				}
			}

			// Read the DID file
			{
				const doc_str = decoder.decode(did_buf);

				try {
					did = JSON.parse(doc_str) as DidDocument;
				} catch (err) {
					throw new Error(`failed to read did document`, { cause: err });
				}
			}

			// Read the car file
			{
				const car = await CarBlockIterator.fromBytes(car_buf);

				const roots = await car.getRoots();
				assert(roots.length === 1, `expected 1 root commit`);

				const root_cid = roots[0];
				const blockmap: BlockMap = new Map();

				for await (const { cid, bytes } of car) {
					// await verify_cid_for_bytes(cid, bytes);
					blockmap.set(cid.toString(), bytes);
				}

				signal.throwIfAborted();

				const commit = read_obj(blockmap, root_cid) as Commit;

				for (const { key, cid } of walk_entries(blockmap, commit.data)) {
					const [collection, rkey] = key.split('/');

					if (collection === 'app.bsky.feed.post') {
						const record = read_obj(blockmap, cid) as AppBskyFeedPost.Record;
						posts.set(rkey, record);
					} else if (collection === 'app.bsky.actor.profile') {
						const record = read_obj(blockmap, cid) as AppBskyActorProfile.Record;
						profile = record;
					} else if (collection === 'app.bsky.feed.generator') {
						const record = read_obj(blockmap, cid) as AppBskyFeedGenerator.Record;
						feeds.set(rkey, record);
					} else if (collection === 'app.bsky.graph.list') {
						const record = read_obj(blockmap, cid) as AppBskyGraphList.Record;
						lists.set(rkey, record);
					} else if (collection === 'app.bsky.feed.threadgate') {
						const record = read_obj(blockmap, cid) as AppBskyFeedThreadgate.Record;
						threadgates.set(rkey, record);
					}
				}
			}

			const handles = did.alsoKnownAs?.filter((uri) => uri.startsWith('at://')).map((uri) => uri.slice(5));
			const sanitized_did = sanitize_did(did.id as At.DID);

			ctx.set(did.id as At.DID, {
				posts_dir: `/posts/${sanitized_did}`,
				blob_dir: `/blobs/${sanitized_did}`,
				asset_dir: `/assets`, // assets are shared
				records: {
					feeds: feeds,
					lists: lists,
					posts: posts,
					threadgates: threadgates,
					profile: profile,
				},
				archive: archive,
				profile: {
					did: did.id as At.DID,
					handle: handles && handles.length > 0 ? handles[0] : 'handle.invalid',
					displayName: profile?.displayName?.trim(),
					avatar: profile?.avatar && get_blob_str(profile?.avatar),
				},
			});

			total_posts += posts.size;
		}

		const $status = this.status.get()!;
		$status.textContent = `Retrieved ${total_posts} posts`;

		return ctx;
	}

	async copy_necessary_assets(signal: AbortSignal, writable: FileSystemWritableFileStream) {
		signal.throwIfAborted();

		async function get_asset(url: string, signal: AbortSignal) {
			const response = await fetch(import.meta.env.BASE_URL + url, { signal: signal });

			if (!response.ok) {
				throw new Error(`Failed to retrieve ${url}`);
			}

			const buffer = await response.arrayBuffer();

			return buffer;
		}

		await writable.write(
			write_tar_entry({
				filename: 'assets/style.css',
				data: await get_asset('archive_assets/style.css', signal),
			}),
		);

		await writable.write(
			write_tar_entry({
				filename: 'assets/search.js',
				data: await get_asset('archive_assets/search.js', signal),
			}),
		);

		await writable.write(
			write_tar_entry({
				filename: 'assets/alt-text-overlay.js',
				data: await get_asset('archive_assets/alt-text-overlay.js', signal),
			}),
		);
	}

	async render_other_pages(signal: AbortSignal, writable: FileSystemWritableFileStream, ctx: ContextMap) {
		signal.throwIfAborted();

		const path = `index.html`;
		await writable.write(
			write_tar_entry({
				filename: path,
				data: render_page(WelcomePage(ctx, `/${path}`)),
			}),
		);
	}

	async render_individual_threads(
		signal: AbortSignal,
		writable: FileSystemWritableFileStream,
		ctx: ContextMap,
		graph: PostGraphMap,
		posts: AllPostsMap,
	) {
		signal.throwIfAborted();

		for (const [did, archive] of ctx) {
			const sanitized_did = sanitize_did(did);

			for (const [rkey, post] of archive.records.posts) {
				const segment = get_tid_segment(rkey);
				const uri = make_bsky_post_aturi(did, rkey);

				const path = `posts/${sanitized_did}/${segment}.html`;
				await writable.write(
					write_tar_entry({
						filename: path,
						data: render_page(ThreadPage(uri, post, ctx, graph, posts, `/${path}`)),
					}),
				);
			}
		}
	}

	async render_search_page(signal: AbortSignal, writable: FileSystemWritableFileStream, ctx: ContextMap) {
		signal.throwIfAborted();

		const path = `search.html`;
		await writable.write(
			write_tar_entry({
				filename: path,
				data: render_page(SearchPage(ctx, `/${path}`)),
			}),
		);
	}

	async generate_archive(
		signal: AbortSignal,
		fd: FileSystemFileHandle,
		archives: Blob[],
		with_media: boolean,
	) {
		const $status = this.status.get()!;

		// 1. Retrieve posts from the archive
		$status.textContent = `Reading archives...`;
		const ctx = await this.create_context_map(signal, archives);

		// 2. Generate pages
		const writable = await fd.createWritable({ keepExistingData: false });

		try {
			// set up context for rendering pages
			const { graph, posts } = create_posts_graph(ctx);

			// render individual threads (separate)
			$status.textContent = `Rendering threads`;
			await this.render_individual_threads(signal, writable, ctx, graph, posts);

			// render individual profiles (separate)
			$status.textContent = `Rendering profiles`;
			await this.render_profile_pages(signal, writable, ctx, graph);

			// render timelines (combined)
			$status.textContent = `Rendering timelines`;
			await this.render_timeline_pages(signal, writable, ctx, graph, posts);

			// render search page (combined)
			$status.textContent = `Writing search page`;
			await this.render_search_page(signal, writable, ctx);

			// render other pages (index summary)
			$status.textContent = `Writing remaining pages`;
			await this.render_other_pages(signal, writable, ctx);

			// copy necessary assets
			$status.textContent = `Downloading necessary assets`;
			await this.copy_necessary_assets(signal, writable);

			// copy all blobs if requested
			if (with_media) {
				await this.copy_all_blobs(signal, writable, ctx);
			}

			$status.textContent = `Waiting for writes to finish`;
			await writable.close();
		} catch (err) {
			$status.textContent = `Aborting`;
			await writable.abort(err);
			throw err;
		}

		$status.textContent = `Archive generation finished`;
	}
}

customElements.define('generate-archive-form', GenerateArchiveForm);

type BlockMap = Map<string, Uint8Array>;

interface Commit {
	version: 3;
	did: string;
	data: CID;
	rev: string;
	prev: CID | null;
	sig: Uint8Array;
}

interface TreeEntry {
	/** count of bytes shared with previous TreeEntry in this Node (if any) */
	p: number;
	/** remainder of key for this TreeEntry, after "prefixlen" have been removed */
	k: Uint8Array;
	/** link to a sub-tree Node at a lower level which has keys sorting after this TreeEntry's key (to the "right"), but before the next TreeEntry's key in this Node (if any) */
	v: CID;
	/** next subtree (to the right of leaf) */
	t: CID | null;
}

interface MstNode {
	/** link to sub-tree Node on a lower level and with all keys sorting before keys at this node */
	l: CID | null;
	/** ordered list of TreeEntry objects */
	e: TreeEntry[];
}

interface NodeEntry {
	key: string;
	cid: CID;
}

function* walk_entries(map: BlockMap, pointer: CID): Generator<NodeEntry> {
	const data = read_obj(map, pointer) as MstNode;
	const entries = data.e;

	let last_key = '';

	if (data.l !== null) {
		yield* walk_entries(map, data.l);
	}

	for (let i = 0, il = entries.length; i < il; i++) {
		const entry = entries[i];

		const key_str = decoder.decode(entry.k);
		const key = last_key.slice(0, entry.p) + key_str;

		last_key = key;

		yield { key: key, cid: entry.v };

		if (entry.t !== null) {
			yield* walk_entries(map, entry.t);
		}
	}
}

// async function verify_cid_for_bytes(cid: CID, bytes: Uint8Array) {
// 	const digest = await mf_sha256.digest(bytes);
// 	const expected = CID.createV1(cid.code, digest);

// 	if (!cid.equals(expected)) {
// 		throw new Error(`Invalid CID, expected ${expected} but got ${cid}`);
// 	}
// }

function read_obj(map: Map<string, Uint8Array>, cid: CID) {
	const bytes = map.get(cid.toString());
	assert(bytes != null, `cid not found`);

	const data = decode_cbor(bytes);

	return data;
}

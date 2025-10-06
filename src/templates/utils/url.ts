import type { At } from '@mary/bluesky-client/lexicons';

// import { get_page_context } from '../context.ts';
import { get_dirname, join_path, relative_path } from './path.ts';
import type { ContextMap } from '../context.ts';
import type { ContextData } from '../context.ts';

export function get_record_key(uri: At.Uri) {
	const idx = uri.lastIndexOf('/');
	return uri.slice(idx + 1);
}

export function get_collection_ns(uri: At.Uri) {
	const first = uri.indexOf('/', 5);
	const second = uri.indexOf('/', first + 1);

	return uri.slice(first + 1, second);
}

export function get_repo_id(uri: At.Uri) {
	const idx = uri.indexOf('/', 5);
	return uri.slice(5, idx) as At.DID;
}

export function get_bsky_app_url(uri: At.Uri) {
	const repo = get_repo_id(uri);
	const ns = get_collection_ns(uri);
	const rkey = get_record_key(uri);

	if (ns === 'app.bsky.feed.post') {
		return `https://bsky.app/profile/${repo}/post/${rkey}`;
	}

	if (ns === 'app.bsky.feed.generator') {
		return `https://bsky.app/profile/${repo}/feed/${rkey}`;
	}

	if (ns === 'app.bsky.graph.list') {
		return `https://bsky.app/profile/${repo}/lists/${rkey}`;
	}

	if (ns === 'app.bsky.actor.profile') {
		return `https://bsky.app/profile/${repo}`;
	}

	throw new Error(`unsupported uri: ${uri}`);
}

export function get_tid_segment(rkey: string) {
	// Use whatever's left after removing the last 10 characters as the bucket.
	const split = -10;

	return `${rkey.slice(0, split)}/${rkey.slice(split)}`;
}

export function get_cid_segment(cid: string) {
	// Use the first 8 characters as the bucket
	// Bluesky CIDs always starts with bafkrei (7 chars)
	const split = 8;

	return `${cid.slice(0, split)}/${cid.slice(split)}`;
}

export function get_relative_url(url: string, path: string) {
	return relative_path(get_dirname(path), url);
}

export function get_asset_url(asset: string, ctx: ContextMap, path: string) {
	const asset_dir = ctx.values().next().value?.asset_dir ?? `/assets`;
	return get_relative_url(join_path(asset_dir, asset), path);
}

export function get_blob_url(cid: string, archive: ContextData, path: string) {
	const segment = get_cid_segment(cid);

	return get_relative_url(join_path(archive.blob_dir, `${segment}`), path);
}

export function get_post_url(uri: At.Uri, ctx: ContextMap, path: string) {
	const did = get_repo_id(uri) as At.DID;
	const archive = ctx.get(did) as ContextData;
	const segment = get_tid_segment(get_record_key(uri));

	// probably over-engineered and i don't need ctx,
	// you can get the postref from uri and assume /posts from there, but w/e
	return get_relative_url(join_path(archive.posts_dir, `${segment}.html`), path);
}

export function make_bsky_post_aturi(did: At.DID, rkey: string) {
	return `at://${did}/app.bsky.feed.post/${rkey}`;
}

export function sanitize_did(did: At.DID) {
	return did.replaceAll(':', '_');
}

export function postref_to_uri(postref: string) {
	const parts = postref.split('/');
	const did = parts.shift()?.replace('_', ':') as At.DID;
	const rkey = parts.join('');

	return make_bsky_post_aturi(did, rkey);
}

export function uri_to_postref(uri: At.Uri) {
	const rkey = get_record_key(uri);
	const segment = get_tid_segment(rkey);

	const did = get_repo_id(uri) as At.DID;
	const sanitized_did = sanitize_did(did);

	return `${sanitized_did}/${segment}`;
}

import * as FlexSearch from '@akryum/flexsearch-es';

import { app, h, memo, text } from './dependencies/hyperapp.js';

/**
 * @typedef {(
 *   [rkey: string,
 *    text: string,
 *    timestamp: number,
 *    flags: number,
 *    alt: string,
 *    profile: {
 *      displayName: string,
 *      handle: string,
 *      did: string
 *    }
 *   ] & { idx: number }
 * )} PostEntry
 */

const PostEntryField = Object.freeze({
	RKEY: 0,
	TEXT: 1,
	TIMESTAMP: 2,
	FLAGS: 3,
	ALT: 4,
	PROFILE: 5,
});

/** @type {FlexSearch.Document<PostEntry, true>} */
const index = new FlexSearch.Document({
	document: {
		id: '0',
		index: [PostEntryField.TEXT.toString(), PostEntryField.ALT.toString()],
		// index: ['1', '4'], // post text and alt text
		store: true,
	},
	// tokenize: 'forward', // 'full'
});

// Initialize entries array outside scope to not get cleaned up
/** @type {PostEntry[]} */
let entries;

// Add posts to document
{
	// Grab the JSON that's been embedded into the page
	{
		/** @type {HTMLScriptElement} */
		const node = document.getElementById('search-json');
		node.remove();

		entries = JSON.parse(node.textContent);
	}

	// Go through the entries and add them all.
	{
		for (let i = 0, il = entries.length; i < il; i++) {
			/** @type {PostEntry} */
			const entry = entries[i];
			index.add(entry);
		}
	}
}

// Render our UI
{
	const abs_with_time = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });

	const HAS_EMBED_IMAGE = 1 << 0;
	const HAS_EMBED_LINK = 1 << 1;
	const HAS_EMBED_RECORD = 1 << 2;
	const HAS_EMBED_FEED = 1 << 3;
	const HAS_EMBED_LIST = 1 << 4;
	const HAS_EMBED_VIDEO = 1 << 5;

	const SORT_RELEVANT = 'relevant';
	const SORT_NEW = 'new';
	const SORT_OLD = 'old';

	/** @type {PostEntry[]} */
	let results = [];
	let sort = SORT_RELEVANT;

	const rerender = app({
		node: document.getElementById('root'),
		view() {
			return h('div', {}, [
				h('div', { class: 'SearchPage__header' }, [
					h('input', { class: 'SearchPage__input', oninput: handle_search_input }),
				]),

				h('div', { class: 'Filters' }, [
					render_filter_btn(SORT_RELEVANT, 'Relevant'),
					render_filter_btn(SORT_NEW, 'New'),
					render_filter_btn(SORT_OLD, 'Old'),
				]),

				h(
					'div',
					{},
					results.map((item) =>
						h('div', { class: 'SearchItem', key: item[PostEntryField.RKEY] }, [
							memo(render_search_item, { item: item }),
						]),
					),
				),
			]);
		},
	});

	function handle_filter_button(ev) {
		if (sort !== (sort = ev.target.value)) {
			sort_results();
			rerender();
		}
	}

	function handle_search_input(ev) {
		const parsed = parse_query(ev.target.value);

		if (parsed.skip_search) {
			results = JSON.parse(JSON.stringify(entries));

			if (sort !== SORT_RELEVANT) {
				results = sort_results();
			}

			results = filter_results(parsed.params);

			return rerender();
		}

		const [search_results] = index.search(parsed.query, { enrich: true });

		results = [];

		if (search_results !== undefined) {
			const res = search_results.result;
			for (let i = 0, ilen = res.length; i < ilen; i++) {
				const doc = res[i].doc;
				doc.idx = i;

				results.push(doc);
			}

			if (sort !== SORT_RELEVANT) {
				results = sort_results();
			}

			results = filter_results(parsed.params);
		}

        console.log(results)

		rerender();
	}

	function split_respecting_quotes(raw) {
		let quoted = false;
		let current = '';
		const parts = [];

		for (const char of raw) {
			if (char === '"') {
				quoted = !quoted;
				current += char;
			} else if (char === ' ' && !quoted) {
				if (current) {
					parts.push(current);
					current = '';
				}
			} else {
				current += char;
			}
		}

		if (current) parts.push(current);
		return parts;
	}

	function parse_query(query) {
		// https://github.com/bluesky-social/indigo/blob/main/search/parse_query.go
		// loosely based on palomar

		const parts = split_respecting_quotes(query);

		const params = {
			handles: [],
			authors: [],
			replyto: [],
			urls: [],
			domains: [],
			exclusions: [],
            since: null,
            until: null,
		};

		const keep = [];
		for (const p of parts) {
			// pass-through quoted segments
			if (p.startsWith('"')) {
				keep.push(p);
				continue;
			}

			// handle - i treat like author, bsky treats like mention
			if (p.startsWith('@') && p.length > 1) {
				params.handles.push(p.slice(1));
				continue;
			}

			// `-` prefix negates a single keyword
			if (p.startsWith('-') && p.length > 1) {
				params.exclusions.push(p.slice(1));
				continue;
			}

			// parse tokens
			const tok_parts = p.split(':');
			if (tok_parts.length === 1) {
				keep.push(p);
				continue;
			}

			switch (tok_parts[0]) {
				case 'did':
					params.authors.push(p);
					continue;
				case 'from':
					params.handles.push(tok_parts[1]);
					continue;
				case 'replyto':
					params.replyto.push(tok_parts[1]);
					continue;
                case 'http':
                case 'https':
					params.urls.push(p);
					continue;
				case 'domain':
					params.domains.push(tok_parts[1]);
					continue;
				case 'since':
                case 'until':
                    // use local time on user input
                    const ts = new Date(tok_parts[1] + "T00:00:00").getTime();
				    if (isNaN(ts)) break;
                    if (tok_parts[0] === 'since') {
                        if (!params.since || params.since < ts) params.since = ts;
                    } else if (tok_parts[0] === 'until') {
                        if (!params.until || params.until > ts) params.until = ts;
                    }
                    continue
			}

			keep.push(p);
		}

		return {
			query: keep.join(' '),
			params: params,
			skip_search: keep.length === 0 && query != '',
		};
	}

	function filter_results(params, max_results = 200) {
		const filtered = [];
		const excludeSet = new Set(params.exclusions.map((w) => w.toLowerCase()));

        console.log("params: ", params)
        console.log("before filter results: ", results)

		for (const item of results) {
			// filter did author
			if (params.authors.length > 0 && !params.authors.includes(item[PostEntryField.PROFILE].did)) {
				continue;
			}

			// filter handle author
			if (params.handles.length > 0 && !params.handles.includes(item[PostEntryField.PROFILE].handle)) {
				continue;
			}

			// filter excluded words
			if (params.exclusions.length > 0) {
				const text_words = item[PostEntryField.TEXT].split(/\s+/);
				const alt_words = item[PostEntryField.ALT].split(/\s+/);
				const words = [...text_words, ...alt_words];
				if (words.some((word) => excludeSet.has(word.toLowerCase()))) continue;
			}

			// TODO: replyto, domains, urls

            if (params.since && item[PostEntryField.TIMESTAMP] < params.since) {
                continue;
            }

            if (params.until && item[PostEntryField.TIMESTAMP] > params.until) {
                continue;
            }

			filtered.push(item);

			if (filtered.length >= max_results) break;
		}

		return filtered;
	}

	function sort_results() {
		if (sort === SORT_RELEVANT) {
			return results.sort((a, b) => a.idx - b.idx);
		} else if (sort === SORT_NEW) {
			return results.sort((a, b) => b[PostEntryField.TIMESTAMP] - a[PostEntryField.TIMESTAMP]);
		} else if (sort === SORT_OLD) {
			return results.sort((a, b) => a[PostEntryField.TIMESTAMP] - b[PostEntryField.TIMESTAMP]);
		}
	}

	function render_filter_btn(val, label) {
		const active = sort === val;
		const cn = 'Interactive Interactive--primary Filter' + (active ? ' Filter--active' : '');

		return h('button', { value: val, class: cn, onclick: handle_filter_button }, text(label));
	}

	function render_search_item({ item }) {
		const [postref, post_text, ts, flags, alt, profile] = item;
		const profile_page_url = `profile/${profile.did.replaceAll(':', '_')}/posts/1.html`;

		return h('div', { class: 'SearchItem__content' }, [
			h('a', { href: profile_page_url, class: 'SearchItem__displayName' }, [
				text(`@${profile.handle || profile.did}`),
			]),
			h('br', {}, []),
			h('a', { href: `posts/${postref}.html`, class: 'SearchItem__timestamp' }, [
				text(ts === 0 ? 'N/A' : abs_with_time.format(ts)),
			]),
			h('p', { class: 'SearchItem__body' }, [text(post_text)]),
			(flags & HAS_EMBED_IMAGE) !== 0 && h('p', { class: 'SearchItem__accessory' }, text('[image]')),
			(flags & HAS_EMBED_VIDEO) !== 0 && h('p', { class: 'SearchItem__accessory' }, text('[video]')),
		]);
	}
}

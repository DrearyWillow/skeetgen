import { repeat } from '@intrnl/jsx-to-string';

import { get_asset_url, get_relative_url } from '../utils/url.ts';

import { create_pagination } from '../utils/pagination.ts';
import { create_timeline_slices, type PostTuple } from '../utils/timeline.ts';

import FeedPost from '../components/FeedPost.tsx';
import Page from '../components/Page.tsx';
import type { ContextMap } from '../context.ts';
import type { PostGraphMap } from '../utils/posts.ts';

export type TimelineType = 'posts' | 'with_replies' | 'media' | 'videos';
export type TimelineTypeRecord = Record<TimelineType, number>;

export interface TimelinePageProps {
	type: TimelineType;
	current_page: number;
	total_pages: number;
	posts: PostTuple[];
	ctx: ContextMap;
	path: string;
	graph: PostGraphMap;
}

const TYPE_LABELS: Record<string, string> = {
	posts: 'Posts',
	with_replies: 'Replies',
	media: 'Media',
	videos: 'Videos',
};

export function TimelinePage({
	type,
	current_page,
	total_pages,
	posts,
	ctx,
	path,
	graph,
}: TimelinePageProps) {
	const label = TYPE_LABELS[type] ?? type;
	const slices = create_timeline_slices(posts);

	const pagination = create_pagination(current_page, total_pages);

	return (
		<Page title={`Timeline - ${label} (page ${current_page})`} ctx={ctx} path={path}>
			<div class="Filters">
				<FilterButton type="posts" active={type === 'posts'} path={path} />
				<FilterButton type="with_replies" active={type === 'with_replies'} path={path} />
				<FilterButton type="media" active={type === 'media'} path={path} />
				<FilterButton type="videos" active={type === 'videos'} path={path} />
			</div>

			<hr />

			<div class="TimelinePage__feed">
				{repeat(slices, (slice, idx) => {
					return (
						<>
							{idx !== 0 ? <hr class="TimelinePage__feedSeparator" /> : null}

							{repeat(slice.items, (item, idx, arr) => {
								return (
									<FeedPost
										uri={item.uri}
										post={item.post}
										has_prev={idx !== 0}
										has_next={idx !== arr.length - 1}
										always_show_replies={true}
										ctx={ctx}
										path={path}
										graph={graph}
									/>
								);
							})}
						</>
					);
				})}
			</div>

			<div class="TimelinePage__pagination">
				{repeat(pagination, (val) => {
					if (typeof val === 'number') {
						return (
							<a
								aria-label={`Go to page ${val}`}
								href={get_relative_url(`/timeline/${type}/${val}.html`, path)}
								class={
									'Interactive TimelinePage__page Interactive--primary' +
									(val === current_page ? ' TimelinePage__page--active' : '')
								}
							>
								{val}
							</a>
						);
					}

					if (val === 'prev') {
						const disabled = current_page <= 1;

						return (
							<a
								title={!disabled ? `Go to previous page` : undefined}
								href={
									!disabled ? get_relative_url(`/timeline/${type}/${current_page - 1}.html`, path) : undefined
								}
								class={
									'TimelinePage__page' +
									(!disabled ? ' Interactive Interactive--primary' : ' TimelinePage__page--disabled')
								}
							>
								<svg class="TimelinePage__pageIcon TimelinePage__pageIcon--prev" viewBox="0 0 24 24">
									<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
								</svg>
							</a>
						);
					}

					if (val === 'next') {
						const disabled = current_page >= total_pages;

						return (
							<a
								title={!disabled ? `Go to next page` : undefined}
								href={
									!disabled ? get_relative_url(`/timeline/${type}/${current_page + 1}.html`, path) : undefined
								}
								class={
									'TimelinePage__page' +
									(!disabled ? ' Interactive Interactive--primary' : ' TimelinePage__page--disabled')
								}
							>
								<svg class="TimelinePage__pageIcon TimelinePage__pageIcon--next" viewBox="0 0 24 24">
									<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
								</svg>
							</a>
						);
					}

					if (val === 'dots_start' || val === 'dots_end') {
						return (
							<div class="TimelinePage__page TimelinePage__page--disabled TimelinePage__pageInput">
								<input
									type="text"
									inputmode="numeric"
									min="1"
									max={total_pages}
									placeholder="…"
									class="pageInput"
									name="pageInput"
								/>
							</div>
						);
					}

					return null;
				})}
			</div>

			<script src={get_asset_url('page-input.js', ctx, path)}></script>
		</Page>
	);
}

interface FilterButtonProps {
	type: TimelineType;
	active: boolean;
	path: string;
}

function FilterButton({ active, type, path }: FilterButtonProps) {
	return (
		<a
			href={get_relative_url(`/timeline/${type}/1.html`, path)}
			class={'Interactive Interactive--primary Filter' + (active ? ' Filter--active' : '')}
		>
			{TYPE_LABELS[type] ?? type}
		</a>
	);
}

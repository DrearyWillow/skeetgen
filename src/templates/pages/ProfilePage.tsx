import { repeat } from '@intrnl/jsx-to-string';

import { get_blob_url, get_relative_url, sanitize_did } from '../utils/url.ts';

import { create_pagination } from '../utils/pagination.ts';
import { create_timeline_slices, type PostTuple } from '../utils/timeline.ts';

import FeedPost from '../components/FeedPost.tsx';
import Page from '../components/Page.tsx';
import { get_blob_str, type ContextData, type ContextMap } from '../context.ts';
import type { PostGraphMap } from '../utils/posts.ts';
import { format_long } from '../intl/number.ts';
import type { TimelineType, TimelineTypeRecord } from './TimelinePage.tsx';

export interface ProfilePageProps {
	type: TimelineType;
	current_page: number;
	total_pages: number;
	posts: PostTuple[];
	ctx: ContextMap;
	path: string;
	graph: PostGraphMap;
	profile_archive: ContextData;
	post_counts: TimelineTypeRecord;
}

const TYPE_LABELS: Record<string, string> = {
	posts: 'Posts',
	with_replies: 'Replies',
	media: 'Media',
	videos: 'Videos',
};

export function ProfilePage({
	type,
	current_page,
	total_pages,
	posts,
	ctx,
	path,
	graph,
	profile_archive,
	post_counts,
}: ProfilePageProps) {
	const label = TYPE_LABELS[type] ?? type;
	const slices = create_timeline_slices(posts);
	const pagination = create_pagination(current_page, total_pages);

	const prefix = `profile/${sanitize_did(profile_archive.profile.did)}`;
	const profile = profile_archive.records.profile;
	const banner = profile?.banner ? get_blob_str(profile.banner) : undefined;
	const pfp = profile?.avatar ? get_blob_str(profile.avatar) : undefined;

	return (
		<Page
			title={`@${profile_archive.profile.handle} - ${label} (page ${current_page})`}
			ctx={ctx}
			path={path}
		>
			<div class="ProfilePage__profileHeader">
				<div class={'ProfilePage__bannerContainer'}>
					{banner ? (
						<img
							loading="lazy"
							src={get_blob_url(banner, profile_archive, path)}
							class="ProfilePage__banner"
						/>
					) : null}
					<div class={'ProfilePage__pfpContainer'}>
						{pfp ? (
							<img loading="lazy" src={get_blob_url(pfp, profile_archive, path)} class="ProfilePage__pfp" />
						) : null}
					</div>
				</div>
				<div class={'ProfilePage__nameContainer'}>
					<p class={'ProfilePage__displayName'}>{profile_archive.profile.displayName}</p>
					<p class={'ProfilePage__handle'}>{profile_archive.profile.handle}</p>
					<p class={'ProfilePage__did'}>{profile_archive.profile.did}</p>
					<p class={'ProfilePage__description'}>{profile?.description}</p>
				</div>
			</div>

			<div class="Filters">
				<FilterButton
					type="posts"
					active={type === 'posts'}
					count={post_counts.posts}
					prefix={prefix}
					path={path}
				/>
				<FilterButton
					type="with_replies"
					active={type === 'with_replies'}
					count={post_counts.with_replies}
					prefix={prefix}
					path={path}
				/>
				<FilterButton
					type="media"
					active={type === 'media'}
					count={post_counts.media}
					prefix={prefix}
					path={path}
				/>
				<FilterButton
					type="videos"
					active={type === 'videos'}
					count={post_counts.videos}
					prefix={prefix}
					path={path}
				/>
			</div>

			<div class="ProfilePage__feed">
				{repeat(slices, (slice, idx) => {
					return (
						<>
							{idx !== 0 ? <hr class="ProfilePage__feedSeparator" /> : null}

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

			<div class="ProfilePage__pagination">
				{repeat(pagination, (val) => {
					if (typeof val === 'number') {
						return (
							<a
								aria-label={`Go to page ${val}`}
								href={get_relative_url(`/${prefix}/${type}/${val}.html`, path)}
								class={
									'Interactive ProfilePage__page Interactive--primary' +
									(val === current_page ? ' ProfilePage__page--active' : '')
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
									!disabled
										? get_relative_url(`/${prefix}/${type}/${current_page - 1}.html`, path)
										: undefined
								}
								class={
									'ProfilePage__page' +
									(!disabled ? ' Interactive Interactive--primary' : ' ProfilePage__page--disabled')
								}
							>
								<svg class="ProfilePage__pageIcon ProfilePage__pageIcon--prev" viewBox="0 0 24 24">
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
									!disabled
										? get_relative_url(`/${prefix}/${type}/${current_page + 1}.html`, path)
										: undefined
								}
								class={
									'ProfilePage__page' +
									(!disabled ? ' Interactive Interactive--primary' : ' ProfilePage__page--disabled')
								}
							>
								<svg class="ProfilePage__pageIcon ProfilePage__pageIcon--next" viewBox="0 0 24 24">
									<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
								</svg>
							</a>
						);
					}

					if (val === 'dots_start' || val === 'dots_end') {
						return (
							<div class="ProfilePage__page ProfilePage__page--disabled">
								<svg class="ProfilePage__pageIcon ProfilePage__pageIcon--boundary" viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m12 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-6 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"
									/>
								</svg>
							</div>
						);
					}

					return null;
				})}
			</div>
		</Page>
	);
}

interface FilterButtonProps {
	type: TimelineType;
	active: boolean;
	prefix: string;
	path: string;
	count: number;
}

function FilterButton({ active, type, prefix, path, count }: FilterButtonProps) {
	return (
		<a
			href={get_relative_url(`/${prefix}/${type}/1.html`, path)}
			class={'Interactive Interactive--primary Filter' + (active ? ' Filter--active' : '')}
		>
			{`${TYPE_LABELS[type] ?? type} (${format_long(count || 0)})`}
		</a>
	);
}

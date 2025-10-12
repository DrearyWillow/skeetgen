import type { At } from '@mary/bluesky-client/lexicons';
import { repeat } from '@intrnl/jsx-to-string';

import type { ContextMap } from '../context';
import type { AllPostsMap, PostGraphMap } from '../utils/posts';
import Page from '../components/Page';
import { get_asset_url, get_post_url, get_relative_url, get_repo_id, uri_to_postref } from '../utils/url';
import FeedPost from '../components/FeedPost';
import { format_long } from '../intl/number';
import { create_pagination } from '../utils/pagination';

export interface QuotePageProps {
	uri: At.Uri;
	quote_uris: At.Uri[];
	total_quotes: number;
	current_page: number;
	total_pages: number;
	ctx: ContextMap;
	graph: PostGraphMap;
	posts: AllPostsMap;
	path: string;
}

export function QuotePage({
	uri,
	quote_uris,
	total_quotes,
	current_page,
	total_pages,
	ctx,
	graph,
	posts,
	path,
}: QuotePageProps) {
	const archive = ctx.get(get_repo_id(uri));

	const pagination = create_pagination(current_page, total_pages);

	const pathdir = `/quotes/${uri_to_postref(uri)}`;

	return (
		<Page title={`Quotes of @${archive?.profile.handle}`} ctx={ctx} path={path}>
			<div class="QuotePage__quoteHeader">
				<div class="QuotePage__quoteTitleRow">
					<a href={get_post_url(uri, ctx, path)} aria-label="Back">
						<svg class="QuotePage__backIcon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
						</svg>
					</a>
					<div class="QuotePage__headerText">
						<p class="QuotePage__quoteTitle">Quotes</p>
						<p class="QuotePage__quoteCount">
							{format_long(total_quotes)} {total_quotes === 1 ? 'quote' : 'quotes'}
						</p>
					</div>
				</div>
				<hr />
			</div>

			<div class="QuotePage__feed">
				{repeat(quote_uris, (quote_uri, idx) => {
					return (
						<>
							{idx !== 0 ? <hr class="QuotePage__feedSeparator" /> : null}
							<FeedPost
								uri={quote_uri}
								post={posts.get(quote_uri)!}
								always_show_replies={false}
								has_prev={false}
								has_next={false}
								ctx={ctx}
								path={path}
								graph={graph}
							/>
						</>
					);
				})}
			</div>

			{total_pages > 1 ? (
				<>
					<div class="QuotePage__pagination">
						{repeat(pagination, (val) => {
							if (typeof val === 'number') {
								return (
									<a
										aria-label={`Go to page ${val}`}
										href={get_relative_url(`${pathdir}/${val}.html`, path)}
										class={
											'Interactive QuotePage__page Interactive--primary' +
											(val === current_page ? ' QuotePage__page--active' : '')
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
											!disabled ? get_relative_url(`${pathdir}/${current_page - 1}.html`, path) : undefined
										}
										class={
											'QuotePage__page' +
											(!disabled ? ' Interactive Interactive--primary' : ' QuotePage__page--disabled')
										}
									>
										<svg class="QuotePage__pageIcon QuotePage__pageIcon--prev" viewBox="0 0 24 24">
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
											!disabled ? get_relative_url(`${pathdir}/${current_page + 1}.html`, path) : undefined
										}
										class={
											'QuotePage__page' +
											(!disabled ? ' Interactive Interactive--primary' : ' QuotePage__page--disabled')
										}
									>
										<svg class="QuotePage__pageIcon QuotePage__pageIcon--next" viewBox="0 0 24 24">
											<path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
										</svg>
									</a>
								);
							}

							if (val === 'dots_start' || val === 'dots_end') {
								return (
									<div class="QuotePage__page QuotePage__page--disabled QuotePage__pageInput">
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
				</>
			) : null}

			<hr />
		</Page>
	);
}

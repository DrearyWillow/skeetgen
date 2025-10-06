import type { JSXNode } from '@intrnl/jsx-to-string';

import { get_asset_url, get_relative_url } from '../utils/url.ts';
import type { ContextMap } from '../context.ts';

export interface PageProps {
	title?: string;
	children?: JSXNode;
	head?: JSXNode;
	ctx: ContextMap;
	path: string;
}

function Page({ title, children, head, ctx, path }: PageProps) {
	return (
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width" />
				<title>{title}</title>
				<link rel="stylesheet" href={get_asset_url('style.css', ctx, path)} />
				{head}
			</head>
			<body>
				<div class="Root">
					{alt_text_overlay()}
					<div class="Page">
						<div class="PageHeader">
							<a href={get_relative_url('/index.html', path)} class="Link">
								Home
							</a>
							<a href={get_relative_url('/timeline/posts/1.html', path)} class="Link">
								Timeline
							</a>
							<a href={get_relative_url('/search.html', path)} class="Link">
								Search
							</a>
						</div>
						{children}
					</div>
				</div>
			</body>
			<script src={get_asset_url('alt-text-overlay.js', ctx, path)} defer></script>
		</html>
	);
}

export default Page;

function alt_text_overlay() {
	return (
		<div id="alt-text-overlay" class="AltTextOverlay AltTextOverlay--hidden">
			<div class="AltTextOverlay__contentContainer">
				<h2 class="AltTextOverlay__header">Alt Text</h2>
				<p id="alt-text-content" class="AltTextOverlay__content"></p>
				<button class="AltTextOverlay__button" onclick="hideAltText()">
					Close
				</button>
			</div>
		</div>
	);
}

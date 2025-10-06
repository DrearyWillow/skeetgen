import type { AppBskyFeedGenerator } from '@mary/bluesky-client/lexicons';

import { get_blob_str } from '../../context.ts';
import { get_blob_url } from '../../utils/url.ts';
import type { ContextData } from '../../context.ts';

export interface EmbedFeedProps {
	record: AppBskyFeedGenerator.Record;
    archive: ContextData;
    path: string;
}

function EmbedFeed({ record, archive, path }: EmbedFeedProps) {
	return (
		<div class="EmbedFeed">
			<div class="EmbedFeed__avatarContainer">
				{record.avatar ? (
					<img loading="lazy" src={get_blob_url(get_blob_str(record.avatar), archive, path)} class="EmbedFeed__avatar" />
				) : null}
			</div>

			<div class="EmbedFeed__main">
				<p class="EmbedFeed__name">{record.displayName}</p>
				<p class="EmbedFeed__type">Feed</p>
			</div>
		</div>
	);
}

export default EmbedFeed;

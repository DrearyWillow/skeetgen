import type { AppBskyGraphDefs, AppBskyGraphList } from '@mary/bluesky-client/lexicons';

import { get_blob_str } from '../../context.ts';
import { get_blob_url } from '../../utils/url.ts';
import type { ContextData } from '../../context.ts';

const LIST_PURPOSE_LABELS: Record<AppBskyGraphDefs.ListPurpose, string> = {
	'app.bsky.graph.defs#modlist': 'Moderation list',
	'app.bsky.graph.defs#curatelist': 'Curation list',
	'app.bsky.graph.defs#referencelist': 'Reference list',
};

export interface EmbedListProps {
	record: AppBskyGraphList.Record;
    archive: ContextData;
    path: string;
}

function EmbedList({ record, archive, path }: EmbedListProps) {
	const raw_purpose = record.purpose;
	const purpose = raw_purpose in LIST_PURPOSE_LABELS ? LIST_PURPOSE_LABELS[raw_purpose] : raw_purpose;

	return (
		<div class="EmbedList">
			<div class="EmbedList__avatarContainer">
				{record.avatar ? (
					<img loading="lazy" src={get_blob_url(get_blob_str(record.avatar), archive, path)} class="EmbedList__avatar" />
				) : null}
			</div>

			<div class="EmbedList__main">
				<p class="EmbedList__name">{record.name}</p>
				<p class="EmbedList__type">{purpose}</p>
			</div>
		</div>
	);
}

export default EmbedList;

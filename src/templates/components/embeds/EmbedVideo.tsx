import { get_blob_str } from '../../context.ts';
import { get_blob_url } from '../../utils/url.ts';

import type { EmbeddedVideo } from '../../utils/embed.ts';
import type { ContextData } from '../../context.ts';

export interface EmbedImageProps {
	video: EmbeddedVideo;
	is_bordered: boolean;
	archive: ContextData;
	path: string;
}

function EmbedVideo({ video, is_bordered, archive, path }: EmbedImageProps) {
	const alt = video.alt;
	const aspectRatio = video.aspectRatio;

	let cn: string | undefined;
	let ratio: string | undefined;

	if (aspectRatio) {
		cn = `EmbedVideo__videoContainer--aspectRatio`;
		ratio = `${aspectRatio!.width}/${aspectRatio!.height}`;
	} else {
		cn = `EmbedVideo__videoContainer--noRatio`;
	}

	const cid = get_blob_str(video.video);

	return (
		<div class={'EmbedVideo' + (is_bordered ? ' EmbedVideo--bordered' : '')}>
			<div class={'EmbedVideo__videoContainer ' + cn} style={{ 'aspect-ratio': ratio }}>
				<video preload="metadata" controls aria-label={alt} class="EmbedVideo__video">
					<source src={get_blob_url(cid, archive, path)} type="video/mp4" />
				</video>
				{alt ? (
					<button class="EmbedVideo__altButton" type="button" onclick={`showAltText(${JSON.stringify(alt)})`}>
						ALT
					</button>
				) : null}
			</div>
		</div>
	);
}

export default EmbedVideo;

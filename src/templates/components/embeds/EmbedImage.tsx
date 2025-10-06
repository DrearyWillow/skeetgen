import { get_blob_str } from '../../context.ts';
import { get_blob_url } from '../../utils/url.ts';

import type { EmbeddedImage } from '../../utils/embed.ts';
import type { ContextData } from '../../context.ts';

export interface EmbedImageProps {
	images: EmbeddedImage[];
	is_bordered: boolean;
	allow_standalone_ratio: boolean;
	archive: ContextData;
	path: string;
}

const enum RenderMode {
	MULTIPLE,
	STANDALONE,
	STANDALONE_RATIO,
}

function EmbedImage({ images, is_bordered, allow_standalone_ratio, archive, path }: EmbedImageProps) {
	const length = images.length;
	const is_standalone_image = allow_standalone_ratio && length === 1 && 'aspectRatio' in images[0];

	return (
		<div
			class={
				'EmbedImage' +
				(is_bordered ? ' EmbedImage--bordered' : '') +
				(is_standalone_image ? ' EmbedImage--standalone' : '')
			}
		>
			{is_standalone_image ? (
				render_img(images[0], RenderMode.STANDALONE_RATIO, archive, path)
			) : length === 1 ? (
				render_img(images[0], RenderMode.STANDALONE, archive, path)
			) : length === 2 ? (
				<div class="EmbedImage__grid">
					<div class="EmbedImage__col">{render_img(images[0], RenderMode.MULTIPLE, archive, path)}</div>
					<div class="EmbedImage__col">{render_img(images[1], RenderMode.MULTIPLE, archive, path)}</div>
				</div>
			) : length === 3 ? (
				<div class="EmbedImage__grid">
					<div class="EmbedImage__col">
						{render_img(images[0], RenderMode.MULTIPLE, archive, path)}
						{render_img(images[1], RenderMode.MULTIPLE, archive, path)}
					</div>

					<div class="EmbedImage__col">{render_img(images[2], RenderMode.MULTIPLE, archive, path)}</div>
				</div>
			) : length === 4 ? (
				<div class="EmbedImage__grid">
					<div class="EmbedImage__col">
						{render_img(images[0], RenderMode.MULTIPLE, archive, path)}
						{render_img(images[2], RenderMode.MULTIPLE, archive, path)}
					</div>

					<div class="EmbedImage__col">
						{render_img(images[1], RenderMode.MULTIPLE, archive, path)}
						{render_img(images[3], RenderMode.MULTIPLE, archive, path)}
					</div>
				</div>
			) : null}
		</div>
	);
}

export default EmbedImage;

function render_img(img: EmbeddedImage, mode: RenderMode, archive: ContextData, path: string) {
	// FIXME: with STANDALONE_RATIO, we are resizing the image to make it fit
	// the container with our given constraints, but this doesn't work when the
	// image hasn't had its metadata loaded yet, the browser will snap to the
	// smallest possible size for our layout.

	const alt = img.alt;
	const aspectRatio = img.aspectRatio;

	let cn: string | undefined;
	let ratio: string | undefined;

	if (mode === RenderMode.MULTIPLE) {
		cn = `EmbedImage__imageContainer--multiple`;
	} else if (mode === RenderMode.STANDALONE) {
		cn = `EmbedImage__imageContainer--standalone`;
	} else if (mode === RenderMode.STANDALONE_RATIO) {
		cn = `EmbedImage__imageContainer--standaloneRatio`;
		ratio = `${aspectRatio!.width}/${aspectRatio!.height}`;
	}

	const cid = get_blob_str(img.image);

	return (
		<div class={'EmbedImage__imageContainer ' + cn} style={{ 'aspect-ratio': ratio }}>
			<img loading="lazy" src={get_blob_url(cid, archive, path)} alt={alt} class="EmbedImage__image" />
			{alt ? (
				<button class="EmbedImage__altButton" type="button" onclick={`showAltText(${JSON.stringify(alt)})`}>
					ALT
				</button>
			) : null}
		</div>
	);
}

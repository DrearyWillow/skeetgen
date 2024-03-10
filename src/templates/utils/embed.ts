import type {
	AppBskyEmbedExternal,
	AppBskyEmbedImages,
	ComAtprotoRepoStrongRef,
} from '@mary/bluesky-client/lexicons';

export type EmbeddedImage = AppBskyEmbedImages.Image;
export type EmbeddedLink = AppBskyEmbedExternal.External;
export type EmbeddedRecord = ComAtprotoRepoStrongRef.Main;

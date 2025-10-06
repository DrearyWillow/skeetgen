import type {
	AppBskyEmbedExternal,
	AppBskyEmbedImages,
	ComAtprotoRepoStrongRef,
    AppBskyEmbedRecord,
    Brand,
    Branding,
    At,
} from '@mary/bluesky-client/lexicons';

export type EmbeddedImage = AppBskyEmbedImages.Image;
export type EmbeddedLink = AppBskyEmbedExternal.External;
export type EmbeddedRecord = ComAtprotoRepoStrongRef.Main;
export type EmbeddedVideo = AppBskyEmbedVideo.Main;

export type ExtendedEmbed = Brand.Union<
    | AppBskyEmbedExternal.Main
    | AppBskyEmbedImages.Main
    | AppBskyEmbedRecord.Main
    | ExtendedAppBskyEmbedRecordWithMedia.Main
    | AppBskyEmbedVideo.Main
>;

export declare namespace AppBskyEmbedVideo {
    interface Main {
        [Branding]?: 'app.bsky.embed.video';
        alt: string;
        aspectRatio?: AspectRatio;
        video: At.Blob<`video/${string}`>;
    }

    interface AspectRatio {
        [Branding]?: 'app.bsky.embed.video#aspectRatio';
        height: number;
        width: number;
    }
}

export declare namespace ExtendedAppBskyEmbedRecordWithMedia {
	interface Main {
		[Branding]?: 'app.bsky.embed.recordWithMedia';
		media: Brand.Union<AppBskyEmbedExternal.Main | AppBskyEmbedImages.Main | AppBskyEmbedVideo.Main>;
		record: AppBskyEmbedRecord.Main;
	}
}
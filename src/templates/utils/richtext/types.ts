import type { AppBskyRichtextFacet, Brand } from '@mary/bluesky-client/lexicons';

export type Facet = AppBskyRichtextFacet.Main;
export type LinkFeature = Brand.Union<AppBskyRichtextFacet.Link>;
export type MentionFeature = Brand.Union<AppBskyRichtextFacet.Mention>;
export type TagFeature = Brand.Union<AppBskyRichtextFacet.Tag>;

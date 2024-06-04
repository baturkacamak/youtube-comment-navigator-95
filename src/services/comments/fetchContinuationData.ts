import { ContentItem } from "../../types/commentTypes";

export const fetchContinuationData = (ytInitialData: any, isFetchingReply: boolean = false) => {
    try {
        const contents: ContentItem[] = ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

        // Check the first path
        let continuationData = contents
            .map((content: ContentItem) => content.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token)
            .find((token: string | undefined) => token);

        // If the first path doesn't have the continuation token, check the second path
        if (!continuationData && !isFetchingReply) {
            continuationData = contents
                .map((content: ContentItem) => content.itemSectionRenderer?.header?.[0]?.commentsHeaderRenderer?.sortMenu?.sortFilterSubMenuRenderer?.subMenuItems?.[0]?.serviceEndpoint?.continuationCommand?.token)
                .find((token: string | undefined) => token);
        }

        if (!continuationData) {
            console.error("Continuation data is null or undefined.");
            return null;
        }

        console.log("Continuation data fetched:", continuationData);

        return continuationData;
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Error in fetchContinuationData: ${err.message}`, err);
        } else {
            console.error(`Error in fetchContinuationData:`, err);
        }
        return null;
    }
};

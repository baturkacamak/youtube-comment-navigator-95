import {fetchContinuationTokenFromRemote} from './fetchContinuationData';

const safelyExecute = (func: Function) => {
    try {
        return func();
    } catch (error) {
        console.error('Error executing function:', error);
        return null;
    }
};

export const generateRequestOptions = async ({ continue: continueToken, windowObj }: {
    continue: string,
    windowObj: any
}, isFetchingReply: boolean = false) => {
    try {
        const ytcfg = windowObj.ytcfg;
        const ytcfgData = ytcfg?.data_;
        const feedbackData = ytcfgData?.GOOGLE_FEEDBACK_PRODUCT_DATA;
        const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || "1";
        const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION;
        const clientContext = ytcfgData?.INNERTUBE_CONTEXT?.client;

        if (!clientContext || !clientVersion) {
            throw new Error("Invalid or missing YouTube configuration data.");
        }

        // If continueToken is provided and the URL has not changed, use it after cleanup
        if (continueToken) {
            return continueToken.replace(/(%3D)+$/g, '');
        }

        const continuation = await fetchContinuationTokenFromRemote();

        const requestOptions = {
            headers: {
                accept: "*/*",
                "accept-language": feedbackData?.accept_language || "en-US,en;q=0.9",
                "content-type": "application/json",
                pragma: "no-cache",
                "cache-control": "no-store",
                "x-youtube-client-name": clientName,
                "x-youtube-client-version": clientVersion
            },
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({
                context: { client: clientContext },
                continuation: continuation
            }),
            method: "POST",
            mode: "cors",
            credentials: "include"
        };

        return JSON.parse(JSON.stringify(requestOptions));
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error generating request options:", error.message, {
                continueToken,
                ytcfgData: windowObj.ytcfg?.data_,
                error
            });
        } else {
            console.error("Error generating request options:", {
                continueToken,
                ytcfgData: windowObj.ytcfg?.data_,
                error
            });
        }

        return null;
    }
};

export const fetchCommentJsonDataFromRemote = async (continueToken: string | null, windowObj: any, signal: AbortSignal | null, isFetchingReply: boolean = false) => {
    const requestOptions = await generateRequestOptions({
        continue: continueToken || '', // Use empty string if continueToken is null
        windowObj,
    }, isFetchingReply);

    if (!requestOptions) {
        console.error("Failed to generate request options.");
        return [];
    }

    // First request to get initial data
    const response = await fetch(`https://www.youtube.com/youtubei/v1/next`, {
        ...requestOptions,
        signal,
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const initialData = await response.json();

    // Extract the new continuation token from the initial response
    const newContinuationToken = initialData.onResponseReceivedEndpoints?.[0]?.reloadContinuationItemsCommand?.continuationItems?.[0]?.commentsHeaderRenderer?.sortMenu?.sortFilterSubMenuRenderer?.subMenuItems?.[1]?.serviceEndpoint?.continuationCommand?.token;

    if (!newContinuationToken) {
        console.error("Failed to extract new continuation token from the initial response.");
        return initialData;
    }

    // Second request with the new continuation token
    const newRequestOptions = await generateRequestOptions({
        continue: newContinuationToken,
        windowObj,
    }, isFetchingReply);

    if (!newRequestOptions) {
        console.error("Failed to generate request options for the second request.");
        return initialData;
    }

    const newResponse = await fetch(`https://www.youtube.com/youtubei/v1/next`, {
        ...newRequestOptions,
        signal,
        cache: "no-store"
    });

    if (!newResponse.ok) {
        throw new Error("Network response was not ok for the second request");
    }

    const newData = await newResponse.json();

    return newData;
};

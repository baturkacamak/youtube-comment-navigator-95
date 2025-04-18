import { fetchContinuationTokenFromRemote, getContinuationTokenFromData } from './fetchContinuationTokenFromRemote';

const getContinuationToken = async (
    continueToken: string | null,
    windowObj: any,
    isFetchingReply: boolean,
): Promise<string> => {
    if (continueToken) {
        return continueToken;
    }

    let continuation = getContinuationTokenFromData(windowObj.ytInitialData, isFetchingReply);

    if (!continuation) {
        continuation = await fetchContinuationTokenFromRemote();
    }

    return continuation;
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

        const continuation = await getContinuationToken(continueToken, windowObj, isFetchingReply);

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

export const fetchCommentJsonDataFromRemote = async (
    continueToken: string | null,
    windowObj: any,
    signal?: AbortSignal
) => {
    const requestOptions = await generateRequestOptions({
        continue: continueToken || '', // Use empty string if continueToken is null
        windowObj,
    });

    if (!requestOptions) {
        console.error("Failed to generate request options.");
        return [];
    }

    const response = await fetch(`https://www.youtube.com/youtubei/v1/next?replies=${signal !== undefined}`, {
        ...requestOptions,
        cache: "no-store",
        signal, // Pass the signal here
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const initialData = await response.json();
    return initialData;
};

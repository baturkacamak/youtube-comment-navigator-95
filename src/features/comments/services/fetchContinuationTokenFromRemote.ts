import {ContentItem} from "../../../types/commentTypes";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";

export const getContinuationTokenFromData = (data: any, isFetchingReply: boolean = false) => {
    try {
        const contents: ContentItem[] = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

        // Check the first path
        let continuationToken = contents
            .map((content: ContentItem) => content.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token)
            .find((token: string | undefined) => token);

        // If the first path doesn't have the continuation token, check the second path
        if (!continuationToken && !isFetchingReply) {
            continuationToken = contents
                .map((content: ContentItem) => content.itemSectionRenderer?.header?.[0]?.commentsHeaderRenderer?.sortMenu?.sortFilterSubMenuRenderer?.subMenuItems?.[0]?.serviceEndpoint?.continuationCommand?.token)
                .find((token: string | undefined) => token);
        }

        if (!continuationToken) {
            console.error("Continuation data is null or undefined.");
            return null;
        }

        // Replace the 48th character 'A' with 'B'
        if (continuationToken.length >= 47 && continuationToken[46] === 'A') {
            continuationToken = continuationToken.slice(0, 47) + 'B' + continuationToken.slice(48);
        }

        return continuationToken;
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Error in fetchContinuationData: ${err.message}`, err);
        } else {
            console.error(`Error in fetchContinuationData:`, err);
        }
        return null;
    }
};

export const fetchContinuationTokenFromRemote = async (): Promise<string>=> {
    try {
        const windowObj = window as any; // Cast window to any to use in YouTube logic
        const ytcfg = windowObj.ytcfg;
        const ytcfgData = ytcfg?.data_;
        const feedbackData = ytcfgData?.GOOGLE_FEEDBACK_PRODUCT_DATA;
        const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || "1";
        const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION;

        const videoId = extractYouTubeVideoIdFromUrl();
        const referrer = document.referrer;
        const response = await fetch("https://www.youtube.com/youtubei/v1/next?fetchContinuationTokenFromRemote", {
            headers: {
                accept: "*/*",
                "accept-language": feedbackData?.accept_language || "en-US,en;q=0.9",
                "content-type": "application/json",
                pragma: "no-cache",
                "cache-control": "no-store",
                "x-youtube-client-name": clientName,
                "x-youtube-client-version": clientVersion
            },
            referrer: referrer,
            referrerPolicy: "origin-when-cross-origin",
            body: JSON.stringify({
                context: {
                    client: {
                        deviceMake: "",
                        deviceModel: "",
                        userAgent: navigator.userAgent,
                        clientName: clientName,
                        clientVersion: clientVersion,
                        osName: navigator.platform,
                        osVersion: "",
                        originalUrl: referrer,
                        platform: "DESKTOP",
                        clientFormFactor: "UNKNOWN_FORM_FACTOR",
                        screenDensityFloat: window.devicePixelRatio,
                        userInterfaceTheme: "USER_INTERFACE_THEME_DARK",
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        browserVersion: clientVersion,
                        acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        screenWidthPoints: window.innerWidth,
                        screenHeightPoints: window.innerHeight,
                        utcOffsetMinutes: new Date().getTimezoneOffset() * -1,
                        clientScreen: "WATCH",
                        mainAppWebInfo: {
                            graftUrl: `/watch?v=${videoId}`,
                            pwaInstallabilityStatus: "PWA_INSTALLABILITY_STATUS_CAN_BE_INSTALLED",
                            webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
                            isWebNativeShareAvailable: false
                        }
                    },
                    user: {
                        lockedSafetyMode: false
                    },
                    request: {
                        useSsl: true,
                        internalExperimentFlags: [],
                        consistencyTokenJars: []
                    },
                    adSignalsInfo: {
                        params: [
                            { key: "dt", value: String(Date.now()) },
                            { key: "flash", value: "0" },
                            { key: "frm", value: "0" },
                            { key: "u_tz", value: String(new Date().getTimezoneOffset() * -1) },
                            { key: "u_h", value: String(window.innerHeight) },
                            { key: "u_w", value: String(window.innerWidth) },
                            { key: "u_ah", value: String(window.screen.availHeight) },
                            { key: "u_aw", value: String(window.screen.availWidth) },
                            { key: "u_cd", value: String(window.screen.colorDepth) },
                            { key: "bc", value: "31" },
                            { key: "bih", value: String(window.innerHeight) },
                            { key: "biw", value: String(window.innerWidth - (window.outerWidth - window.innerWidth)) },
                            { key: "brdim", value: `${window.outerWidth},${window.outerHeight},${window.screenX},${window.screenY},${window.innerWidth},${window.innerHeight},${window.screen.availWidth},${window.screen.availHeight}` },
                            { key: "vis", value: "1" },
                            { key: "wgl", value: String(!!window.WebGLRenderingContext) },
                            { key: "ca_type", value: "image" }
                        ]
                    }
                },
                videoId: videoId,
                racyCheckOk: false,
                contentCheckOk: false,
                autonavState: "STATE_OFF",
                playbackContext: {
                    vis: 0,
                    lactMilliseconds: "-1"
                },
                captionsRequested: false
            }),
            method: "POST",
            mode: "cors",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        return getContinuationTokenFromData(result) || '';
    } catch (error) {
        console.error('Error fetching continuation token:', error);
        return '';
    }
};
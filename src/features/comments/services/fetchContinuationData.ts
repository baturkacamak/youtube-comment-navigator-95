import {ContentItem} from "../../../types/commentTypes";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";

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
        const response = await fetch("https://www.youtube.com/youtubei/v1/next", {
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
                        // hl: "en",
                        // gl: "ES",
                        // remoteHost: "149.100.25.33",
                        deviceMake: "",
                        deviceModel: "",
                        // visitorData: visitorData,
                        userAgent: navigator.userAgent,
                        clientName: clientName,
                        clientVersion: clientVersion,
                        osName: navigator.platform,
                        osVersion: "",
                        originalUrl: referrer,
                        // screenPixelDensity: window.devicePixelRatio,
                        platform: "DESKTOP",
                        clientFormFactor: "UNKNOWN_FORM_FACTOR",
                        // configInfo: {
                        //     appInstallData: "CNjhh7MGELDusAUQzfiwBRCmmrAFEOPRsAUQy_KwBRDX6a8FEKzqsAUQ26-vBRDK-bAFEOLUrgUQi_KwBRDr6P4SEIjjrwUQzuuwBRDUoa8FEJaVsAUQo-2wBRDS-LAFEL22rgUQq_uwBRCJ6K4FEKKSsAUQkIz_EhC-irAFEPPrsAUQgqL_EhCDv7AFEMf9sAUQhIWvBRDX9bAFEPjSsAUQlp__EhCXg7AFEIiHsAUQoviwBRDPqLAFELHcsAUQxv-wBRDZya8FELWx_xIQ2OWwBRDs9rAFELn4sAUQyPiwBRDjrf8SEJT8sAUQyK7_EhD8hbAFEJPvsAUQ0-GvBRD96rAFEMzfrgUQrNiwBRCi6LAFEKXC_hIQvZmwBRD7q_8SENbnsAUQydewBRCD368FEPvasAUQ6sOvBRCO2rAFEM_4sAUQgfuwBRDJ968FEParsAUQ7_awBRC3768FEP_ksAUQ86GwBRCn47AFEKKBsAUQoOiwBRCa8K8FENCNsAUQ_PCwBRD-8LAFEMCw_xIQq--wBRDViLAFEJCysAUQ3oj_EhDuoq8FELersAUQiuywBRDd6P4SEK3jsAUQ192wBRDvzbAFELfq_hIQqtiwBRDl9LAFEM3XsAUQ9KuwBRCC9rAFENXdsAUQvvmvBRCLz7AFEI_EsAUQ4eywBRCNzLAFEOuTrgUQntCwBRD3sf8SEKiasAUQ-vCwBRDy7LAFKiBDQU1TRWhVSm9MMndETkhrQnFDUTlBdkwxQVFkQnc9PQ%3D%3D"
                        // },
                        screenDensityFloat: window.devicePixelRatio,
                        userInterfaceTheme: "USER_INTERFACE_THEME_DARK",
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        // browserName: "Edge Chromium",
                        browserVersion: clientVersion,
                        acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        // deviceExperimentId: "ChxOek0zTnpRME1qUTNOakk0TlRrMk56TTVPQT09ENjhh7MGGNjhh7MG",
                        screenWidthPoints: window.innerWidth,
                        screenHeightPoints: window.innerHeight,
                        utcOffsetMinutes: new Date().getTimezoneOffset() * -1,
                        // memoryTotalKbytes: navigator.deviceMemory ? navigator.deviceMemory * 1024 : undefined,
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
                    clickTracking: {
                        // clickTrackingParams: "CIMBEKQwGBAiEwiG5_qpv8eGAxWbIgYAHTdJD5QyB3JlbGF0ZWRIpZCk5q79m9_XAZoBBQgBEPgd"
                    },
                    adSignalsInfo: {
                        params: [
                            { key: "dt", value: String(Date.now()) },
                            { key: "flash", value: "0" },
                            { key: "frm", value: "0" },
                            { key: "u_tz", value: String(new Date().getTimezoneOffset() * -1) },
                            // { key: "u_his", value: String(history.length) },
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

        return fetchContinuationData(result) || '';
    } catch (error) {
        console.error('Error fetching continuation token:', error);
        return '';
    }
};
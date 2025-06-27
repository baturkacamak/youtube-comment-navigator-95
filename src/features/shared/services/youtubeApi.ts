import { extractYouTubeVideoIdFromUrl } from "../utils/extractYouTubeVideoIdFromUrl";
import logger from '../utils/logger';

const BASE_URL = "https://www.youtube.com/youtubei/v1";

export interface YouTubeApiOptions {
  endpoint: string;
  queryParams?: Record<string, string>;
  body?: any;
  method?: "GET" | "POST";
  signal?: AbortSignal;
}

export interface ClientContext {
  deviceMake?: string;
  deviceModel?: string;
  userAgent?: string;
  clientName?: string;
  clientVersion?: string;
  osName?: string;
  osVersion?: string;
  originalUrl?: string;
  platform?: string;
  clientFormFactor?: string;
  screenDensityFloat?: number;
  userInterfaceTheme?: string;
  timeZone?: string;
  browserVersion?: string;
  acceptHeader?: string;
  screenWidthPoints?: number;
  screenHeightPoints?: number;
  utcOffsetMinutes?: number;
  clientScreen?: string;
  mainAppWebInfo?: {
    graftUrl?: string;
    pwaInstallabilityStatus?: string;
    webDisplayMode?: string;
    isWebNativeShareAvailable?: boolean;
  };
}

export class YouTubeApiService {
  private static instance: YouTubeApiService;
  
  private constructor() {}
  
  public static getInstance(): YouTubeApiService {
    if (!YouTubeApiService.instance) {
      YouTubeApiService.instance = new YouTubeApiService();
    }
    return YouTubeApiService.instance;
  }
  
  private getClientContext(videoId?: string, customContext?: Partial<ClientContext>): any {
    if (!videoId) {
      videoId = extractYouTubeVideoIdFromUrl();
    }
    
    const windowObj = window as any;
    const ytcfg = windowObj.ytcfg;
    const ytcfgData = ytcfg?.data_;
    const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || "1";
    const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION || "2.20240620.05.00";
    
    // Default client context
    const defaultContext: ClientContext = {
      deviceMake: "",
      deviceModel: "",
      userAgent: navigator.userAgent,
      clientName,
      clientVersion,
      osName: navigator.platform,
      osVersion: "",
      originalUrl: window.location.href,
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
    };
    
    // Merge custom context with default context
    return { ...defaultContext, ...customContext };
  }
  
  private getStandardRequestHeaders(): HeadersInit {
    const windowObj = window as any;
    const ytcfg = windowObj.ytcfg;
    const ytcfgData = ytcfg?.data_;
    const feedbackData = ytcfgData?.GOOGLE_FEEDBACK_PRODUCT_DATA;
    const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || "1";
    const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION || "2.20240620.05.00";
    
    return {
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Accept-Language": feedbackData?.accept_language || navigator.language,
      "x-youtube-client-name": clientName,
      "x-youtube-client-version": clientVersion,
      "Origin": window.location.origin,
      "Cache-Control": "no-store",
      "Pragma": "no-cache"
    };
  }
  
  public async fetchFromApi<T>({ endpoint, queryParams = {}, body = {}, method = "POST", signal }: YouTubeApiOptions): Promise<T> {
    try {
      // Build URL with query params
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");
      
      const url = `${BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ""}`;
      
      const response = await fetch(url, {
        method,
        headers: this.getStandardRequestHeaders(),
        body: method === "POST" ? JSON.stringify(body) : undefined,
        credentials: "include",
        signal,
        cache: "no-store",
        mode: "cors"
      });
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      logger.error(`Error fetching from YouTube API (${endpoint}):`, error);
      throw error;
    }
  }
  
  // Specific API endpoints
  
  public async fetchPlayer(videoId?: string): Promise<any> {
    if (!videoId) {
      videoId = extractYouTubeVideoIdFromUrl();
    }
    
    const clientContext = this.getClientContext(videoId);
    
    return this.fetchFromApi({
      endpoint: "player",
      queryParams: { 
        prettyPrint: "false",
        ycn: "95"
      },
      body: {
        context: {
          client: clientContext
        },
        videoId,
        playbackContext: {
          contentPlaybackContext: {
            currentUrl: `/watch?v=${videoId}`
          }
        }
      }
    });
  }
  
  public async fetchNext(options: { 
    videoId?: string, 
    continuationToken?: string, 
    isFetchingReply?: boolean,
    signal?: AbortSignal 
  }): Promise<any> {
    const { videoId: inputVideoId, continuationToken, isFetchingReply = false, signal } = options;
    const videoId = inputVideoId || extractYouTubeVideoIdFromUrl();
    const clientContext = this.getClientContext(videoId);
    
    const body: any = continuationToken 
      ? {
          context: { 
            client: clientContext 
          },
          continuation: continuationToken
        }
      : {
          context: {
            client: clientContext,
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
                {key: "dt", value: String(Date.now())},
                {key: "flash", value: "0"},
                {key: "frm", value: "0"},
                {key: "u_tz", value: String(new Date().getTimezoneOffset() * -1)},
                {key: "u_h", value: String(window.innerHeight)},
                {key: "u_w", value: String(window.innerWidth)},
                {key: "u_ah", value: String(window.screen.availHeight)},
                {key: "u_aw", value: String(window.screen.availWidth)},
                {key: "u_cd", value: String(window.screen.colorDepth)},
                {key: "bc", value: "31"},
                {key: "bih", value: String(window.innerHeight)},
                {key: "biw", value: String(window.innerWidth - (window.outerWidth - window.innerWidth))},
                {
                  key: "brdim",
                  value: `${window.outerWidth},${window.outerHeight},${window.screenX},${window.screenY},${window.innerWidth},${window.innerHeight},${window.screen.availWidth},${window.screen.availHeight}`
                },
                {key: "vis", value: "1"},
                {key: "wgl", value: String(!!window.WebGLRenderingContext)},
                {key: "ca_type", value: "image"}
              ]
            }
          },
          videoId,
          racyCheckOk: false,
          contentCheckOk: false,
          autonavState: "STATE_OFF",
          playbackContext: {
            vis: 0,
            lactMilliseconds: "-1"
          },
          captionsRequested: false
        };
    
    return this.fetchFromApi({
      endpoint: "next",
      queryParams: continuationToken 
        ? { replies: isFetchingReply ? "true" : "false" }
        : { fetchContinuationTokenFromRemote: "true" },
      body,
      signal
    });
  }
}

// Export singleton instance
export const youtubeApi = YouTubeApiService.getInstance(); 
import { extractYouTubeVideoIdFromUrl } from '../utils/extractYouTubeVideoIdFromUrl';
import logger from '../utils/logger';
import { YOUTUBE_API_KEY, YOUTUBE_API_URL } from '../utils/appConstants';
import httpService from './httpService';

const BASE_URL = 'https://www.youtube.com/youtubei/v1';

export interface YouTubeApiOptions {
  endpoint: string;
  queryParams?: Record<string, string>;
  body?: any;
  method?: 'GET' | 'POST';
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

export interface VideoDetails {
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

export class YouTubeApiService {
  private static instance: YouTubeApiService;
  private capturedPotToken: string | null = null;
  private potTokenResolver: ((token: string) => void) | null = null;
  private potTokenPromise: Promise<string>;

  private constructor() {
    this.potTokenPromise = new Promise((resolve) => {
      this.potTokenResolver = resolve;
    });

    // Listen for the POT token from the main world script
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'YCN_POT_TOKEN_RECEIVED') {
        const token = event.data.token;
        this.capturedPotToken = token;
                if (this.potTokenResolver) {
          this.potTokenResolver(token);
        }
      }
    });
  }

  public static getInstance(): YouTubeApiService {
    if (!YouTubeApiService.instance) {
      YouTubeApiService.instance = new YouTubeApiService();
    }
    return YouTubeApiService.instance;
  }

  /**
   * Waits for the POT token to be received from the injected script.
   * @param timeoutMs Maximum time to wait in milliseconds (default: 5000ms)
   * @returns The POT token if received, or undefined if timed out.
   */
  public async waitForPotToken(timeoutMs: number = 5000): Promise<string | undefined> {
    if (this.capturedPotToken) {
      return this.capturedPotToken;
    }

        window.postMessage({ type: 'YCN_REQUEST_POT_TOKEN' }, '*');

    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<undefined>((resolve) => {
      timeoutHandle = setTimeout(() => {
        logger.warn(`Timed out waiting for POT token after ${timeoutMs}ms`);
        resolve(undefined);
      }, timeoutMs);
    });

    return Promise.race([this.potTokenPromise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle);
    });
  }

  public getPotToken(): string | undefined {
    if (this.capturedPotToken) {
      return this.capturedPotToken;
    }
    return undefined;
  }

  private getYtcfgData(): any {
    const windowObj = window as any;
    return windowObj?.ytcfg?.data_ ?? windowObj?.ytcfg;
  }

  private getAuthOrigin(): string {
    const origin = window.location?.origin;
    if (origin && origin.startsWith('http')) {
      return origin;
    }
    return 'https://www.youtube.com';
  }

  private readCookieValue(cookieNames: string[]): string | undefined {
    try {
      const cookieHeader = document.cookie;
      if (!cookieHeader) {
        return undefined;
      }

      const segments = cookieHeader.split(';');
      for (const name of cookieNames) {
        for (const rawSegment of segments) {
          const segment = rawSegment.trim();
          if (!segment.length) {
            continue;
          }
          if (segment.startsWith(`${name}=`)) {
            return segment.substring(name.length + 1);
          }
          if (segment === name) {
            return '';
          }
        }
      }
      return undefined;
    } catch (error) {
      logger.warn('Failed to read cookies for auth header:', error);
      return undefined;
    }
  }

  private async sha1Hex(input: string): Promise<string | undefined> {
    try {
      const data = new TextEncoder().encode(input);
      const buffer = await crypto.subtle.digest('SHA-1', data);
      return Array.from(new Uint8Array(buffer))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      logger.warn('Failed to compute SHA-1 hash:', error);
      return undefined;
    }
  }

  private async buildSapSidToken(
    headerName: string,
    secret: string,
    origin: string,
    timestamp: number
  ): Promise<string | undefined> {
    if (!secret) {
      return undefined;
    }

    const digest = await this.sha1Hex(`${timestamp} ${secret} ${origin}`);
    if (!digest) {
      return undefined;
    }

    return `${headerName} ${timestamp}_${digest}`;
  }

  private async buildSapSidAuthorizationHeader(): Promise<string | undefined> {
    const origin = this.getAuthOrigin();
    const timestamp = Math.floor(Date.now() / 1000);
    const tokens: string[] = [];

    const sapSid = this.readCookieValue(['__SAPISID', 'SAPISID', '__Secure-3PAPISID']);
    if (sapSid) {
      const token = await this.buildSapSidToken('SAPISIDHASH', sapSid, origin, timestamp);
      if (token) {
        tokens.push(token);
      }
    }

    const onePSid = this.readCookieValue(['__1PSAPISID', '__Secure-1PAPISID']);
    if (onePSid) {
      const token = await this.buildSapSidToken('SAPISID1PHASH', onePSid, origin, timestamp);
      if (token) {
        tokens.push(token);
      }
    }

    const threePSid = this.readCookieValue(['__3PSAPISID', '__Secure-3PAPISID']);
    if (threePSid) {
      const token = await this.buildSapSidToken('SAPISID3PHASH', threePSid, origin, timestamp);
      if (token) {
        tokens.push(token);
      }
    }

    return tokens.length ? tokens.join(' ') : undefined;
  }

  private getInnertubeApiKey(): string | undefined {
    try {
      const ytcfgData = this.getYtcfgData();
      const windowObj = window as any;

      return (
        ytcfgData?.INNERTUBE_API_KEY ||
        ytcfgData?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_WATCH
          ?.innertubeApiKey ||
        ytcfgData?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_CHANNEL_TRAILER
          ?.innertubeApiKey ||
        ytcfgData?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_PLAYLIST_OVERVIEW
          ?.innertubeApiKey ||
        ytcfgData?.WEB_PLAYER_CONTEXT_CONFIGS
          ?.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_VERTICAL_LANDING_PAGE_PROMO?.innertubeApiKey ||
        ytcfgData?.WEB_PLAYER_CONTEXT_CONFIGS
          ?.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_SPONSORSHIPS_OFFER?.innertubeApiKey ||
        windowObj?.ytplayer?.web_player_context_config?.innertubeApiKey ||
        windowObj?.ytcfg?.INNERTUBE_API_KEY
      );
    } catch (error) {
      logger.error('Failed to resolve Innertube API key:', error);
      return undefined;
    }
  }

  private getInnertubeClientContext(videoId?: string): any {
    const ytcfgData = this.getYtcfgData();
    return ytcfgData?.INNERTUBE_CONTEXT?.client || this.getClientContext(videoId);
  }

  private getClientContext(videoId?: string, customContext?: Partial<ClientContext>): any {
    if (!videoId) {
      videoId = extractYouTubeVideoIdFromUrl();
    }

    const windowObj = window as any;
    const ytcfg = windowObj.ytcfg;
    const ytcfgData = ytcfg?.data_;
    const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || '1';
    const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION || '2.20240620.05.00';

    // Default client context
    const defaultContext: ClientContext = {
      deviceMake: '',
      deviceModel: '',
      userAgent: navigator.userAgent,
      clientName,
      clientVersion,
      osName: navigator.platform,
      osVersion: '',
      originalUrl: window.location.href,
      platform: 'DESKTOP',
      clientFormFactor: 'UNKNOWN_FORM_FACTOR',
      screenDensityFloat: window.devicePixelRatio,
      userInterfaceTheme: 'USER_INTERFACE_THEME_DARK',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserVersion: clientVersion,
      acceptHeader:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      screenWidthPoints: window.innerWidth,
      screenHeightPoints: window.innerHeight,
      utcOffsetMinutes: new Date().getTimezoneOffset() * -1,
      clientScreen: 'WATCH',
      mainAppWebInfo: {
        graftUrl: `/watch?v=${videoId}`,
        pwaInstallabilityStatus: 'PWA_INSTALLABILITY_STATUS_CAN_BE_INSTALLED',
        webDisplayMode: 'WEB_DISPLAY_MODE_BROWSER',
        isWebNativeShareAvailable: false,
      },
    };

    // Merge custom context with default context
    return { ...defaultContext, ...customContext };
  }

  private async getStandardRequestHeaders(): Promise<HeadersInit> {
    const ytcfgData = this.getYtcfgData();
    const feedbackData = ytcfgData?.GOOGLE_FEEDBACK_PRODUCT_DATA;
    const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || '1';
    const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION || '2.20240620.05.00';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: '*/*',
      'Accept-Language': feedbackData?.accept_language || navigator.language,
      'x-goog-visitor-id': ytcfgData?.VISITOR_DATA,
      'x-youtube-identity-token': ytcfgData?.ID_TOKEN || '',
      'x-youtube-client-name': clientName,
      'x-youtube-client-version': clientVersion,
      Origin: window.location.origin,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    };

    const authHeader = await this.buildSapSidAuthorizationHeader();
    if (authHeader) {
      headers.Authorization = authHeader;
    } else {
      logger.warn('SAPISID auth header not available. Some Innertube requests may fail.');
    }

    const normalizedHeaders: Record<string, string> = { /* no-op */ };
    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        normalizedHeaders[key] = value;
      }
    });

    return normalizedHeaders;
  }

  public async fetchFromApi<T>({
    endpoint,
    queryParams = { /* no-op */ },
    body = { /* no-op */ },
    method = 'POST',
    signal,
  }: YouTubeApiOptions): Promise<T> {
    try {
      // Build URL with query params
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      const url = `${BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method,
        headers: await this.getStandardRequestHeaders(),
        body: method === 'POST' ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal,
        cache: 'no-store',
        mode: 'cors',
        referrer: window.location.href,
        referrerPolicy: 'strict-origin-when-cross-origin',
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (readError) {
          logger.warn('Failed to read error response body:', readError);
        }

        logger.error(`YouTube API error response (${endpoint}):`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        throw new Error(
          `YouTube API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
        );
      }

      return (await response.json()) as T;
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
      endpoint: 'player',
      queryParams: {
        prettyPrint: 'false',
        ycn: '95',
      },
      body: {
        context: {
          client: clientContext,
        },
        videoId,
        playbackContext: {
          contentPlaybackContext: {
            currentUrl: `/watch?v=${videoId}`,
          },
        },
      },
    });
  }

  public async fetchNext(options: {
    videoId?: string;
    continuationToken?: string;
    isFetchingReply?: boolean;
    signal?: AbortSignal;
  }): Promise<any> {
    const { videoId: inputVideoId, continuationToken, isFetchingReply = false, signal } = options;
    const videoId = inputVideoId || extractYouTubeVideoIdFromUrl();
    const clientContext = this.getClientContext(videoId);

    const body: any = continuationToken
      ? {
          context: {
            client: clientContext,
          },
          continuation: continuationToken,
        }
      : {
          context: {
            client: clientContext,
            user: {
              lockedSafetyMode: false,
            },
            request: {
              useSsl: true,
              internalExperimentFlags: [],
              consistencyTokenJars: [],
            },
            adSignalsInfo: {
              params: [
                { key: 'dt', value: String(Date.now()) },
                { key: 'flash', value: '0' },
                { key: 'frm', value: '0' },
                { key: 'u_tz', value: String(new Date().getTimezoneOffset() * -1) },
                { key: 'u_h', value: String(window.innerHeight) },
                { key: 'u_w', value: String(window.innerWidth) },
                { key: 'u_ah', value: String(window.screen.availHeight) },
                { key: 'u_aw', value: String(window.screen.availWidth) },
                { key: 'u_cd', value: String(window.screen.colorDepth) },
                { key: 'bc', value: '31' },
                { key: 'bih', value: String(window.innerHeight) },
                {
                  key: 'biw',
                  value: String(window.innerWidth - (window.outerWidth - window.innerWidth)),
                },
                {
                  key: 'brdim',
                  value: `${window.outerWidth},${window.outerHeight},${window.screenX},${window.screenY},${window.innerWidth},${window.innerHeight},${window.screen.availWidth},${window.screen.availHeight}`,
                },
                { key: 'vis', value: '1' },
                { key: 'wgl', value: String(!!window.WebGLRenderingContext) },
                { key: 'ca_type', value: 'image' },
              ],
            },
          },
          videoId,
          racyCheckOk: false,
          contentCheckOk: false,
          autonavState: 'STATE_OFF',
          playbackContext: {
            vis: 0,
            lactMilliseconds: '-1',
          },
          captionsRequested: false,
        };

    return this.fetchFromApi({
      endpoint: 'next',
      queryParams: continuationToken
        ? { replies: isFetchingReply ? 'true' : 'false' }
        : { fetchContinuationTokenFromRemote: 'true' },
      body,
      signal,
    });
  }

  public async fetchLiveChat(options: {
    continuation: string;
    isReplay?: boolean;
    playerOffsetMs?: string;
    clickTrackingParams?: string;
    signal?: AbortSignal;
  }): Promise<any> {
    const { continuation, isReplay = false, playerOffsetMs, clickTrackingParams, signal } = options;
    const clientContext = this.getInnertubeClientContext();
    const apiKey = this.getInnertubeApiKey();

    if (!apiKey) {
      logger.error('Innertube API key not found. Live chat requests will fail.');
      throw new Error('Innertube API key not found');
    }

    const body: any = {
      context: {
        client: clientContext,
      },
      continuation,
    };

    if (playerOffsetMs) {
      body.currentPlayerState = { playerOffsetMs };
    }

    if (clickTrackingParams) {
      body.clickTracking = { clickTrackingParams };
    }

    return this.fetchFromApi({
      endpoint: isReplay ? 'live_chat/get_live_chat_replay' : 'live_chat/get_live_chat',
      queryParams: { prettyPrint: 'false', key: apiKey },
      body,
      signal,
    });
  }

  private getThumbnailUrl(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }

  public async fetchVideoDetails(videoId: string): Promise<VideoDetails | null> {
    const url = `${YOUTUBE_API_URL}?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    try {
      const responseText = await httpService.get(url);
      const data = JSON.parse(responseText);

      if (data.items && data.items.length > 0) {
        const snippet = data.items[0].snippet;
        const details: VideoDetails = {
          title: snippet.title,
          description: snippet.description,
          thumbnailUrl: this.getThumbnailUrl(videoId),
          channelTitle: snippet.channelTitle,
          publishedAt: snippet.publishedAt,
        };
                return details;
      }
      logger.warn('No video details found for videoId:', videoId);
      return null;
    } catch (error) {
      logger.error(`Failed to fetch video details for ID ${videoId}:`, error);
      return null;
    }
  }

  isReady(): boolean {
    return true;
  }
}

// Export singleton instance
export const youtubeApi = YouTubeApiService.getInstance();

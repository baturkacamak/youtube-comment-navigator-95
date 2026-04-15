import { extractYouTubeVideoIdFromUrl } from '../utils/extractYouTubeVideoIdFromUrl';
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
  private capturedPotVideoId: string | null = null;
  private pendingPotTokenResolvers = new Set<(token: string) => void>();

  private constructor() {
    // Listen for the POT token from the main world script
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'YCN_POT_TOKEN_RECEIVED') {
        const token = event.data.token;
        const videoId = event.data.videoId || null;
        this.capturedPotToken = token;
        this.capturedPotVideoId = videoId;
        this.pendingPotTokenResolvers.forEach((resolve) => resolve(token));
        this.pendingPotTokenResolvers.clear();
      }

      if (event.data && (event.data.type === 'URL_CHANGED' || event.data.type === 'URL_CHANGE_TO_VIDEO')) {
        this.capturedPotToken = null;
        this.capturedPotVideoId = null;
        this.pendingPotTokenResolvers.clear();
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
    const currentVideoId = extractYouTubeVideoIdFromUrl();

    if (
      this.capturedPotToken &&
      this.capturedPotVideoId &&
      currentVideoId &&
      this.capturedPotVideoId === currentVideoId
    ) {
      return this.capturedPotToken;
    }

    const potTokenPromise = new Promise<string>((resolve) => {
      this.pendingPotTokenResolvers.add(resolve);
    });

    window.postMessage({ type: 'YCN_REQUEST_POT_TOKEN' }, '*');

    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<undefined>((resolve) => {
      timeoutHandle = setTimeout(() => {
        resolve(undefined);
      }, timeoutMs);
    });

    return Promise.race([potTokenPromise, timeoutPromise])
      .then((token) => {
        return token;
      })
      .finally(() => {
        clearTimeout(timeoutHandle);
        this.pendingPotTokenResolvers.clear();
      });
  }

  public getPotToken(): string | undefined {
    if (
      this.capturedPotToken &&
      this.capturedPotVideoId &&
      this.capturedPotVideoId === extractYouTubeVideoIdFromUrl()
    ) {
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
      return undefined;
    }
  }

  private getInnertubeClientContext(videoId?: string): any {
    const ytcfgData = this.getYtcfgData();
    const innertubeClient = ytcfgData?.INNERTUBE_CONTEXT?.client;

    if (innertubeClient) {
      return {
        ...innertubeClient,
        originalUrl: window.location.href,
        mainAppWebInfo: {
          ...innertubeClient.mainAppWebInfo,
          graftUrl: `/watch?v=${videoId || extractYouTubeVideoIdFromUrl()}`,
        },
      };
    }

    return this.getClientContext(videoId);
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
    }

    const normalizedHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        normalizedHeaders[key] = value;
      }
    });

    return normalizedHeaders;
  }

  private getTimedTextRequestHeaders(): HeadersInit {
    const ytcfgData = this.getYtcfgData();
    const feedbackData = ytcfgData?.GOOGLE_FEEDBACK_PRODUCT_DATA;
    const clientName = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_NAME || '1';
    const clientVersion = ytcfgData?.INNERTUBE_CONTEXT_CLIENT_VERSION || '2.20240620.05.00';

    const headers: Record<string, string> = {
      Accept: '*/*',
      'Accept-Language': feedbackData?.accept_language || navigator.language,
      'x-goog-visitor-id': ytcfgData?.VISITOR_DATA || '',
      'x-youtube-identity-token': ytcfgData?.ID_TOKEN || '',
      'x-youtube-client-name': clientName,
      'x-youtube-client-version': clientVersion,
      'x-youtube-page-cl': String(ytcfgData?.PAGE_CL || ''),
      'x-youtube-page-label': ytcfgData?.PAGE_BUILD_LABEL || '',
      'x-youtube-time-zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      'x-youtube-utc-offset': String(new Date().getTimezoneOffset() * -1),
      Origin: window.location.origin,
    };

    const normalizedHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        normalizedHeaders[key] = value;
      }
    });

    return normalizedHeaders;
  }

  private async fetchViaMainWorld<T>(
    messageType: string,
    payload: Record<string, unknown>,
    timeoutMs: number = 10000
  ): Promise<T> {
    const requestId = `${messageType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutHandle);
      };

      const finishResolve = (value: T) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const expectedType =
        messageType === 'YCN_REQUEST_TIMEDTEXT_FETCH' ? 'YCN_TIMEDTEXT_FETCH_RESULT' : '';

      const handleMessage = (event: MessageEvent) => {
        if (event.source !== window) return;
        if (event.data?.type !== expectedType) return;
        if (event.data?.requestId !== requestId) return;
        finishResolve(event.data?.payload as T);
      };

      const timeoutHandle = window.setTimeout(() => {
        finishReject(new Error(`Main world request timed out: ${messageType}`));
      }, timeoutMs);

      window.addEventListener('message', handleMessage);
      window.postMessage({ type: messageType, requestId, ...payload }, '*');
    });
  }

  public async fetchFromApi<T>({
    endpoint,
    queryParams = {},
    body = {},
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
        }


        throw new Error(
          `YouTube API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      throw error;
    }
  }

  // Specific API endpoints

  public async fetchPlayer(videoId?: string, signal?: AbortSignal): Promise<any> {
    if (!videoId) {
      videoId = extractYouTubeVideoIdFromUrl();
    }

    const clientContext = this.getInnertubeClientContext(videoId);
    const headers = (await this.getStandardRequestHeaders()) as Record<string, string>;
    const requestBody = {
      context: {
        client: clientContext,
      },
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          currentUrl: `/watch?v=${videoId}`,
        },
      },
    };


      const response = await this.fetchFromApi({
        endpoint: 'player',
      queryParams: {
        prettyPrint: 'false',
        ycn: '95',
      },
      body: requestBody,
        signal,
      });

    return response;
  }

  public async fetchTimedText(url: string, signal?: AbortSignal): Promise<string> {
    try {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const headers = this.getTimedTextRequestHeaders() as Record<string, string>;
      const response = await this.fetchViaMainWorld<{
        ok: boolean;
        status?: number;
        statusText?: string;
        body?: string;
        transport?: string;
        redirected?: boolean;
        finalUrl?: string;
        responseHeaders?: Record<string, string | null> | null;
        fetchFallbackReason?: string;
        fetchResponseMeta?: Record<string, unknown>;
        error?: { name?: string; message?: string; stack?: string };
      }>('YCN_REQUEST_TIMEDTEXT_FETCH', { url, headers });


      if (!response.ok) {
        if (response.error) {
          throw new Error(
            `YouTube timedtext main world fetch failed: ${response.error.name || 'Error'} ${response.error.message || ''}`.trim()
          );
        }


        throw new Error(
          `YouTube timedtext error: ${response.status} ${response.statusText}${response.body ? ` - ${response.body}` : ''}`
        );
      }

      const responseText = response.body || '';

      return responseText;
    } catch (error) {
      throw error;
    }
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
      return null;
    } catch (error) {
      return null;
    }
  }

  isReady(): boolean {
    return true;
  }
}

// Export singleton instance
export const youtubeApi = YouTubeApiService.getInstance();

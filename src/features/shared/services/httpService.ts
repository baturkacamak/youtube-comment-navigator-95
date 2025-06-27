import logger from '../utils/logger';

// Define necessary types locally for self-containment
export type RequestHeaders = Record<string, string>;
export type RequestCredentials = 'include' | 'same-origin' | 'omit';

export class HttpError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public response?: any
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

class HttpService {
    /**
     * Check if an error indicates a definitive HTTP response that shouldn't trigger fallbacks.
     * Returns true for status codes like 404, 403, etc., that are definitive responses.
     */
    private isDefinitiveHttpError(error: any): boolean {
        if (error instanceof HttpError) {
            const statusCode = error.statusCode;
            // Client errors (4xx) are definitive and shouldn't trigger fallbacks.
            return statusCode >= 400 && statusCode < 500;
        }
        return false;
    }

    /**
     * Make an HTTP request with a fallback from fetch to XMLHttpRequest.
     * Skips fallbacks for definitive client-side HTTP errors (4xx).
     */
    async makeRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<string> {
        const browserHeaders = this.getRandomizedBrowserHeaders(headers);
        let lastError: any = null;
        const requestId = Math.random().toString(36).substr(2, 9);
        
        logger.debug('Starting HTTP request', {
            requestId,
            method,
            url: url.length > 100 ? url.substring(0, 100) + '...' : url,
            hasData: !!data,
            headerCount: Object.keys(headers).length
        });
        
        // 1. Try using the modern Fetch API first
        if (typeof fetch === 'function') {
            try {
               logger.debug('Using Fetch API for request', {method, url, requestId});
                const result = await this.makeFetchRequest(method, url, data, browserHeaders, credentials);
                logger.debug('Request completed successfully via fetch', {requestId});
                return result;
            } catch (error) {
                lastError = error;
                if (this.isDefinitiveHttpError(error)) {
                    const statusCode = error instanceof HttpError ? error.statusCode : 'unknown';
                    logger.warn('HTTP request failed with client error status, no fallback.', {
                        requestId, method, url, statusCode,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    throw error;
                }
                logger.error('Fetch request failed, attempting XMLHttpRequest fallback', {
                    requestId, method, url,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        } else {
            logger.warn('Fetch API not available, attempting XMLHttpRequest.', { requestId, method, url });
        }

        // 2. Fall back to XMLHttpRequest
        if (typeof XMLHttpRequest === 'function') {
            try {
               logger.debug('Using XMLHttpRequest for request', {method, url, requestId});
                const result = await this.makeXHRRequest(method, url, data, browserHeaders, credentials);
                logger.debug('Request completed successfully via XMLHttpRequest', {requestId});
                return result;
            } catch (error) {
                lastError = error;
                 logger.error('XMLHttpRequest failed, no more fallbacks.', {
                    requestId, method, url,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        } else {
            logger.warn('XMLHttpRequest not available.', { requestId, method, url });
        }

        // If we've exhausted all methods, throw the last received error.
        if (lastError) {
            logger.error('All HTTP methods failed for request', {
                requestId, method, url,
                lastError: lastError instanceof Error ? lastError.message : String(lastError),
            });
            throw lastError;
        }
        
        logger.error('No suitable request method available in this environment.', { requestId, method, url });
        throw new HttpError('No suitable request method available', 0);
    }

    private getRandomizedBrowserHeaders(customHeaders: RequestHeaders = {}): RequestHeaders {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        const acceptLanguages = [
            'en-US,en;q=0.9',
            'en-GB,en;q=0.8',
        ];
        const randomChromeVersion = ['118', '119', '120'][Math.floor(Math.random() * 3)];

        const browserHeaders: RequestHeaders = {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)],
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${randomChromeVersion}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        };

        return {...browserHeaders, ...customHeaders};
    }

    /**
     * Make a request using the Fetch API.
     */
    private async makeFetchRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<string> {
        let response: Response;
        
        try {
            const options: RequestInit = {
                method: method.toUpperCase(),
                headers,
                credentials,
            };

            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
                options.body = data;
                 // Ensure Content-Type is set for POST data, a common omission
                if (!headers['Content-Type']) {
                    (options.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
                }
            }

            response = await fetch(url, options);
        } catch (error) {
            logger.error('Network error during fetch request', {
                method, url,
                errorMessage: error instanceof Error ? error.message : String(error),
                possibleCauses: ['CORS restrictions', 'Network connectivity issue', 'DNS failure']
            });
            throw new HttpError(`Fetch request failed: ${error instanceof Error ? error.message : String(error)}`, 0, error);
        }

        if (!response.ok) {
            logger.warn('Request failed with non-OK status', {
                method, url,
                status: response.status,
                statusText: response.statusText,
            });
            throw new HttpError(`Request failed with status: ${response.status} ${response.statusText}`, response.status, response);
        }

        try {
            return await response.text();
        } catch (error) {
             logger.error('Failed to read response body', {
                method, url, status: response.status,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new HttpError(`Failed to read response: ${error instanceof Error ? error.message : String(error)}`, response.status, error);
        }
    }

    /**
     * Make a request using XMLHttpRequest.
     */
    private makeXHRRequest(
        method: string,
        url: string,
        data: string | null = null,
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            
            xhr.withCredentials = credentials === 'include';

            for (const header in headers) {
                xhr.setRequestHeader(header, headers[header]);
            }

            if (method.toUpperCase() === 'POST' && !headers['Content-Type']) {
                 xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }

            xhr.onload = () => {
                 if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new HttpError(`Request failed: ${xhr.statusText || 'Unknown error'}`, xhr.status, xhr));
                }
            };
            
            xhr.onerror = () => {
                logger.error('XMLHttpRequest network error', {
                    method, url, status: xhr.status,
                    possibleCauses: ['CORS restrictions', 'Network connectivity issue', 'Request blocked by browser']
                });
                reject(new HttpError('Network error occurred', 0, xhr));
            };
            
            xhr.ontimeout = () => {
                logger.warn('XMLHttpRequest timed out', { method, url, timeout: xhr.timeout });
                reject(new HttpError('Request timed out', 0, xhr));
            };
            
            xhr.timeout = 30000;

            try {
                xhr.send(data);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error('XMLHttpRequest send failed', { method, url, error: errorMessage });
                reject(new HttpError(`Error sending request: ${errorMessage}`, 0, error));
            }
        });
    }

    async get(url: string, headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('GET', url, null, headers, credentials);
    }

    async post(url: string, data: string = '', headers: RequestHeaders = {}, credentials: RequestCredentials = 'same-origin'): Promise<string> {
        return this.makeRequest('POST', url, data, headers, credentials);
    }
    
    async getStream(
        url: string,
        onChunk: (chunk: string) => boolean, // Callback returns true to abort
        headers: RequestHeaders = {},
        credentials: RequestCredentials = 'same-origin'
    ): Promise<void> {
        if (typeof fetch !== 'function' || typeof TextDecoder === 'undefined' || typeof ReadableStream === 'undefined') {
            logger.warn('Streaming not supported, falling back to full download.', { url });
            const fullHtml = await this.get(url, headers, credentials);
            onChunk(fullHtml);
            return;
        }

        const browserHeaders = this.getRandomizedBrowserHeaders(headers);
        const requestId = Math.random().toString(36).substr(2, 9);
        logger.debug('Starting HTTP stream request', { requestId, url });

        try {
            const controller = new AbortController();
            const signal = controller.signal;

            const response = await fetch(url, {
                method: 'GET',
                headers: browserHeaders,
                credentials,
                signal
            });

            if (!response.ok) {
                throw new HttpError(`HTTP error! status: ${response.status}`, response.status, response);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    if (buffer.length > 0) {
                        onChunk(buffer);
                    }
                    logger.debug('Stream finished', { requestId });
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                if (onChunk(buffer)) { // If callback returns true, abort the stream
                    logger.debug('Aborting stream as requested by callback', { requestId });
                    if(reader) await reader.cancel();
                    if(controller) controller.abort();
                    break;
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.debug('Fetch aborted by stream consumer.', { requestId });
                return;
            }
            logger.error('Stream request failed', {
                requestId,
                url,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

const httpService = new HttpService();
export default httpService; 
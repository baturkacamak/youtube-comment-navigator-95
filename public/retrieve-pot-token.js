(function () {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 1000;
    let cachedToken = null;
    let cachedVideoId = null;

    function getCurrentVideoId() {
        try {
            return new URL(location.href).searchParams.get('v') || null;
        } catch (e) {
            return null;
        }
    }

    function sanitizeUrl(url) {
        try {
            const urlObj = new URL(url, location.origin);
            if (urlObj.searchParams.has('pot')) {
                const pot = urlObj.searchParams.get('pot') || '';
                urlObj.searchParams.set('pot', `${pot.slice(0, 8)}...`);
            }
            if (urlObj.searchParams.has('signature')) {
                const signature = urlObj.searchParams.get('signature') || '';
                urlObj.searchParams.set('signature', `${signature.slice(0, 12)}...`);
            }
            return urlObj.toString();
        } catch (e) {
            return url || null;
        }
    }

    function getMoviePlayer() {
        return window.movie_player || document.getElementById('movie_player') || null;
    }

    function getMoviePlayerResponse(moviePlayer) {
        try {
            if (moviePlayer && typeof moviePlayer.getPlayerResponse === 'function') {
                return moviePlayer.getPlayerResponse() || null;
            }
        } catch (e) {
        }
        return null;
    }

    function getVideoIdFromPlayerResponse(playerResponse) {
        return playerResponse?.videoDetails?.videoId || null;
    }

    function getCaptionTracks(playerResponse) {
        return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    }

    function chooseTranscriptPlayerResponse() {
        const currentVideoId = getCurrentVideoId();
        const moviePlayer = getMoviePlayer();
        const moviePlayerResponse = getMoviePlayerResponse(moviePlayer);
        const initialPlayerResponse = window.ytInitialPlayerResponse || null;

        const moviePlayerVideoId = getVideoIdFromPlayerResponse(moviePlayerResponse);
        const initialPlayerVideoId = getVideoIdFromPlayerResponse(initialPlayerResponse);

        if (currentVideoId && moviePlayerVideoId === currentVideoId) {
            return {
                moviePlayer,
                selectedPlayerResponse: moviePlayerResponse,
                selectedSource: 'movie_player',
                moviePlayerVideoId,
                initialPlayerVideoId,
            };
        }

        if (currentVideoId && initialPlayerVideoId === currentVideoId) {
            return {
                moviePlayer,
                selectedPlayerResponse: initialPlayerResponse,
                selectedSource: 'ytInitialPlayerResponse',
                moviePlayerVideoId,
                initialPlayerVideoId,
            };
        }

        if (moviePlayerResponse) {
            return {
                moviePlayer,
                selectedPlayerResponse: moviePlayerResponse,
                selectedSource: 'movie_player_fallback',
                moviePlayerVideoId,
                initialPlayerVideoId,
            };
        }

        return {
            moviePlayer,
            selectedPlayerResponse: initialPlayerResponse,
            selectedSource: initialPlayerResponse ? 'ytInitialPlayerResponse_fallback' : 'none',
            moviePlayerVideoId,
            initialPlayerVideoId,
        };
    }

    function getTranscriptDiagnostics() {
        try {
            const {
                moviePlayer,
                selectedPlayerResponse,
                selectedSource,
                moviePlayerVideoId,
                initialPlayerVideoId,
            } = chooseTranscriptPlayerResponse();
            const captionTracks = getCaptionTracks(selectedPlayerResponse);

            return {
                currentVideoId: getCurrentVideoId(),
                readyState: document.readyState,
                locationHref: location.href,
                hasYtInitialPlayerResponse: Boolean(window.ytInitialPlayerResponse),
                hasYtInitialData: Boolean(window.ytInitialData),
                hasYtcfg: Boolean(window.ytcfg),
                hasMoviePlayer: Boolean(moviePlayer),
                selectedPlayerResponseSource: selectedSource,
                selectedPlayerResponseVideoId: getVideoIdFromPlayerResponse(selectedPlayerResponse),
                moviePlayerResponseVideoId: moviePlayerVideoId,
                initialPlayerResponseVideoId: initialPlayerVideoId,
                playerState:
                    moviePlayer && typeof moviePlayer.getPlayerState === 'function'
                        ? moviePlayer.getPlayerState()
                        : null,
                currentVideoUrl:
                    moviePlayer && typeof moviePlayer.getVideoUrl === 'function'
                        ? moviePlayer.getVideoUrl()
                        : null,
                responseVideoId: selectedPlayerResponse?.videoDetails?.videoId || null,
                responsePlayabilityStatus: selectedPlayerResponse?.playabilityStatus?.status || null,
                responsePlayabilityReason: selectedPlayerResponse?.playabilityStatus?.reason || null,
                hasCaptions: Boolean(selectedPlayerResponse?.captions),
                captionTrackCount: captionTracks.length,
                firstCaptionTrack: captionTracks[0]
                    ? {
                        baseUrl: captionTracks[0].baseUrl || null,
                        baseUrlPreview: sanitizeUrl(captionTracks[0].baseUrl),
                        languageCode: captionTracks[0].languageCode || null,
                        kind: captionTracks[0].kind || null,
                        vssId: captionTracks[0].vssId || null,
                    }
                    : null,
                innertubeClientName:
                    window.ytcfg?.data_?.INNERTUBE_CONTEXT_CLIENT_NAME ||
                    window.ytcfg?.INNERTUBE_CONTEXT_CLIENT_NAME ||
                    null,
                innertubeClientVersion:
                    window.ytcfg?.data_?.INNERTUBE_CONTEXT_CLIENT_VERSION ||
                    window.ytcfg?.INNERTUBE_CONTEXT_CLIENT_VERSION ||
                    null,
            };
        } catch (e) {
            return {
                error: e instanceof Error ? e.message : String(e),
            };
        }
    }

    async function fetchTimedTextInPage(url, headers) {
        const summarizeHeaders = (headers) => {
            try {
                return {
                    contentType: headers.get('content-type'),
                    contentLength: headers.get('content-length'),
                    cacheControl: headers.get('cache-control'),
                };
            } catch (e) {
                return null;
            }
        };

        const applyHeadersToXhr = (xhr, requestHeaders) => {
            if (!requestHeaders || typeof requestHeaders !== 'object') {
                return;
            }

            Object.entries(requestHeaders).forEach(([key, value]) => {
                if (!value) {
                    return;
                }

                try {
                    xhr.setRequestHeader(key, String(value));
                } catch (e) {
                }
            });
        };

        const fetchViaXhr = (requestUrl, requestHeaders) =>
            new Promise((resolve) => {
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', requestUrl, true);
                    xhr.withCredentials = true;
                    applyHeadersToXhr(xhr, requestHeaders);
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState !== XMLHttpRequest.DONE) {
                            return;
                        }

                        resolve({
                            ok: xhr.status >= 200 && xhr.status < 300,
                            status: xhr.status,
                            statusText: xhr.statusText || null,
                            body: xhr.responseText || '',
                            transport: 'xhr',
                            finalUrl: xhr.responseURL || requestUrl,
                            responseHeaders: {
                                contentType: xhr.getResponseHeader('content-type'),
                                contentLength: xhr.getResponseHeader('content-length'),
                                cacheControl: xhr.getResponseHeader('cache-control'),
                            },
                        });
                    };
                    xhr.onerror = function () {
                        resolve({
                            ok: false,
                            transport: 'xhr',
                            error: {
                                name: 'XHRNetworkError',
                                message: 'XMLHttpRequest failed',
                            },
                        });
                    };
                    xhr.send();
                } catch (e) {
                    resolve({
                        ok: false,
                        transport: 'xhr',
                        error: e instanceof Error ? {
                            name: e.name,
                            message: e.message,
                            stack: e.stack,
                        } : {
                            name: typeof e,
                            message: String(e),
                        },
                    });
                }
            });

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers || undefined,
                credentials: 'include',
                mode: 'cors',
                cache: 'no-store',
                referrer: location.href,
                referrerPolicy: 'strict-origin-when-cross-origin',
            });

            const body = await response.text();
            const payload = {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                body,
                transport: 'fetch',
                redirected: response.redirected,
                finalUrl: response.url || url,
                responseHeaders: summarizeHeaders(response.headers),
            };

            if (response.ok && !body) {
                const xhrPayload = await fetchViaXhr(url, headers);
                xhrPayload.fetchFallbackReason = 'empty-fetch-body';
                xhrPayload.fetchResponseMeta = {
                    redirected: response.redirected,
                    finalUrl: response.url || url,
                    responseHeaders: summarizeHeaders(response.headers),
                };
                return xhrPayload;
            }

            return payload;
        } catch (e) {
            return {
                ok: false,
                transport: 'fetch',
                error: e instanceof Error ? {
                    name: e.name,
                    message: e.message,
                    stack: e.stack,
                } : {
                    name: typeof e,
                    message: String(e),
                },
            };
        }
    }

    /**
     * Recursive function to find the 'pot' token in an object.
     * Based on the implementation in YCS-cont but optimized for performance.
     */
    function getTranscriptPot() {
        try {
            const currentVideoId = getCurrentVideoId();
            const visited = new WeakSet();
            const urls = [];

            const walk = (obj, depth = 0) => {
                if (depth > 20) return;
                if (!obj || typeof obj !== 'object') return;
                if (visited.has(obj)) return;

                visited.add(obj);

                if (obj instanceof Node) return;

                for (const key in obj) {
                    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
                    try {
                        const value = obj[key];
                        if (typeof value === 'string' && value.includes('pot=')) {
                            if (currentVideoId) {
                                try {
                                    const parsed = new URL(
                                        value.startsWith('http') ? value : `https://www.youtube.com${value}`
                                    );
                                    if (parsed.searchParams.get('v') !== currentVideoId) {
                                        continue;
                                    }
                                } catch (e) {
                                }
                            }
                            urls.push(value);
                            return; 
                        } else if (value && typeof value === 'object') {
                            if (value === window || value === document || value === location || value === history) continue;
                            walk(value, depth + 1);
                        }
                    } catch (e) {
                        // Access denied to some properties is expected on window walk
                        continue;
                    }
                }
            };

            const roots = [
                window.ytInitialData,
                window.ytInitialPlayerResponse,
                window.ytcfg ? window.ytcfg.data_ : null
            ];

            for (const root of roots) {
                if (root) {
                    walk(root);
                    if (urls.length > 0) break;
                }
            }

            if (urls.length === 0) {
                const potentialKeys = Object.keys(window).filter(k => k.startsWith('yt') || k.startsWith('innertube'));
                for (const key of potentialKeys) {
                    walk(window[key], 0);
                    if (urls.length > 0) break;
                }
            }

            if (urls.length === 0) return undefined;

            try {
                const fullUrl = urls[0].startsWith('http') ? urls[0] : `https://www.youtube.com${urls[0]}`;
                const urlObj = new URL(fullUrl);
                const pot = urlObj.searchParams.get('pot');
                if (!pot) console.warn('[YCN-POT] Candidate found but "pot" param missing:', urls[0]);
                return {
                    token: pot,
                    videoId: urlObj.searchParams.get('v') || currentVideoId || null,
                };
            } catch (e) {
                console.warn('[YCN-POT] Failed to parse candidate URL:', urls[0]);
                return undefined;
            }

        } catch (e) {
            console.error('[YCN-POT] Critical error during search:', e);
            return undefined;
        }
    }

    function attemptRetrieve(attempt = 1) {
        const result = getTranscriptPot();
        
        if (result?.token) {
            cachedToken = result.token;
            cachedVideoId = result.videoId || getCurrentVideoId();
            window.postMessage(
                { type: 'YCN_POT_TOKEN_RECEIVED', token: result.token, videoId: cachedVideoId },
                '*'
            );
        } else if (attempt < MAX_RETRIES) {
            setTimeout(() => attemptRetrieve(attempt + 1), RETRY_DELAY);
        } else {
            console.error('[YCN-POT] Failed to retrieve POT token after max retries.');
        }
    }

    function clearTranscriptCaches() {
        cachedToken = null;
        cachedVideoId = null;
    }

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'YCN_REQUEST_POT_TOKEN') {
            const currentVideoId = getCurrentVideoId();
            if (cachedToken && cachedVideoId && cachedVideoId === currentVideoId) {
                window.postMessage(
                    { type: 'YCN_POT_TOKEN_RECEIVED', token: cachedToken, videoId: cachedVideoId },
                    '*'
                );
            } else {
                clearTranscriptCaches();
                attemptRetrieve(1);
            }
        }
        if (event.data && event.data.type === 'YCN_REQUEST_TRANSCRIPT_DIAGNOSTICS') {
            window.postMessage(
                {
                    type: 'YCN_TRANSCRIPT_DIAGNOSTICS',
                    requestId: event.data.requestId,
                    payload: getTranscriptDiagnostics(),
                },
                '*'
            );
        }
        if (event.data && event.data.type === 'YCN_REQUEST_TIMEDTEXT_FETCH') {
            fetchTimedTextInPage(event.data.url, event.data.headers).then((payload) => {
                window.postMessage(
                    {
                        type: 'YCN_TIMEDTEXT_FETCH_RESULT',
                        requestId: event.data.requestId,
                        payload,
                    },
                    '*'
                );
            });
        }
        if (event.data && (event.data.type === 'URL_CHANGED' || event.data.type === 'URL_CHANGE_TO_VIDEO')) {
            clearTranscriptCaches();
        }
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        attemptRetrieve();
    } else {
        window.addEventListener('load', () => {
             attemptRetrieve();
        });
    }

})();

(function () {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 1000;

    /**
     * Recursive function to find the 'pot' token in an object.
     * Based on the implementation in YCS-cont but optimized for performance.
     */
    function getTranscriptPot() {
        try {
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
                return pot;
            } catch (e) {
                console.warn('[YCN-POT] Failed to parse candidate URL:', urls[0]);
                return undefined;
            }

        } catch (e) {
            console.error('[YCN-POT] Critical error during search:', e);
            return undefined;
        }
    }

    let cachedToken = null;

    function attemptRetrieve(attempt = 1) {
        const token = getTranscriptPot();
        
        if (token) {
            cachedToken = token;
            window.postMessage({ type: 'YCN_POT_TOKEN_RECEIVED', token }, '*');
        } else if (attempt < MAX_RETRIES) {
            setTimeout(() => attemptRetrieve(attempt + 1), RETRY_DELAY);
        } else {
            console.error('[YCN-POT] Failed to retrieve POT token after max retries.');
        }
    }

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'YCN_REQUEST_POT_TOKEN') {
            if (cachedToken) {
                window.postMessage({ type: 'YCN_POT_TOKEN_RECEIVED', token: cachedToken }, '*');
            } else {
                attemptRetrieve(1);
            }
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
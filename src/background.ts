/**
 * Background Service Worker
 *
 * Minimal service worker for the YouTube Comment Navigator extension.
 * Reply fetching is now handled directly in the content script context
 * using ParallelReplyFetcher for better performance and to avoid
 * YouTube's bot detection.
 */

console.log('[Background] YouTube Comment Navigator 95 Service Worker initialized');

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] YouTube Comment Navigator 95 installed');
});

// Keep the service worker alive during extension updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle any future message types if needed
    // Currently, all reply fetching happens in the content script
    if (message.type === 'PING') {
        sendResponse({ pong: true });
        return true;
    }
    return false;
});

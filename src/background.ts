import { handleMessage } from './services/replyQueue/backgroundWorker';

console.log('[Background] YouTube Comment Navigator 95 Service Worker initialized');

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] YouTube Comment Navigator 95 installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handled = handleMessage(message, sender, sendResponse);
    // Return true to indicate async response
    return handled;
});
chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Comment Navigator 95 installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "injectScript") {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: [request.file]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error injecting script:', chrome.runtime.lastError);
                sendResponse({success: false, error: chrome.runtime.lastError});
            } else {
                sendResponse({success: true});
            }
        });
        return true;  // Indicates that the response is sent asynchronously
    }
});
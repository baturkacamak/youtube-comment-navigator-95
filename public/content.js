/**
 * Injects a React application into the specified container.
 *
 * @param {HTMLElement} container - The container element to inject the React app into.
 * @param {string} scriptUrl - The URL of the React app script to inject.
 * @param {string} cssUrl - The URL of the CSS file to inject.
 */
function injectReactApp(container, scriptUrl, cssUrl) {
    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.appendChild(link);

    // Inject JS
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onload = function () {};
    script.onerror = function () {
        console.error('Error loading React app script:', scriptUrl);
    };
    document.head.appendChild(script);
}

let appInjected = false; // Flag to check if the app is already injected

/**
 * Checks for the comments section and injects the React app if not already injected.
 */
function checkAndInject() {
    if (appInjected) {
        return; // Exit if the app is already injected
    }

    const commentsSection = document.getElementById('comments');
    if (commentsSection) {
        appInjected = true;
        console.log('checkAndInject');
        const appContainer = document.getElementById('youtube-comment-navigator-app');
        if (appContainer) {
            // Remove existing React app container if it exists
            appContainer.remove();
        }
        // Create new React app container
        const newAppContainer = document.createElement('div');
        newAppContainer.id = 'youtube-comment-navigator-app';
        newAppContainer.style.width = '100%';
        commentsSection.parentNode.insertBefore(newAppContainer, commentsSection);

        fetch(chrome.runtime.getURL('asset-manifest.json'))
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(manifest => {
                const mainJs = manifest['files']['main.js'];
                const mainCss = manifest['files']['main.css']; // Assuming main.css is the CSS file name
                injectReactApp(newAppContainer, chrome.runtime.getURL(mainJs), chrome.runtime.getURL(mainCss));
                appInjected = true; // Set the flag to true once the app is injected
            })
            .catch(err => console.error('Error fetching asset manifest:', err));
    }
}

/**
 * Removes the React app from the page.
 */
function removeApp() {
    const appContainer = document.getElementById('youtube-comment-navigator-app');
    if (appContainer) {
        appContainer.remove();
    }
    appInjected = false; // Reset the flag
}

/**
 * Hooks into the history methods to listen for URL changes.
 */
function hookHistoryMethods() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
        originalPushState.apply(this, arguments);
        window.dispatchEvent(new Event('urlchange'));
    };

    history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        window.dispatchEvent(new Event('urlchange'));
    };

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('urlchange'));
    });
}

// Hook into history methods and listen for urlchange events
hookHistoryMethods();

window.addEventListener('urlchange', () => {
    removeApp(); // Remove the existing app
    checkAndInject(); // Re-inject the app
});

// Initial check in case the comments section is already present
document.addEventListener('DOMContentLoaded', () => {
    checkAndInject();
});

// // Fallback interval to check if the comments section appears later
// const intervalId = setInterval(() => {
//     if (!appInjected && document.getElementById('comments')) {
//         checkAndInject();
//         clearInterval(intervalId); // Clear the interval once the app is injected
//     }
// }, 1000); // Adjust the interval as needed (e.g., every 1000 milliseconds)

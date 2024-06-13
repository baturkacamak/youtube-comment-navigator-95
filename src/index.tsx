import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { Provider } from 'react-redux';
import store from './store/store';
import { isLocalEnvironment } from "./utils/environmentVariables";
import './i18n';
import { getLanguageDirection } from './i18n';
import i18n from './i18n'; // Import i18n to access the current language

const rootElement = document.getElementById('youtube-comment-navigator-app') as HTMLElement;

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);

    const AppWrapper = () => {
        const [languageDirection, setLanguageDirection] = useState(getLanguageDirection(i18n.language));

        useEffect(() => {
            // Set initial language direction
            const initialDirection = getLanguageDirection(i18n.language);
            setLanguageDirection(initialDirection);

            // Update language direction on language change
            const handleLanguageChange = (lng: string) => {
                const direction = getLanguageDirection(lng);
                setLanguageDirection(direction);
            };

            i18n.on('languageChanged', handleLanguageChange);

            return () => {
                i18n.off('languageChanged', handleLanguageChange);
            };
        }, []);

        useEffect(() => {
            // Apply the direction class to the root element
            if (languageDirection === 'rtl') {
                rootElement.classList.add('rtl');
                rootElement.classList.remove('ltr');
            } else {
                rootElement.classList.add('ltr');
                rootElement.classList.remove('rtl');
            }
            rootElement.setAttribute('dir', languageDirection);
        }, [languageDirection]);

        return (
            <Provider store={store}>
                <App />
            </Provider>
        );
    };

    const renderApp = () => {
        root.render(
            isLocalEnvironment() ? (
                <React.StrictMode>
                    <AppWrapper />
                </React.StrictMode>
            ) : (
                <AppWrapper />
            )
        );
    };

    // Initial render
    renderApp();

    // Conditionally import reportWebVitals
    if (!isLocalEnvironment()) {
        import('./reportWebVitals').then(({ default: reportWebVitals }) => {
            reportWebVitals(console.log); // Replace console.log with your analytics function
        });
    }
} else {
    console.error("Root element 'youtube-comment-navigator-app' not found");
}

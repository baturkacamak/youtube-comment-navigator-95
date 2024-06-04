import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { Provider } from 'react-redux';
import store from './store/store';

const rootElement = document.getElementById('youtube-comment-navigator-app') as HTMLElement;

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);

    const AppWrapper = () => (
        <Provider store={store}>
            <App />
        </Provider>
    );

    const renderApp = () => {
        root.render(
            process.env.NODE_ENV === 'development' ? (
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

    // Expose the render function for external use
    (window as any).renderApp = renderApp;

    // Conditionally import reportWebVitals
    if (process.env.NODE_ENV === 'production') {
        import('./reportWebVitals').then(({ default: reportWebVitals }) => {
            reportWebVitals(console.log); // Replace console.log with your analytics function
        });
    }
} else {
    console.error("Root element 'youtube-comment-navigator-app' not found");
}

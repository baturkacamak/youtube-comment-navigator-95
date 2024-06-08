import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import {Provider} from 'react-redux';
import store from './store/store';
import {isLocalEnvironment} from "./utils/environmentVariables";

const rootElement = document.getElementById('youtube-comment-navigator-app') as HTMLElement;

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);

    const AppWrapper = () => (
        <Provider store={store}>
            <App/>
        </Provider>
    );

    const renderApp = () => {
        root.render(
            isLocalEnvironment() ? (
                <React.StrictMode>
                    <AppWrapper/>
                </React.StrictMode>
            ) : (
                <AppWrapper/>
            )
        );
    };

    // Initial render
    renderApp();

    // Conditionally import reportWebVitals
    if (!isLocalEnvironment()) {
        import('./reportWebVitals').then(({default: reportWebVitals}) => {
            reportWebVitals(console.log); // Replace console.log with your analytics function
        });
    }
} else {
    console.error("Root element 'youtube-comment-navigator-app' not found");
}

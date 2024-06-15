import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // for better assertions
import SettingsInfo from './SettingsInfo';
import { I18nextProvider } from 'react-i18next';
import packageJson from '../../../../package.json';
import i18n from "../../../i18n";


describe('SettingsInfo', () => {
    beforeEach(() => {
        render(
            <I18nextProvider i18n={i18n}>
                <SettingsInfo />
            </I18nextProvider>
        );
    });

    it('should display the app version', () => {
        expect(screen.getByText(/App Version/i)).toBeInTheDocument();
        expect(screen.getByText(packageJson.version)).toBeInTheDocument();
    });

    it('should display the developer name', () => {
        expect(screen.getByText(/Developed by/i)).toBeInTheDocument();
        expect(screen.getByText(/Batur Kacamak/i)).toBeInTheDocument();
    });

    it('should display the GitHub repository link', () => {
        expect(screen.getByText(/GitHub Repository/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /GitHub Repository/i })).toHaveAttribute('href', 'https://github.com/baturkacamak/youtube-comment-navigator-95');
    });

    it('should display the contact email', () => {
        expect(screen.getByText(/Contact/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /hello@batur.info/i })).toHaveAttribute('href', 'mailto:hello@batur.info');
    });
});

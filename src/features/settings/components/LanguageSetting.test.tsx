import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import LanguageSetting from './LanguageSetting';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { languageOptions } from '../../shared/utils/environmentVariables';

describe('LanguageSetting', () => {
    beforeEach(() => {
        render(
            <I18nextProvider i18n={i18n}>
                <LanguageSetting />
            </I18nextProvider>
        );
    });

    it('should render the LanguageSetting component', () => {
        expect(screen.getByText(/Language/i)).toBeInTheDocument();
    });

    it('should display the default selected language', () => {
        const defaultLanguage = languageOptions[0].label;
        expect(screen.getByText(defaultLanguage)).toBeInTheDocument();
    });

    it('should change the language when a new option is selected', () => {
        const selectBox = screen.getByRole('combobox');
        const newLanguage = languageOptions[1];

        fireEvent.change(selectBox, { target: { value: newLanguage.value } });

        expect(localStorage.getItem('language')).toBe(newLanguage.value);
    });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from '../../../store/store';
import AIAnalysisSourceSetting from './AIAnalysisSourceSetting';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

describe('AIAnalysisSourceSetting', () => {
  it('stores the selected analysis source', () => {
    render(
      <Provider store={store}>
        <AIAnalysisSourceSetting />
      </Provider>
    );

    fireEvent.click(screen.getByTestId('ai-analysis-source-select'));
    fireEvent.click(screen.getByText('Video transcript only'));

    expect(store.getState().settings.aiAnalysisSource).toBe('transcript');
  });
});

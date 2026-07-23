import { render, screen } from '@testing-library/react';
import AIApiKeySetting from './AIApiKeySetting';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => '',
}));

vi.mock('../../intelligence/services/aiService', () => ({
  setRemoteAIApiKey: vi.fn(),
}));

describe('AIApiKeySetting', () => {
  it('matches the response-language select height, spacing, and typography', () => {
    render(<AIApiKeySetting />);

    const input = screen.getByPlaceholderText('Enter your Gemini API key');
    expect(input).toHaveClass('h-10', '!rounded-lg', '!py-2', '!pl-4', '!pr-10', 'text-sm');
    expect(input.parentElement).toHaveClass('h-10');
  });
});

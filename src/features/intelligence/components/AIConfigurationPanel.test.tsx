import { fireEvent, render, screen } from '@testing-library/react';
import AIConfigurationPanel from './AIConfigurationPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../settings/components/AIApiKeySetting', () => ({
  default: () => <div>Gemini key control</div>,
}));

vi.mock('../../settings/components/AIResponseLanguageSetting', () => ({
  default: () => <div>AI language control</div>,
}));

describe('AIConfigurationPanel', () => {
  it('keeps AI controls collapsed until requested', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<AIConfigurationPanel isOpen={false} onToggle={onToggle} />);

    expect(screen.queryByText('Gemini key control')).not.toBeInTheDocument();
    expect(screen.queryByText('AI language control')).not.toBeInTheDocument();

    const settingsButton = screen.getByRole('button', { name: 'AI settings' });
    expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(settingsButton);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<AIConfigurationPanel isOpen={true} onToggle={onToggle} />);
    expect(screen.getByText('Gemini key control')).toBeInTheDocument();
    expect(screen.getByText('AI language control')).toBeInTheDocument();
    expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
  });
});

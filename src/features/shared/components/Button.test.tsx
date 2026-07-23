import { render, screen } from '@testing-library/react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Button from './Button';

describe('Button', () => {
  it('forwards native button attributes used by disclosure controls', () => {
    render(
      <Button
        onClick={() => undefined}
        icon={Cog6ToothIcon}
        label="AI settings"
        aria-expanded={true}
        aria-controls="ai-settings-content"
      />
    );

    const button = screen.getByRole('button', { name: 'AI settings' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'ai-settings-content');
  });
});

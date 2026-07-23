import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderDefault, renderList } from './renderHelpers';

describe('AI result renderers', () => {
  it('renders generated Markdown formatting', () => {
    const { container } = render(
      <>{renderDefault('**Main Topics:**\n\n* First topic\n* Second topic')}</>
    );

    expect(screen.getByText('Main Topics:').tagName).toBe('STRONG');
    expect(screen.getByText('First topic').tagName).toBe('LI');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('uses the shared Markdown renderer for list results', () => {
    render(<>{renderList('* **Topic:** Explanation')}</>);

    expect(screen.getByText('Topic:').tagName).toBe('STRONG');
    expect(screen.getByText(/Explanation/).closest('li')).toBeInTheDocument();
  });

  it('does not inject executable generated HTML', () => {
    const { container } = render(
      <>{renderDefault('<img src=x onerror="alert(1)"><script>alert(2)</script>Safe')}</>
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByText(/Safe/)).toBeInTheDocument();
  });

  it('turns generated timestamps into video seek controls', () => {
    const postMessage = vi.spyOn(window, 'postMessage');
    render(<>{renderDefault('Notable moments: 16:49 and 1:28:48')}</>);

    fireEvent.click(screen.getByRole('button', { name: '16:49' }));
    expect(postMessage).toHaveBeenCalledWith({ type: 'YCN_SEEK_TO', seconds: 1009 }, '*');

    fireEvent.click(screen.getByRole('button', { name: '1:28:48' }));
    expect(postMessage).toHaveBeenCalledWith({ type: 'YCN_SEEK_TO', seconds: 5328 }, '*');
  });
});

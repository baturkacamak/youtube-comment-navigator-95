import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Tabs from './Tabs';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      layoutId: _layoutId,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & {
      layoutId?: string;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => <div {...rest} />,
  },
}));

describe('Tabs', () => {
  const icon = () => <svg aria-hidden="true" />;
  const tabs = [
    {
      title: { id: 'comments', label: 'Comments', icon },
      content: <div>Comments content</div>,
    },
    {
      title: { id: 'bookmarks', label: 'Bookmarks', icon },
      content: <div>Bookmarks content</div>,
    },
  ];

  it('applies container-first tailwind classes', () => {
    const { container } = render(<Tabs tabs={tabs} activeTab="comments" onTabChange={vi.fn()} />);

    const tabsRoot = container.querySelector('.tabs');
    const tabsList = container.querySelector('.tabs__list');
    const firstButton = screen.getByRole('button', { name: 'Comments' });

    expect(tabsRoot).toHaveClass('cq');
    expect(tabsList?.className).toContain('cq-[44rem]:flex-wrap');
    expect(firstButton.className).toContain('cq-[44rem]:text-[0.95rem]');
  });

  it('calls onTabChange when a different tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<Tabs tabs={tabs} activeTab="comments" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(onTabChange).toHaveBeenCalledWith('bookmarks');
  });
});

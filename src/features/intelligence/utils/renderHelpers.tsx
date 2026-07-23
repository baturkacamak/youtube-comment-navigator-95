import React from 'react';
import TimestampedMarkdown from '../components/TimestampedMarkdown';

const renderMarkdown = (text: string): React.ReactNode => <TimestampedMarkdown text={text} />;

export const renderList = (text: string): React.ReactNode => {
  return renderMarkdown(text);
};

export const renderDefault = (text: string): React.ReactNode => {
  return renderMarkdown(text);
};

export const getRendererByType = (
  renderType: 'default' | 'list'
): ((text: string) => React.ReactNode) => {
  switch (renderType) {
    case 'list':
      return renderList;
    default:
      return renderDefault;
  }
};

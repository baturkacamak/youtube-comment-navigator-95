import React from 'react';
import { linkifyCommentText } from '../comments/linkifyCommentText';

export const splitTextByNewlines = (text: string): (JSX.Element | string)[] => {
  const lines = text.split('\n');
  const elements: (JSX.Element | string)[] = [];

  lines.forEach((line, lineIndex) => {
    const linkedLine = linkifyCommentText(line);
    elements.push(...linkedLine);
    // Add a line break after each line except the last one
    if (lineIndex < lines.length - 1) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
  });

  return elements;
};

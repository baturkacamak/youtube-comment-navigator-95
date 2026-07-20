import React from 'react';
import ExternalLink from '../../../shared/components/ExternalLink';

export const linkifyCommentText = (text: string): (JSX.Element | string)[] => {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#%=~_|])/gi;
  const elements: (JSX.Element | string)[] = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    // Push URL link
    const url = match[0];
    elements.push(
      <ExternalLink key={`${match.index}`} href={url} className="text-blue-500 underline">
        {url}
      </ExternalLink>
    );

    lastIndex = match.index + url.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
};

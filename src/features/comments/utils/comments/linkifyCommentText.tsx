import React from 'react';

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
      <a
        key={`${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
      >
        {url}
      </a>
    );

    lastIndex = match.index + url.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
};

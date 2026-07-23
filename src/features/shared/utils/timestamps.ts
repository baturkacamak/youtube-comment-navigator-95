const TIMESTAMP_VALUE_SOURCE = String.raw`(?:\d{1,3}:[0-5]\d:[0-5]\d|\d{1,3}:[0-5]\d)`;
const TIMESTAMP_SOURCE = String.raw`\b${TIMESTAMP_VALUE_SOURCE}\b`;

export interface TimestampMatch {
  value: string;
  index: number;
}

export const findTimestamps = (text: string): TimestampMatch[] =>
  Array.from(text.matchAll(new RegExp(TIMESTAMP_SOURCE, 'g')), (match) => ({
    value: match[0],
    index: match.index,
  }));

export const containsTimestamp = (text: string): boolean => new RegExp(TIMESTAMP_SOURCE).test(text);

export const timestampToSeconds = (timestamp: string): number | null => {
  if (!new RegExp(`^${TIMESTAMP_VALUE_SOURCE}$`).test(timestamp)) return null;

  return timestamp
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
};

const shouldSkipTextNode = (node: Text): boolean =>
  Boolean(node.parentElement?.closest('a, button, code, pre, script, style'));

export const linkifyTimestampsInSafeHtml = (safeHtml: string): string => {
  const container = document.createElement('div');
  container.innerHTML = safeHtml;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  textNodes.forEach((textNode) => {
    if (shouldSkipTextNode(textNode)) return;

    const text = textNode.textContent || '';
    const matches = findTimestamps(text);
    if (matches.length === 0) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach((match) => {
      if (match.index > lastIndex) {
        fragment.append(text.slice(lastIndex, match.index));
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.timestamp = match.value;
      button.className =
        'inline cursor-pointer border-none bg-transparent p-0 font-inherit text-blue-500 hover:underline dark:text-blue-400';
      button.textContent = match.value;
      fragment.append(button);
      lastIndex = match.index + match.value.length;
    });

    if (lastIndex < text.length) fragment.append(text.slice(lastIndex));
    textNode.replaceWith(fragment);
  });

  return container.innerHTML;
};

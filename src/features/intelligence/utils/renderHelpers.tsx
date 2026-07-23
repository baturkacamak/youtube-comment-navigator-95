import React from 'react';
import { markdownToSafeHtml } from '@baturkacamak/extension-ai-markdown';

const renderMarkdown = (text: string): React.ReactNode => (
  <div
    className="break-words [&_a]:text-teal-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-teal-400 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 dark:[&_blockquote]:border-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-gray-900 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold [&_hr]:my-3 [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-3 dark:[&_pre]:bg-gray-900 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-1.5 dark:[&_td]:border-gray-700 [&_th]:border [&_th]:border-gray-200 [&_th]:p-1.5 [&_th]:text-left dark:[&_th]:border-gray-700 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
    dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(text) }}
  />
);

export const renderSentiment = (text: string): React.ReactNode => {
  // Basic parsing: look for "Score: <number>" and "Vibe: ..."
  const scoreMatch = text.match(/Score:\s*(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

  // Extract Vibe and Explanation for display
  const vibeMatch = text.match(/Vibe:\s*(.+)/i);
  const explanationMatch = text.match(/Explanation:\s*(.+)/i);

  let colorClass = 'bg-gray-400';
  if (score !== null) {
    if (score >= 70) colorClass = 'bg-green-500';
    else if (score >= 40) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-red-500';
  }

  return (
    <div className="flex flex-col gap-3">
      {score !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${colorClass}`} style={{ width: `${score}%` }} />
          </div>
          <span className="text-xs font-bold w-8 text-right dark:text-gray-300">{score}</span>
        </div>
      )}

      {vibeMatch && (
        <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
          {vibeMatch[1]}
        </div>
      )}

      <div className="text-sm text-gray-700 dark:text-gray-300">
        {explanationMatch
          ? explanationMatch[1]
          : text.replace(/Score:.*\n?/g, '').replace(/Vibe:.*\n?/g, '')}
      </div>
    </div>
  );
};

export const renderList = (text: string): React.ReactNode => {
  return renderMarkdown(text);
};

export const renderDefault = (text: string): React.ReactNode => {
  return renderMarkdown(text);
};

export const getRendererByType = (
  renderType: 'default' | 'sentiment' | 'list'
): ((text: string) => React.ReactNode) => {
  switch (renderType) {
    case 'sentiment':
      return renderSentiment;
    case 'list':
      return renderList;
    default:
      return renderDefault;
  }
};

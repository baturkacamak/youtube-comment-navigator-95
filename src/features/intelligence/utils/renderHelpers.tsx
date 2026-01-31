import React from 'react';

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
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  // If lines look like a list, render them as such
  const isList = lines.some((l) => l.trim().startsWith('-') || l.trim().startsWith('*'));

  if (isList) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {lines.map((line, i) => {
          const cleanLine = line.replace(/^[-*]\s*/, '');
          return <li key={i}>{cleanLine}</li>;
        })}
      </ul>
    );
  }
  return <div className="whitespace-pre-wrap">{text}</div>;
};

export const renderDefault = (text: string): React.ReactNode => {
  return <div className="whitespace-pre-wrap">{text}</div>;
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

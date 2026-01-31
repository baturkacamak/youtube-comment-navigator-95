import React from 'react';
import { WordFrequency } from '../services/wordFrequencyService';

interface WordCloudProps {
  data: WordFrequency[];
  onWordClick: (word: string) => void;
}

const WordCloud: React.FC<WordCloudProps> = ({ data, onWordClick }) => {
  if (data.length === 0) {
    return <div className="text-center p-4 text-gray-500">Not enough data for word cloud.</div>;
  }

  const maxVal = data[0].value;
  const minVal = data[data.length - 1].value;

  // Simple font size scaler
  const getFontSize = (val: number) => {
    if (maxVal === minVal) return 1.5;
    // Scale between 1.5rem and 3.5rem
    const normalized = (val - minVal) / (maxVal - minVal);
    return 1.5 + normalized * 2.0;
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      {data.map((item) => (
        <button
          key={item.text}
          type="button"
          className="bg-transparent border-none p-0 text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          style={{
            fontSize: `${getFontSize(item.value)}rem`,
            opacity: 0.7 + getFontSize(item.value) / 10,
          }}
          title={`${item.value} occurrences`}
          onClick={() => onWordClick(item.text)}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
};

export default WordCloud;

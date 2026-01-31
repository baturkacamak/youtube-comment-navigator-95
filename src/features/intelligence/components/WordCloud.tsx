import React from 'react';
import { WordFrequency } from '../services/wordFrequencyService';

interface WordCloudProps {
  data: WordFrequency[];
}

const WordCloud: React.FC<WordCloudProps> = ({ data }) => {
  if (data.length === 0) {
    return <div className="text-center p-4 text-gray-500">Not enough data for word cloud.</div>;
  }

  const maxVal = data[0].value;
  const minVal = data[data.length - 1].value;

  // Simple font size scaler
  const getFontSize = (val: number) => {
    if (maxVal === minVal) return 1;
    // Scale between 0.8rem and 2.5rem
    const normalized = (val - minVal) / (maxVal - minVal);
    return 0.8 + normalized * 1.7;
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      {data.map((item) => (
        <span
          key={item.text}
          className="cursor-default hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          style={{
            fontSize: `${getFontSize(item.value)}rem`,
            opacity: 0.7 + getFontSize(item.value) / 10,
          }}
          title={`${item.value} occurrences`}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
};

export default WordCloud;

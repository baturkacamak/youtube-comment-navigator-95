import React, { useMemo } from 'react';
import WordCloud from './WordCloud';
import AiSummary from './AiSummary';
import { calculateWordFrequency } from '../services/wordFrequencyService';
import { useTranslation } from 'react-i18next';
import { Comment } from '../../../types/commentTypes';

interface IntelligenceTabProps {
  comments: Comment[];
}

const IntelligenceTab: React.FC<IntelligenceTabProps> = ({ comments }) => {
  const { t } = useTranslation();

  const wordFreqData = useMemo(() => calculateWordFrequency(comments), [comments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold dark:text-white px-1">{t('Intelligence')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
          {t('Analyze trends and summarize discussions.')}
        </p>
      </div>

      <AiSummary comments={comments} />

      <div>
        <h3 className="text-lg font-semibold mb-2 px-1 dark:text-gray-200">{t('Topic Cloud')}</h3>
        <WordCloud data={wordFreqData} />
      </div>
    </div>
  );
};

export default IntelligenceTab;

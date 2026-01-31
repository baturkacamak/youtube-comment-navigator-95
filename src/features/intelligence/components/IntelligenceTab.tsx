import React, { useMemo } from 'react';
import WordCloud from './WordCloud';
import AnalysisCard from './AnalysisCard';
import { calculateWordFrequency } from '../services/wordFrequencyService';
import { useTranslation } from 'react-i18next';
import { Comment } from '../../../types/commentTypes';
import { useDispatch } from 'react-redux';
import { setSearchKeyword } from '../../../store/store';
import {
  summarizeComments,
  analyzeSentiment,
  extractQuestions,
  extractIdeas,
  analyzeControversy,
  analyzeAudience,
} from '../services/aiService';
import {
  SparklesIcon,
  FaceSmileIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  FireIcon,
  UserGroupIcon,
  TagIcon,
} from '@heroicons/react/24/solid';

interface IntelligenceTabProps {
  comments: Comment[];
}

const IntelligenceTab: React.FC<IntelligenceTabProps> = ({ comments }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const wordFreqData = useMemo(() => calculateWordFrequency(comments), [comments]);

  const handleWordClick = (word: string) => {
    dispatch(setSearchKeyword(word));
  };

  // --- Render Helpers ---

  const renderSentiment = (text: string) => {
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

  const renderList = (text: string) => {
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

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold dark:text-white">{t('Intelligence Dashboard')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('AI-powered insights for your community interactions.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Summary */}
        <AnalysisCard
          title="Executive Summary"
          icon={<SparklesIcon className="w-5 h-5 text-yellow-500" />}
          comments={comments}
          analyzer={summarizeComments}
        />

        {/* 2. Sentiment / Vibe */}
        <AnalysisCard
          title="Vibe Check"
          icon={<FaceSmileIcon className="w-5 h-5 text-purple-500" />}
          comments={comments}
          analyzer={analyzeSentiment}
          renderResult={renderSentiment}
        />

        {/* 3. Questions */}
        <AnalysisCard
          title="Smart Q&A"
          icon={<QuestionMarkCircleIcon className="w-5 h-5 text-blue-500" />}
          comments={comments}
          analyzer={extractQuestions}
          renderResult={renderList}
        />

        {/* 4. Ideas */}
        <AnalysisCard
          title="Idea Miner"
          icon={<LightBulbIcon className="w-5 h-5 text-amber-500" />}
          comments={comments}
          analyzer={extractIdeas}
          renderResult={renderList}
        />

        {/* 5. Controversy */}
        <AnalysisCard
          title="Controversy Radar"
          icon={<FireIcon className="w-5 h-5 text-red-500" />}
          comments={comments}
          analyzer={analyzeControversy}
        />

        {/* 6. Audience */}
        <AnalysisCard
          title="Audience Profiling"
          icon={<UserGroupIcon className="w-5 h-5 text-teal-500" />}
          comments={comments}
          analyzer={analyzeAudience}
        />
      </div>

      {/* 7. Word Cloud (Full Width) */}
      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <TagIcon className="w-5 h-5 text-indigo-500" />
          {t('Topic Cloud')}
        </h3>
        <WordCloud data={wordFreqData} onWordClick={handleWordClick} />
      </div>
    </div>
  );
};

export default IntelligenceTab;

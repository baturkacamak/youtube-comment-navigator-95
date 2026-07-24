import {
  SparklesIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  LinkIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import {
  summarizeComments,
  extractKeyTakeaways,
  answerQuestionsFromComments,
  extractTipsAndResources,
  analyzeConsensusAndDebate,
  extractCorrectionsAndWarnings,
} from '../services/aiService';
import type { AnalysisInput } from '../types/analysis';

export type CardId =
  | 'comment-summary'
  | 'key-takeaways'
  | 'questions-and-answers'
  | 'tips-and-resources'
  | 'consensus-and-debate'
  | 'corrections-and-warnings';

export interface CardConfig {
  id: CardId;
  title: string;
  description: string;
  icon: typeof SparklesIcon;
  iconColorClass: string;
  accentColorClass: string;
  analyzer: (input: AnalysisInput, signal?: AbortSignal) => Promise<string>;
  renderType: 'default' | 'list';
}

export const CARD_CONFIGS: CardConfig[] = [
  {
    id: 'comment-summary',
    title: 'Content Summary',
    description: 'Understand video topics, viewer reactions, and recurring themes.',
    icon: SparklesIcon,
    iconColorClass: 'text-yellow-500',
    accentColorClass: 'border-l-yellow-500',
    analyzer: summarizeComments,
    renderType: 'default',
  },
  {
    id: 'key-takeaways',
    title: 'Key Takeaways',
    description: 'Extract useful context, observations, and lessons shared by viewers.',
    icon: BookOpenIcon,
    iconColorClass: 'text-purple-500',
    accentColorClass: 'border-l-purple-500',
    analyzer: extractKeyTakeaways,
    renderType: 'list',
  },
  {
    id: 'questions-and-answers',
    title: 'Questions & Answers',
    description: 'Match useful viewer questions with answers found in the comments.',
    icon: QuestionMarkCircleIcon,
    iconColorClass: 'text-blue-500',
    accentColorClass: 'border-l-blue-500',
    analyzer: answerQuestionsFromComments,
    renderType: 'default',
  },
  {
    id: 'tips-and-resources',
    title: 'Tips & Resources',
    description: 'Collect useful tips, recommendations, alternatives, links, and tools.',
    icon: LinkIcon,
    iconColorClass: 'text-amber-500',
    accentColorClass: 'border-l-amber-500',
    analyzer: extractTipsAndResources,
    renderType: 'list',
  },
  {
    id: 'consensus-and-debate',
    title: 'Consensus & Debate',
    description: 'See where viewers agree and where their perspectives differ.',
    icon: ScaleIcon,
    iconColorClass: 'text-teal-500',
    accentColorClass: 'border-l-teal-500',
    analyzer: analyzeConsensusAndDebate,
    renderType: 'default',
  },
  {
    id: 'corrections-and-warnings',
    title: 'Corrections & Warnings',
    description: 'Surface viewer-reported corrections, caveats, missing context, and warnings.',
    icon: ExclamationTriangleIcon,
    iconColorClass: 'text-red-500',
    accentColorClass: 'border-l-red-500',
    analyzer: extractCorrectionsAndWarnings,
    renderType: 'default',
  },
];

import {
  SparklesIcon,
  FaceSmileIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  FireIcon,
  UserGroupIcon,
} from '@heroicons/react/24/solid';
import {
  summarizeComments,
  analyzeSentiment,
  extractQuestions,
  extractIdeas,
  analyzeControversy,
  analyzeAudience,
} from '../services/aiService';
import { Comment } from '../../../types/commentTypes';

export type CardId =
  | 'executive-summary'
  | 'vibe-check'
  | 'smart-qa'
  | 'idea-miner'
  | 'controversy-radar'
  | 'audience-profiling';

export interface CardConfig {
  id: CardId;
  title: string;
  description: string;
  icon: typeof SparklesIcon;
  iconColorClass: string;
  accentColorClass: string;
  analyzer: (comments: Comment[], apiKey?: string) => Promise<string>;
  renderType: 'default' | 'sentiment' | 'list';
}

export const CARD_CONFIGS: CardConfig[] = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'Get a quick overview of main topics, sentiment, and recurring themes.',
    icon: SparklesIcon,
    iconColorClass: 'text-yellow-500',
    accentColorClass: 'border-l-yellow-500',
    analyzer: summarizeComments,
    renderType: 'default',
  },
  {
    id: 'vibe-check',
    title: 'Vibe Check',
    description: 'Analyze the overall mood and emotional tone of the comments.',
    icon: FaceSmileIcon,
    iconColorClass: 'text-purple-500',
    accentColorClass: 'border-l-purple-500',
    analyzer: analyzeSentiment,
    renderType: 'sentiment',
  },
  {
    id: 'smart-qa',
    title: 'Smart Q&A',
    description: 'Find unanswered questions that viewers are asking.',
    icon: QuestionMarkCircleIcon,
    iconColorClass: 'text-blue-500',
    accentColorClass: 'border-l-blue-500',
    analyzer: extractQuestions,
    renderType: 'list',
  },
  {
    id: 'idea-miner',
    title: 'Idea Miner',
    description: 'Discover feature requests, video ideas, and constructive feedback.',
    icon: LightBulbIcon,
    iconColorClass: 'text-amber-500',
    accentColorClass: 'border-l-amber-500',
    analyzer: extractIdeas,
    renderType: 'list',
  },
  {
    id: 'controversy-radar',
    title: 'Controversy Radar',
    description: 'Detect debates, disagreements, and polarizing topics.',
    icon: FireIcon,
    iconColorClass: 'text-red-500',
    accentColorClass: 'border-l-red-500',
    analyzer: analyzeControversy,
    renderType: 'default',
  },
  {
    id: 'audience-profiling',
    title: 'Audience Profiling',
    description: 'Understand who your viewers are based on their language and interests.',
    icon: UserGroupIcon,
    iconColorClass: 'text-teal-500',
    accentColorClass: 'border-l-teal-500',
    analyzer: analyzeAudience,
    renderType: 'default',
  },
];

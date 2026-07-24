import { formatTextItems } from '@baturkacamak/extension-ai-core';
import { formatTime } from '../../transcripts/utils/formatTime';
import type { TranscriptEntry } from '../../transcripts/utils/processTranscriptData';
import type { Comment } from '../../../types/commentTypes';
import type {
  AIAnalysisSource,
  AnalysisInput,
  AnalysisPromptMaterial,
  ResolvedAnalysisSource,
} from '../types/analysis';

const TRANSCRIPT_WINDOW_SECONDS = 60;
const TRANSCRIPT_EXCERPT_LIMIT = 40;
const TRANSCRIPT_CHARACTER_BUDGET = 16_000;

interface TranscriptExcerpt {
  start: number;
  text: string;
}

const normalizeTranscriptText = (text: string): string => text.replace(/\s+/g, ' ').trim();

const groupTranscriptEntries = (transcripts: TranscriptEntry[]): TranscriptExcerpt[] => {
  const excerpts = new Map<number, TranscriptExcerpt>();

  transcripts.forEach((entry) => {
    const text = normalizeTranscriptText(entry.text);
    if (!text || !Number.isFinite(entry.start)) return;

    const window = Math.floor(Math.max(0, entry.start) / TRANSCRIPT_WINDOW_SECONDS);
    const existing = excerpts.get(window);
    if (existing) {
      existing.text = `${existing.text} ${text}`;
      return;
    }

    excerpts.set(window, { start: Math.max(0, entry.start), text });
  });

  return [...excerpts.values()].sort((left, right) => left.start - right.start);
};

const sampleEvenly = <T>(items: T[], limit: number): T[] => {
  if (items.length <= limit) return items;
  if (limit <= 1) return items.slice(0, Math.max(0, limit));

  return Array.from({ length: limit }, (_, index) => {
    const itemIndex = Math.round((index * (items.length - 1)) / (limit - 1));
    return items[itemIndex];
  });
};

export const formatTranscriptForPrompt = (transcripts: TranscriptEntry[]): string => {
  const sampledExcerpts = sampleEvenly(
    groupTranscriptEntries(transcripts),
    TRANSCRIPT_EXCERPT_LIMIT
  );
  if (sampledExcerpts.length === 0) return '';

  const textBudgetPerExcerpt = Math.max(
    80,
    Math.floor(TRANSCRIPT_CHARACTER_BUDGET / sampledExcerpts.length) - 16
  );

  return sampledExcerpts
    .map(({ start, text }) => `- [${formatTime(start)}] ${text.slice(0, textBudgetPerExcerpt)}`)
    .join('\n');
};

export const formatCommentsForPrompt = (comments: Comment[], limit = 50): string =>
  formatTextItems(
    comments.map((comment) => ({ text: comment.content, weight: comment.likes })),
    { limit }
  );

export const resolveAnalysisSource = (
  input: AnalysisInput,
  automaticSource: ResolvedAnalysisSource
): ResolvedAnalysisSource => {
  const requestedSource = input.source === 'auto' ? automaticSource : input.source;
  const hasComments = input.comments.length > 0;
  const hasTranscript = input.transcripts.length > 0;

  if (requestedSource === 'combined') {
    if (hasComments && hasTranscript) return 'combined';
    if (hasTranscript) return 'transcript';
    return 'comments';
  }

  if (requestedSource === 'comments' && !hasComments && hasTranscript && input.source === 'auto') {
    return 'transcript';
  }
  if (
    requestedSource === 'transcript' &&
    !hasTranscript &&
    hasComments &&
    input.source === 'auto'
  ) {
    return 'comments';
  }

  return requestedSource;
};

export const buildAnalysisPromptMaterial = (
  input: AnalysisInput,
  automaticSource: ResolvedAnalysisSource
): AnalysisPromptMaterial => {
  const source = resolveAnalysisSource(input, automaticSource);
  const material: AnalysisPromptMaterial = {};

  if (source === 'comments' || source === 'combined') {
    const comments = formatCommentsForPrompt(input.comments);
    if (comments) material.comments = comments;
  }
  if (source === 'transcript' || source === 'combined') {
    const transcript = formatTranscriptForPrompt(input.transcripts);
    if (transcript) material.transcript = transcript;
  }

  if (!material.comments && !material.transcript) {
    throw new Error('No content is available for the selected analysis source.');
  }

  return material;
};

export const hasContentForAnalysisSource = (
  source: AIAnalysisSource,
  comments: Comment[],
  transcripts: TranscriptEntry[]
): boolean => {
  if (source === 'comments') return comments.length > 0;
  if (source === 'transcript') return transcripts.length > 0;
  return comments.length > 0 || transcripts.length > 0;
};

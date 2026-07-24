import type { Comment } from '../../../types/commentTypes';
import type { TranscriptEntry } from '../../transcripts/utils/processTranscriptData';

export type AIAnalysisSource = 'auto' | 'combined' | 'transcript' | 'comments';
export type ResolvedAnalysisSource = Exclude<AIAnalysisSource, 'auto'>;

export interface AnalysisInput {
  comments: Comment[];
  transcripts: TranscriptEntry[];
  source: AIAnalysisSource;
}

export interface AnalysisPromptMaterial {
  comments?: string;
  transcript?: string;
}

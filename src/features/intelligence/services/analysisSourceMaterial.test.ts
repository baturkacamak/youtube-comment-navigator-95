import type { Comment } from '../../../types/commentTypes';
import type { TranscriptEntry } from '../../transcripts/utils/processTranscriptData';
import {
  buildAnalysisPromptMaterial,
  formatTranscriptForPrompt,
  hasContentForAnalysisSource,
  resolveAnalysisSource,
} from './analysisSourceMaterial';

const comments = [{ content: 'Useful viewer detail', likes: 10 }] as Comment[];
const transcripts: TranscriptEntry[] = [
  { start: 0, duration: 5, text: 'Opening statement' },
  { start: 1009, duration: 4, text: 'Important detail' },
];

describe('analysis source material', () => {
  it('formats transcript excerpts with linkable timestamps', () => {
    expect(formatTranscriptForPrompt(transcripts)).toContain('[00:00] Opening statement');
    expect(formatTranscriptForPrompt(transcripts)).toContain('[16:49] Important detail');
  });

  it('uses card-specific defaults in automatic mode', () => {
    const input = { comments, transcripts, source: 'auto' as const };

    expect(resolveAnalysisSource(input, 'comments')).toBe('comments');
    expect(resolveAnalysisSource(input, 'combined')).toBe('combined');
  });

  it('falls back to the available source only in automatic and combined modes', () => {
    const transcriptOnly = { comments: [], transcripts, source: 'auto' as const };
    expect(resolveAnalysisSource(transcriptOnly, 'comments')).toBe('transcript');

    const explicitComments = { ...transcriptOnly, source: 'comments' as const };
    expect(resolveAnalysisSource(explicitComments, 'combined')).toBe('comments');
    expect(() => buildAnalysisPromptMaterial(explicitComments, 'combined')).toThrow(
      'No content is available'
    );
  });

  it('keeps transcript and comments in separate prompt fields', () => {
    const material = buildAnalysisPromptMaterial(
      { comments, transcripts, source: 'combined' },
      'comments'
    );

    expect(material.comments).toContain('Useful viewer detail');
    expect(material.transcript).toContain('Opening statement');
  });

  it('reports whether the selected source is available', () => {
    expect(hasContentForAnalysisSource('comments', comments, [])).toBe(true);
    expect(hasContentForAnalysisSource('transcript', comments, [])).toBe(false);
    expect(hasContentForAnalysisSource('combined', [], transcripts)).toBe(true);
    expect(hasContentForAnalysisSource('auto', [], [])).toBe(false);
  });
});

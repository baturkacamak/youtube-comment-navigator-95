import { fireEvent, render, screen } from '@testing-library/react';
import IntelligenceTab from './IntelligenceTab';

const mocks = vi.hoisted(() => ({
  analyzeCard: vi.fn(),
  analyzeAll: vi.fn(),
  clearAll: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useSelector: () => 'transcript',
}));

vi.mock('../hooks/useAnalysisManager', () => ({
  useAnalysisManager: () => ({
    cardStates: Object.fromEntries(
      [
        'comment-summary',
        'key-takeaways',
        'questions-and-answers',
        'tips-and-resources',
        'consensus-and-debate',
        'corrections-and-warnings',
      ].map((id) => [id, { status: 'idle', result: null, error: null, isExpanded: false }])
    ),
    isAnalyzing: false,
    completedCount: 0,
    canAnalyze: true,
    analyzeCard: mocks.analyzeCard,
    analyzeAll: mocks.analyzeAll,
    clearCard: vi.fn(),
    clearAll: mocks.clearAll,
    cancelAll: vi.fn(),
    toggleCardExpanded: vi.fn(),
  }),
}));

vi.mock('./AIConfigBanner', () => ({ default: () => null }));
vi.mock('./AIConfigurationPanel', () => ({ default: () => null }));
vi.mock('./AnalysisActionBar', () => ({
  default: ({ canAnalyze, onAnalyzeAll }: { canAnalyze: boolean; onAnalyzeAll: () => void }) => (
    <button type="button" disabled={!canAnalyze} onClick={onAnalyzeAll}>
      Analyze all test
    </button>
  ),
}));
vi.mock('./AnalysisCard', () => ({
  default: ({
    title,
    canAnalyze,
    onAnalyze,
  }: {
    title: string;
    canAnalyze: boolean;
    onAnalyze: () => void;
  }) => (
    <button type="button" disabled={!canAnalyze} onClick={onAnalyze}>
      Analyze {title}
    </button>
  ),
}));

describe('IntelligenceTab analysis sources', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows transcript-only analysis and passes transcript data to the analyzer', () => {
    const transcripts = [{ start: 1009, duration: 4, text: 'Transcript detail' }];
    render(<IntelligenceTab comments={[]} transcripts={transcripts} />);

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Key Takeaways' }));

    expect(mocks.analyzeCard).toHaveBeenCalledWith('key-takeaways', {
      comments: [],
      transcripts,
      source: 'transcript',
    });
  });

  it('disables analysis when the explicitly selected source has no content', () => {
    render(<IntelligenceTab comments={[]} transcripts={[]} />);

    expect(screen.getByRole('button', { name: 'Analyze all test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analyze Content Summary' })).toBeDisabled();
  });
});

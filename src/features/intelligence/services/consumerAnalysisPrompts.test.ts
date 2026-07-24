import {
  buildCommentSummaryPrompt,
  buildConsensusAndDebatePrompt,
  buildCorrectionsAndWarningsPrompt,
  buildKeyTakeawaysPrompt,
  buildQuestionsAndAnswersPrompt,
  buildTipsAndResourcesPrompt,
} from './consumerAnalysisPrompts';

describe('consumer analysis prompts', () => {
  const comments = 'First sampled comment';
  const transcript = '- [16:49] The video explains the main point';

  it('builds six viewer-focused prompts around the sampled comments', () => {
    const prompts = [
      buildCommentSummaryPrompt({ comments, transcript }),
      buildKeyTakeawaysPrompt({ comments, transcript }),
      buildQuestionsAndAnswersPrompt({ comments, transcript }),
      buildTipsAndResourcesPrompt({ comments, transcript }),
      buildConsensusAndDebatePrompt({ comments, transcript }),
      buildCorrectionsAndWarningsPrompt({ comments, transcript }),
    ];

    expect(prompts).toHaveLength(6);
    prompts.forEach((prompt) => {
      expect(prompt).toContain(`Sampled viewer comments:\n${comments}`);
      expect(prompt).toContain(`Sampled video transcript excerpts:\n${transcript}`);
      expect(prompt).toContain('Never attribute a comment claim to the video');
      expect(prompt).toContain('preserve its provided timestamp');
    });
    expect(prompts.join(' ')).not.toMatch(/feature requests|video ideas|audience profile/i);
  });

  it('prevents unsupported answers, links, and fact-checking claims', () => {
    expect(buildQuestionsAndAnswersPrompt({ comments })).toContain('Never invent an answer');
    expect(buildTipsAndResourcesPrompt({ comments })).toContain('never create links');
    expect(buildCorrectionsAndWarningsPrompt({ comments })).toContain(
      'not independently verified facts'
    );
  });

  it('supports transcript-only analysis without adding an empty comments section', () => {
    const prompt = buildKeyTakeawaysPrompt({ transcript });

    expect(prompt).toContain(`Sampled video transcript excerpts:\n${transcript}`);
    expect(prompt).not.toContain('Sampled viewer comments:');
  });
});

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

  it('builds six viewer-focused prompts around the sampled comments', () => {
    const prompts = [
      buildCommentSummaryPrompt(comments),
      buildKeyTakeawaysPrompt(comments),
      buildQuestionsAndAnswersPrompt(comments),
      buildTipsAndResourcesPrompt(comments),
      buildConsensusAndDebatePrompt(comments),
      buildCorrectionsAndWarningsPrompt(comments),
    ];

    expect(prompts).toHaveLength(6);
    prompts.forEach((prompt) => expect(prompt).toContain(`Sampled comments:\n${comments}`));
    expect(prompts.join(' ')).not.toMatch(/feature requests|video ideas|audience profile/i);
  });

  it('prevents unsupported answers, links, and fact-checking claims', () => {
    expect(buildQuestionsAndAnswersPrompt(comments)).toContain('Never invent an answer');
    expect(buildTipsAndResourcesPrompt(comments)).toContain('never create links');
    expect(buildCorrectionsAndWarningsPrompt(comments)).toContain(
      'not independently verified facts'
    );
  });
});

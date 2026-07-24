import type { AnalysisPromptMaterial } from '../types/analysis';

const withSourceMaterial = (
  instructions: string,
  { comments, transcript }: AnalysisPromptMaterial
): string => {
  const sourceRules = [
    `Source rules:`,
    `- Transcript excerpts represent what was said in the video. They are sampled across the video and may not contain every statement.`,
    `- Comments represent viewer statements, reactions, and claims. Do not present them as verified facts.`,
    `- Never attribute a comment claim to the video or a transcript statement to viewers.`,
    `- When using a transcript detail, preserve its provided timestamp so the viewer can open that moment.`,
  ];
  if (comments && transcript) {
    sourceRules.push(`- Clearly distinguish video content from viewer discussion in the response.`);
  }

  const sourceSections = [
    transcript ? `Sampled video transcript excerpts:\n${transcript}` : '',
    comments ? `Sampled viewer comments:\n${comments}` : '',
  ].filter(Boolean);

  return `${instructions}\n\n${sourceRules.join('\n')}\n\n${sourceSections.join('\n\n')}`;
};

export const buildCommentSummaryPrompt = (material: AnalysisPromptMaterial): string =>
  withSourceMaterial(
    `Summarize the supplied YouTube source material for a viewer. If comments are present, cover their main topics, overall reaction, repeated observations, and recurring jokes or concerns. If transcript excerpts are present, summarize the video's main subjects supported by those excerpts. When both are present, use separate short Markdown sections for video content and viewer discussion. Do not invent missing context. Stay under 250 words.`,
    material
  );

export const buildKeyTakeawaysPrompt = (material: AnalysisPromptMaterial): string =>
  withSourceMaterial(
    `Extract 3-7 useful takeaways supported by the supplied material, such as practical context, notable observations, lessons, or details that are easy to miss. Prefer the transcript for claims about video content and use comments as supplementary viewer context. Combine duplicates and label viewer-reported uncertainty clearly. Return a concise Markdown list.`,
    material
  );

export const buildQuestionsAndAnswersPrompt = (material: AnalysisPromptMaterial): string =>
  withSourceMaterial(
    `Identify the most useful genuine questions raised or answered in the supplied material. Match each question only with an answer or helpful context actually supported by the supplied sources, preferring the transcript for what the video states. Ignore rhetorical questions. Never invent an answer; when none is supported, say that no answer was found in the supplied material. Return the top 3-5 question-and-answer pairs in readable Markdown.`,
    material
  );

export const buildTipsAndResourcesPrompt = (material: AnalysisPromptMaterial): string =>
  withSourceMaterial(
    `Collect practical tips, recommendations, alternatives, tools, places, products, commands, or resources explicitly mentioned in the supplied material. Group duplicates, briefly explain why each item was mentioned, and identify whether it came from the video or viewers when both sources are present. Preserve links that actually appear, but never create links or recommendations that are not present. Return a concise Markdown list, or explain that no useful tips or resources were found.`,
    material
  );

export const buildConsensusAndDebatePrompt = (material: AnalysisPromptMaterial): string =>
  withSourceMaterial(
    `When comments are present, map where viewers agree and disagree. Use transcript excerpts only as video context; never count transcript statements as viewer consensus. If only transcript excerpts are present, describe competing positions expressed in the video and explicitly state that viewer consensus cannot be determined. Represent each side fairly, do not manufacture opposition, and note when a viewer position appears in only a small number of sampled comments. Use short Markdown sections.`,
    material
  );

export const buildCorrectionsAndWarningsPrompt = (material: AnalysisPromptMaterial): string =>
  withSourceMaterial(
    `Find corrections, caveats, missing context, safety concerns, spoilers, outdated information, or other warnings supported by the supplied material. When both sources are present, compare viewer-reported concerns with what the transcript actually says, but do not treat disagreement as proof that either side is correct. Commenter corrections are not independently verified facts: state that distinction clearly and never certify them as true. Combine duplicates, distinguish recurring concerns from isolated claims, and return concise Markdown. If none are present, say so.`,
    material
  );

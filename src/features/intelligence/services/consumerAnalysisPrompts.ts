const withSampledComments = (instructions: string, commentText: string): string =>
  `${instructions}\n\nSampled comments:\n${commentText}`;

export const buildCommentSummaryPrompt = (commentText: string): string =>
  withSampledComments(
    `Summarize what viewers discuss in these YouTube comments for someone deciding what the comment section says. Cover the main topics, overall reaction, repeated observations, and recurring jokes or concerns. Describe the comments, not the video's actual content, and do not invent context that is absent. Use concise Markdown and stay under 200 words.`,
    commentText
  );

export const buildKeyTakeawaysPrompt = (commentText: string): string =>
  withSampledComments(
    `Extract 3-7 useful takeaways a viewer can learn from these comments, such as practical context, notable observations, lessons, or details that are easy to miss. Include only points supported by the sampled comments, combine duplicates, and clearly frame uncertain points as viewer-reported rather than verified facts. Return a concise Markdown list.`,
    commentText
  );

export const buildQuestionsAndAnswersPrompt = (commentText: string): string =>
  withSampledComments(
    `Identify the most useful genuine questions raised in these comments and match each one with any plausible answer or helpful context found elsewhere in the sampled comments. Ignore rhetorical questions. Never invent an answer; when the comments do not contain one, state that no answer was found in the sampled comments. Return the top 3-5 question-and-answer pairs in readable Markdown.`,
    commentText
  );

export const buildTipsAndResourcesPrompt = (commentText: string): string =>
  withSampledComments(
    `Collect practical tips, recommendations, alternatives, tools, places, products, commands, or resources explicitly mentioned in these comments. Group duplicates and briefly explain why each item was mentioned. Preserve links that actually appear in the comments, but never create links or recommendations that are not present. Return a concise Markdown list, or explain that no useful tips or resources were found.`,
    commentText
  );

export const buildConsensusAndDebatePrompt = (commentText: string): string =>
  withSampledComments(
    `Map where viewers agree and where they disagree in these comments. Separate broadly shared views from disputed claims or competing perspectives. Represent each side fairly, do not manufacture an opposing side, and note when a viewpoint appears to come from only a small number of sampled comments. Use short Markdown sections for consensus and debate.`,
    commentText
  );

export const buildCorrectionsAndWarningsPrompt = (commentText: string): string =>
  withSampledComments(
    `Find viewer-reported corrections, caveats, missing context, safety concerns, spoilers, outdated information, or other warnings in these comments. These are claims from commenters, not independently verified facts: state that distinction clearly and never certify a claim as true. Combine duplicates, distinguish recurring concerns from isolated claims, and return concise Markdown. If none are present, say that no corrections or warnings were found in the sampled comments.`,
    commentText
  );

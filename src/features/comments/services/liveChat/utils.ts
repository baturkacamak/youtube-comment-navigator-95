import { deepFindObjKey, getObj, wrapTryCatch } from './common';

export interface ChatProcessingContext {
  chatMap: Map<number, object>;
  currentVideoId?: string;
  onCommentAdded?: (count: number) => void;
  broadcastStartTime?: string;
}

export interface FormatChatRunsOptions {
  currentVideoId?: string;
}

export interface FormatChatRunsResult {
  fullText: string;
  richText: string;
  hasTimelineLink: boolean;
}

export function prepareChatCommentFields(comment: any): any {
  try {
    const renderer = wrapTryCatch(
      () =>
        comment.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer
    );
    if (!renderer) return comment;

    const badgeRenderer = wrapTryCatch(
      () => renderer.authorBadges?.[0]?.liveChatAuthorBadgeRenderer
    );
    const iconType = wrapTryCatch(() => badgeRenderer?.icon?.iconType) as string | undefined;
    const tooltip = wrapTryCatch(() => badgeRenderer?.tooltip) as string | undefined;

    if (
      typeof iconType === 'string' &&
      (iconType.indexOf('VERIFIED') >= 0 || iconType.indexOf('CHECK') >= 0)
    ) {
      renderer.verifiedAuthor = true;
    } else if (typeof tooltip === 'string' && tooltip.indexOf('Verified') >= 0) {
      renderer.verifiedAuthor = true;
    }

    return comment;
  } catch (error) {
    console.error(error);
    return comment;
  }
}

export function markTimelineLinks(comment: any, hasTimelineLink: boolean): void {
  if (!hasTimelineLink) return;

  try {
    const renderer = wrapTryCatch(
      () =>
        comment.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer
    );
    if (!renderer) return;

    renderer.isTimeLine = 'timeline';
  } catch (error) {
    console.error(error);
  }
}

export function ensureTextMessageRenderer(comment: any): void {
  try {
    const action = wrapTryCatch(() => comment?.replayChatItemAction?.actions?.[0]) as any;
    if (!action) return;

    const existingTimestamp = wrapTryCatch(
      () => action?.addChatItemAction?.item?.liveChatTextMessageRenderer?.timestampUsec
    );
    if (existingTimestamp) return;

    const paidRenderer = wrapTryCatch(
      () => action?.addChatItemAction?.item?.liveChatPaidMessageRenderer
    );
    if (paidRenderer) {
      action.addChatItemAction = action.addChatItemAction || { item: {} };
      action.addChatItemAction.item = action.addChatItemAction.item || {};
      action.addChatItemAction.item.liveChatTextMessageRenderer = paidRenderer;
      return;
    }

    const bannerRenderer = wrapTryCatch(
      () =>
        action?.addBannerToLiveChatCommand?.bannerRenderer?.liveChatBannerRenderer?.contents
          ?.liveChatTextMessageRenderer
    );
    if (bannerRenderer) {
      action.addChatItemAction = { item: { liveChatTextMessageRenderer: bannerRenderer } };
      return;
    }

    const tickerRenderer = wrapTryCatch(
      () =>
        action?.addLiveChatTickerItemAction?.item?.liveChatTickerPaidMessageItemRenderer
          ?.showItemEndpoint?.showLiveChatItemEndpoint?.renderer?.liveChatPaidMessageRenderer
    );
    if (tickerRenderer) {
      action.addChatItemAction = { item: { liveChatTextMessageRenderer: tickerRenderer } };
      return;
    }

    const pathComment = wrapTryCatch(() => {
      const matches = deepFindObjKey(comment, 'timestampUsec');
      if (!Array.isArray(matches) || matches.length === 0) return undefined;
      return Object.keys(matches[0])[0].split('.').slice(0, -1).join('.');
    }) as string | undefined;

    if (pathComment) {
      const foundComment = getObj(comment, pathComment, undefined) as any;
      if (foundComment?.authorName && foundComment?.message) {
        action.addChatItemAction = { item: { liveChatTextMessageRenderer: foundComment } };
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export function formatChatRuns(
  runs: any[],
  options: FormatChatRunsOptions = {}
): FormatChatRunsResult {
  const result: FormatChatRunsResult = {
    fullText: '',
    richText: '',
    hasTimelineLink: false,
  };

  const items = Array.isArray(runs) ? runs : [];

  for (const run of items) {
    try {
      const text = (wrapTryCatch(() => run?.text) as string) || '';
      result.fullText += text;

      const startTimeValue = wrapTryCatch(
        () => run?.navigationEndpoint?.watchEndpoint?.startTimeSeconds
      ) as string | number | undefined;
      const startTimeSeconds = Number.parseInt(String(startTimeValue ?? ''), 10);

      if (!Number.isNaN(startTimeSeconds) && startTimeSeconds >= 0) {
        const linkVideoId = (wrapTryCatch(() => run?.navigationEndpoint?.watchEndpoint?.videoId) ||
          '') as string;

        if (
          options.currentVideoId &&
          String(linkVideoId || '') === String(options.currentVideoId || '')
        ) {
          result.hasTimelineLink = true;
        }
      }

      // Simplified richText generation - mostly just keeping text for now as we don't have HTML encoder ready
      // and downstream components might expect text.
      // Ideally we'd preserve the original structure for React components to render.
      result.richText += text;
    } catch (error) {
      console.error(error);
    }
  }

  return result;
}

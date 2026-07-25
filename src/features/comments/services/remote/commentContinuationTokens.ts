const safeGet = (fn: () => unknown) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export const extractSectionToken = (data: any): string | undefined => {
  try {
    const contents =
      (safeGet(
        () => data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
      ) as any[]) || [];

    return contents
      .map((content: any) =>
        safeGet(
          () =>
            content.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer
              ?.continuationEndpoint?.continuationCommand?.token
        )
      )
      .find((token): token is string => typeof token === 'string' && token.length > 0);
  } catch {
    return undefined;
  }
};

export const extractCommentsToken = (data: any, sortOrderIndex: number = 0): string | undefined => {
  try {
    const endpoints = (data?.onResponseReceivedEndpoints || []) as any[];

    for (const endpoint of endpoints) {
      const reloadContinuationItems = safeGet(
        () => endpoint.reloadContinuationItemsCommand?.continuationItems
      ) as any[] | undefined;
      const appendContinuationItems = safeGet(
        () => endpoint.appendContinuationItemsAction?.continuationItems
      ) as any[] | undefined;
      const items = reloadContinuationItems || appendContinuationItems || [];

      for (const item of items) {
        const subMenuItems = safeGet(
          () => item.commentsHeaderRenderer?.sortMenu?.sortFilterSubMenuRenderer?.subMenuItems
        ) as any[] | undefined;
        if (subMenuItems && subMenuItems[sortOrderIndex]) {
          const token = safeGet(
            () => subMenuItems[sortOrderIndex].serviceEndpoint?.continuationCommand?.token
          );
          if (token) {
            return token as string;
          }
        }
      }
    }

    const contents =
      (safeGet(
        () => data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
      ) as any[]) || [];

    return contents
      .map((content: any) =>
        safeGet(
          () =>
            content.itemSectionRenderer?.header?.[0]?.commentsHeaderRenderer?.sortMenu
              ?.sortFilterSubMenuRenderer?.subMenuItems?.[sortOrderIndex]?.serviceEndpoint
              ?.continuationCommand?.token
        )
      )
      .find((token): token is string => typeof token === 'string' && token.length > 0);
  } catch {
    return undefined;
  }
};

export const getContinuationTokenFromData = (
  data: any,
  _isFetchingReply: boolean = false
): string | null => {
  return extractSectionToken(data) || extractCommentsToken(data) || null;
};

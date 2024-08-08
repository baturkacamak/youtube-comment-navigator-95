export const getInitialContinuationToken = () => {
    return window?.ytInitialData?.continuationContents?.liveChatContinuation?.header?.liveChatHeaderRenderer?.viewSelector?.sortFilterSubMenuRenderer?.subMenuItems?.[1]?.continuation?.reloadContinuationData?.continuation || '';
}
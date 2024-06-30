import { fetchCommentsFromLocalIncrementally } from "./localFetch";
import { fetchCommentsFromRemote } from "./remoteFetch";
import { isLocalEnvironment } from "../../shared/utils/environmentVariables";

export const fetchCommentsIncrementally = async (
    onCommentFetched: (comment: any[]) => void,
    signal?: AbortSignal,
    byPassCache: boolean = false,
    continuationToken?: string
) => {
    if (isLocalEnvironment()) {
        await fetchCommentsFromLocalIncrementally(onCommentFetched, signal);
    } else {

        await fetchCommentsFromRemote(onCommentFetched, signal, byPassCache, continuationToken);
    }
};

import { fetchCommentsFromLocalIncrementally } from "./localFetch";
import { fetchCommentsFromRemote } from "./remoteFetch";
import { isLocalEnvironment } from "../../shared/utils/environmentVariables";

export const fetchCommentsIncrementally = async (
    onCommentFetched: (comment: any[]) => void,
    byPassCache: boolean = false,
    continuationToken?: string
) => {
    if (isLocalEnvironment()) {
        await fetchCommentsFromLocalIncrementally(onCommentFetched);
    } else {

        await fetchCommentsFromRemote(onCommentFetched, byPassCache, continuationToken);
    }
};

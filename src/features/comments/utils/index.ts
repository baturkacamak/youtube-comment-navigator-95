import {isLocalEnvironment} from "../../shared/utils/environmentVariables";
import {fetchCommentsFromRemote} from "../services/remoteFetch";
import {fetchCommentsIncrementally} from "../services/localFetch";


export const fetchAllComments = async (
    onCommentFetched: (comment: any) => void,
    signal?: AbortSignal
) => {
    if (isLocalEnvironment()) {
        await fetchCommentsIncrementally(onCommentFetched, signal);
    } else {
        await fetchCommentsFromRemote(onCommentFetched, signal);
    }
};
import {isLocalEnvironment} from "../../utils/environmentVariables";
import {fetchCommentsFromRemote} from "./remoteFetch";
import {fetchCommentsIncrementally} from "./localFetch";


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
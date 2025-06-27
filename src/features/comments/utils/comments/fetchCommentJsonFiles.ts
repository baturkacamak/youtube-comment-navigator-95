import httpService from "../../../shared/services/httpService";

async function fetchCommentJsonFiles(file: string) {
    const response = await httpService.get(file);
    return JSON.parse(response);
}

export default fetchCommentJsonFiles;
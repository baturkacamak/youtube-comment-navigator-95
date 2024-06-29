export const fetchCommentFiles = async (commentFiles: string[]) => {
    const fetchPromises = commentFiles.map(async (file) => {
        const response = await fetch(file);
        return response.json();
    });

    return Promise.all(fetchPromises);
};
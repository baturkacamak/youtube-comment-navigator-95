export const handleCopyToClipboard = (
    text: string,
    onSuccess: () => void,
    onError: (error: any) => void
) => {
    navigator.clipboard.writeText(text).then(onSuccess, onError);
};

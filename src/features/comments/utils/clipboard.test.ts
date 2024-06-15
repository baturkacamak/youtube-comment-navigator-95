import {handleCopyToClipboard} from "./clipboard";

describe('handleCopyToClipboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call onSuccess when text is copied successfully', async () => {
        const mockWriteText = jest.fn().mockResolvedValue(undefined);
        const onSuccess = jest.fn();
        const onError = jest.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });

        await handleCopyToClipboard('sample text', onSuccess, onError);

        expect(mockWriteText).toHaveBeenCalledWith('sample text');
        expect(onSuccess).toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it('should call onError when there is an error copying text', async () => {
        const error = new Error('Failed to copy');
        const mockWriteText = jest.fn().mockRejectedValue(error);
        const onSuccess = jest.fn();
        const onError = jest.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });

        await handleCopyToClipboard('sample text', onSuccess, onError);

        expect(mockWriteText).toHaveBeenCalledWith('sample text');
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(error);
    });
});

import {copyToClipboard} from "./copyToClipboard";

describe('handleCopyToClipboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call onSuccess when text is copied successfully', async () => {
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        const onSuccess = vi.fn();
        const onError = vi.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });

        await copyToClipboard('sample text', onSuccess, onError);

        expect(mockWriteText).toHaveBeenCalledWith('sample text');
        expect(onSuccess).toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it('should call onError when there is an error copying text', async () => {
        const error = new Error('Clipboard error');
        const mockWriteText = vi.fn().mockRejectedValue(error);
        const onSuccess = vi.fn();
        const onError = vi.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });

        await copyToClipboard('sample text', onSuccess, onError);

        expect(mockWriteText).toHaveBeenCalledWith('sample text');
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(error);
    });
});

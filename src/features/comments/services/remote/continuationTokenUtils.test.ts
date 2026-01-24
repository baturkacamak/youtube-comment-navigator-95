
import { extractReplyContinuationTokens } from './continuationTokenUtils';

describe('extractReplyContinuationTokens', () => {
    it('should extract token from nextContinuationData', () => {
        const mockItems: any[] = [{
            commentThreadRenderer: {
                replies: {
                    commentRepliesRenderer: {
                        continuations: [{
                            nextContinuationData: {
                                continuation: 'token_from_next_data'
                            }
                        }]
                    }
                }
            }
        }];
        
        const tokens = extractReplyContinuationTokens(mockItems);
        expect(tokens).toContain('token_from_next_data');
    });

    it('should extract token from contents continuationItemRenderer', () => {
        const mockItems: any[] = [{
            commentThreadRenderer: {
                replies: {
                    commentRepliesRenderer: {
                        contents: [{
                            continuationItemRenderer: {
                                continuationEndpoint: {
                                    continuationCommand: {
                                        token: 'token_from_contents'
                                    }
                                }
                            }
                        }]
                    }
                }
            }
        }];

        const tokens = extractReplyContinuationTokens(mockItems);
        expect(tokens).toContain('token_from_contents');
    });

    it('should extract token from top level continuationItemRenderer', () => {
        const mockItems: any[] = [{
            continuationItemRenderer: {
                button: {
                    buttonRenderer: {
                        command: {
                            continuationCommand: {
                                token: 'token_from_top_level'
                            }
                        }
                    }
                }
            }
        }];

        const tokens = extractReplyContinuationTokens(mockItems);
        expect(tokens).toContain('token_from_top_level');
    });
});

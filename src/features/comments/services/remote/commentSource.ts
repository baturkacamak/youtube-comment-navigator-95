type CommentSource = 'auto' | 'innertube' | 'dataApi' | unknown;

export const shouldUseDataApiForComments = (source: CommentSource): boolean => source === 'dataApi';

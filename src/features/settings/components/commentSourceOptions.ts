import { Option } from '../../../types/utilityTypes';

type Translate = (key: string) => string;
export type CommentSource = 'auto' | 'innertube' | 'dataApi';

export const getCommentSourceOptions = (t: Translate, canUseDataApi: boolean): Option[] => {
  return [
    { value: 'auto', label: t('Automatic (recommended)') },
    { value: 'innertube', label: t('YouTube direct') },
    {
      value: 'dataApi',
      label: t('YouTube Data API'),
      disabled: !canUseDataApi,
      disabledReason: !canUseDataApi
        ? t('Requires a YouTube Data API key in Settings.')
        : undefined,
    },
  ];
};

export const resolveSelectableCommentSource = (
  source: CommentSource,
  canUseDataApi: boolean
): CommentSource => {
  if (source === 'dataApi' && !canUseDataApi) {
    return 'auto';
  }

  return source;
};

import { normalizeString } from '../../shared/utils/normalizeString';

export const searchTranscripts = (transcripts: any[], keyword: string): any[] => {
  const normalizedKeyword = normalizeString(keyword);
  return transcripts.filter((entry: any) =>
    normalizeString(entry.text).includes(normalizedKeyword)
  );
};

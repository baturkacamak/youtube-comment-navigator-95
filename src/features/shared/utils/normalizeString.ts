export const normalizeString = (str: string): string => {
    return str
        .toLowerCase()
        .normalize('NFD') // Normalize the string into decomposed form
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
};

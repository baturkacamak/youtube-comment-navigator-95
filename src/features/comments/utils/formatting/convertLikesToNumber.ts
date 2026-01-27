// src/utils/convertToNumber.ts

const convertLikesToNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (value.includes('K')) {
    return parseFloat(value.replace('K', '')) * 1000;
  }
  if (value.includes('M')) {
    return parseFloat(value.replace('M', '')) * 1000000;
  }
  return parseFloat(value);
};

export default convertLikesToNumber;

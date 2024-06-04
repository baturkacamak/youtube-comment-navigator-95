export const baseColors = {
    donated: '#81C784', // Green
    hearted: '#F06292', // Pink
    member: '#BA68C8',  // Purple
    creator: '#64B5F6', // Blue
    defaultEven: '#80CBC4', // Teal
    defaultOdd: '#90CAF9' // Blue
};

const getBaseColor = (color: string) => {
    switch (color) {
        case baseColors.donated:
            return {
                bgColor: 'bg-gradient-to-r from-green-100 to-green-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-green-700 dark:to-green-900',
                borderColor: 'border-l-4 border-green-500',
                darkBorderColor: 'dark:border-green-500'
            };
        case baseColors.hearted:
            return {
                bgColor: 'bg-gradient-to-r from-pink-100 to-pink-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-pink-700 dark:to-pink-900',
                borderColor: 'border-l-4 border-pink-500',
                darkBorderColor: 'dark:border-pink-500'
            };
        case baseColors.member:
            return {
                bgColor: 'bg-gradient-to-r from-purple-100 to-purple-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-purple-700 dark:to-purple-900',
                borderColor: 'border-l-4 border-purple-500',
                darkBorderColor: 'dark:border-purple-500'
            };
        case baseColors.creator:
            return {
                bgColor: 'bg-gradient-to-r from-blue-100 to-blue-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-blue-700 dark:to-blue-900',
                borderColor: 'border-l-4 border-blue-500',
                darkBorderColor: 'dark:border-blue-500'
            };
        case baseColors.defaultEven:
            return {
                bgColor: 'bg-gradient-to-r from-teal-100 to-teal-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-gray-600 dark:to-gray-700',
                borderColor: 'border-2 border-gray-400',
                darkBorderColor: 'dark:border-gray-600'
            };
        case baseColors.defaultOdd:
            return {
                bgColor: 'bg-gradient-to-r from-blue-100 to-blue-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-800',
                borderColor: 'border-2 border-gray-400',
                darkBorderColor: 'dark:border-gray-600'
            };
        default:
            return {};
    }
};

export default getBaseColor;

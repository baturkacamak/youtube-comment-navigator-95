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
                bgColor: 'bg-gradient-to-r from-yellow-100 to-yellow-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-yellow-700 dark:to-yellow-900',
                borderColor: 'border-l-4 border-yellow-500',
                darkBorderColor: 'dark:border-yellow-500',
                textColor: 'text-gray-900',
                darkTextColor: 'dark:text-white'
            };
        case baseColors.hearted:
            return {
                bgColor: 'bg-gradient-to-r from-red-100 to-pink-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-red-700 dark:to-pink-900',
                borderColor: 'border-l-4 border-red-500',
                darkBorderColor: 'dark:border-red-500',
                textColor: 'text-gray-900',
                darkTextColor: 'dark:text-white'
            };
        case baseColors.member:
            return {
                bgColor: 'bg-gradient-to-r from-purple-100 to-lavender-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-purple-700 dark:to-indigo-900',
                borderColor: 'border-l-4 border-purple-500',
                darkBorderColor: 'dark:border-purple-500',
                textColor: 'text-gray-900',
                darkTextColor: 'dark:text-white'
            };
        case baseColors.creator:
            return {
                bgColor: 'bg-gradient-to-r from-teal-100 to-blue-300',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-blue-700 dark:to-teal-900',
                borderColor: 'border-l-4 border-blue-500',
                darkBorderColor: 'dark:border-blue-500',
                textColor: 'text-gray-900',
                darkTextColor: 'dark:text-white'
            };
// Inside the function where you set the colors
        case baseColors.defaultEven:
            return {
                bgColor: 'bg-gradient-to-r from-zinc-50 to-zinc-100',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-gray-900 dark:to-teal-900',
                borderColor: '',
                darkBorderColor: 'dark:border-teal-700',
                textColor: 'text-black',
                darkTextColor: 'dark:text-white'
            };
        case baseColors.defaultOdd:
            return {
                bgColor: 'bg-gradient-to-r from-stone-50 to-stone-100',
                darkBgColor: 'dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900',
                borderColor: '',
                darkBorderColor: 'dark:border-blue-700',
                textColor: 'text-black',
                darkTextColor: 'dark:text-white'
            };
        default:
            return {
                bgColor: 'bg-white',
                darkBgColor: 'dark:bg-gray-800',
                borderColor: 'border-gray-300',
                darkBorderColor: 'dark:border-gray-600',
                textColor: 'text-gray-900',
                darkTextColor: 'dark:text-white'
            };
    }
};

export default getBaseColor;

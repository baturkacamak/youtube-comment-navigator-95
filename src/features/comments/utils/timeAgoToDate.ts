const timeAgoToDate = (timeAgo: string): Date => {
    const now = new Date();
    const [value, unit] = timeAgo.split(' ');

    const numberValue = parseInt(value, 10);
    let date = new Date(now);

    switch (unit) {
        case 'second':
        case 'seconds':
            date.setSeconds(now.getSeconds() - numberValue);
            break;
        case 'minute':
        case 'minutes':
            date.setMinutes(now.getMinutes() - numberValue);
            break;
        case 'hour':
        case 'hours':
            date.setHours(now.getHours() - numberValue);
            break;
        case 'day':
        case 'days':
            date.setDate(now.getDate() - numberValue);
            break;
        case 'week':
        case 'weeks':
            date.setDate(now.getDate() - numberValue * 7);
            break;
        case 'month':
        case 'months':
            date.setMonth(now.getMonth() - numberValue);
            break;
        case 'year':
        case 'years':
            date.setFullYear(now.getFullYear() - numberValue);
            break;
        default:
            break;
    }

    return date;
};

export default timeAgoToDate;

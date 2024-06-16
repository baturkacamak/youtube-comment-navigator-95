import i18n from 'i18next';

const translateTimeAgo = (timeAgo: string): string => {
    const cleanTimeAgo = timeAgo.replace(/\(edited\)$/, '').trim();  // Remove the "(edited)" part if it exists
    const [value, ...unitArr] = cleanTimeAgo.split(' ');
    const unit = unitArr.slice(0, unitArr.length - 1).join(' ');
    const ago = unitArr[unitArr.length - 1];
    const format = i18n.t('timeUnits.format');

    return format
        .replace('{{value}}', value)
        .replace('{{unit}}', i18n.t(`timeUnits.${unit}`))
        .replace('{{ago}}', i18n.t(`timeUnits.${ago}`));
};

export default translateTimeAgo;

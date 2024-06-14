import blendColors from './blendColors';
import getBaseColor, { baseColors } from './getBaseColor';

import tinycolor from "tinycolor2";

import {Comment} from "../../../../types/commentTypes";

export const getCommentBackgroundColor = (comment: Comment, index: number) => {
    const colorsToBlend = [];

    // if (comment.isDonated) colorsToBlend.push(baseColors.donated);
    // if (comment.isHearted) colorsToBlend.push(baseColors.hearted);
    // if (comment.isMember) colorsToBlend.push(baseColors.member);
    // if (comment.isAuthorContentCreator) colorsToBlend.push(baseColors.creator);

    colorsToBlend.push(index % 2 === 0 ? baseColors.defaultEven : baseColors.defaultOdd);

    // If only one condition, use Tailwind classes
    if (colorsToBlend.length === 1) {
        return getBaseColor(colorsToBlend[0]);
    }

    // For multiple conditions, use inline styles with gradients
    const blendedColor = blendColors(colorsToBlend);
    return {
        bgColor: `linear-gradient(to right, ${tinycolor(blendedColor).lighten(20).toString()}, ${blendedColor})`,
        darkBgColor: `linear-gradient(to right, ${tinycolor(blendedColor).darken(20).toString()}, ${tinycolor(blendedColor).darken(40).toString()})`,
        borderColor: `4px solid ${tinycolor(blendedColor).darken(20).toString()}`,
        darkBorderColor: `4px solid ${tinycolor(blendedColor).darken(30).toString()}`
    };
};

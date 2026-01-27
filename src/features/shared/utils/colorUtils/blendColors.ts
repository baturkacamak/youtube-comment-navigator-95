import tinycolor from 'tinycolor2';

const blendColors = (colors: string[]) => {
  if (colors.length === 0) return tinycolor('#80CBC4').toString(); // Default to Teal if no colors

  let blendedColor = tinycolor(colors[0]);
  for (let i = 1; i < colors.length; i++) {
    blendedColor = tinycolor.mix(blendedColor, colors[i]);
  }
  return blendedColor.toString();
};

export default blendColors;

export const isFontAvailable = (fontName: string): boolean => {
  const baseFonts: string[] = ['monospace', 'sans-serif', 'serif'];
  const testString: string = 'mmmmmmmmmmlli';
  const defaultWidth: { [key: string]: number } = { /* no-op */ };
  const defaultHeight: { [key: string]: number } = { /* no-op */ };

  // Create a span element
  const testElement = document.createElement('span');
  testElement.style.fontSize = '72px';
  testElement.style.display = 'inline';
  testElement.style.position = 'absolute';
  testElement.style.left = '-9999px';
  testElement.innerHTML = testString;
  document.body.appendChild(testElement);

  // Get the default widths and heights for the base fonts
  for (const baseFont of baseFonts) {
    testElement.style.fontFamily = baseFont;
    defaultWidth[baseFont] = testElement.offsetWidth;
    defaultHeight[baseFont] = testElement.offsetHeight;
  }

  // Check if the font is available
  testElement.style.fontFamily = `${fontName},${baseFonts[0]}`;
  const width = testElement.offsetWidth;
  const height = testElement.offsetHeight;

  document.body.removeChild(testElement);

  // If the dimensions are different, the font is available
  return width !== defaultWidth[baseFonts[0]] || height !== defaultHeight[baseFonts[0]];
};

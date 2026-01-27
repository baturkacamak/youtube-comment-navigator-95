import React, { useEffect, useState } from 'react';
import SelectBox from '../shared/components/SelectBox/SelectBox';
import { Option } from '../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { setFontFamily } from '../../store/store';
import { getSettings, saveSettings } from '../settings/utils/settingsUtils';
import { isFontAvailable } from '../settings/utils/isFontAvailable';
import { AiOutlineFontSize } from 'react-icons/ai';

const fonts: Option[] = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Garamond, serif', label: 'Garamond' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Brush Script MT, cursive', label: 'Brush Script MT' },
  { value: 'Lucida Sans, sans-serif', label: 'Lucida Sans' },
  { value: 'Arial Black, sans-serif', label: 'Arial Black' },
  { value: 'Comic Sans MS, cursive, sans-serif', label: 'Comic Sans MS' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Lucida Bright, serif', label: 'Lucida Bright' },
  { value: 'Palatino, serif', label: 'Palatino' },
  { value: 'Geneva, sans-serif', label: 'Geneva' },
  { value: 'Optima, sans-serif', label: 'Optima' },
  { value: 'Candara, sans-serif', label: 'Candara' },
  { value: 'Charcoal, sans-serif', label: 'Charcoal' },
  { value: 'Lucida Console, monospace', label: 'Lucida Console' },
  { value: 'Monaco, monospace', label: 'Monaco' },
  { value: 'Bradley Hand, cursive', label: 'Bradley Hand' },
  { value: 'Chalkboard, sans-serif', label: 'Chalkboard' },
  { value: 'Copperplate, serif', label: 'Copperplate' },
  { value: 'Papyrus, cursive', label: 'Papyrus' },
  { value: 'Bookman, serif', label: 'Bookman' },
  { value: 'Rockwell, serif', label: 'Rockwell' },
  { value: 'Futura, sans-serif', label: 'Futura' },
  { value: 'Baskerville, serif', label: 'Baskerville' },
  { value: 'Goudy Old Style, serif', label: 'Goudy Old Style' },
  { value: 'Big Caslon, serif', label: 'Big Caslon' },
  { value: 'Bodoni MT, serif', label: 'Bodoni MT' },
  { value: 'Gill Sans, sans-serif', label: 'Gill Sans' },
  { value: 'Century Gothic, sans-serif', label: 'Century Gothic' },
  { value: 'Apple Chancery, cursive', label: 'Apple Chancery' },
  { value: 'Lucida Sans Typewriter, monospace', label: 'Lucida Sans Typewriter' },
  { value: 'Andale Mono, monospace', label: 'Andale Mono' },
  { value: 'Marker Felt, cursive', label: 'Marker Felt' },
  { value: 'Zapfino, cursive', label: 'Zapfino' },
  { value: 'New Century Schoolbook, serif', label: 'New Century Schoolbook' },
  { value: 'Didot, serif', label: 'Didot' },
  { value: 'American Typewriter, serif', label: 'American Typewriter' },
  { value: 'Noteworthy, cursive', label: 'Noteworthy' },
  { value: 'Comic Sans, cursive, sans-serif', label: 'Comic Sans' },
  { value: 'Lucida Grande, sans-serif', label: 'Lucida Grande' },
];

const FontSetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const getInitialFont = (): Option => {
    const settings = getSettings();
    const detectedFont = settings.fontFamily || 'Arial, sans-serif';
    return fonts.find((option) => option.value === detectedFont) || fonts[0];
  };

  const [selectedFont, setSelectedFont] = useState<Option>(getInitialFont);

  const applyFont = (fontFamily: string) => {
    const settings = getSettings();
    settings.fontFamily = fontFamily;
    saveSettings(settings);
    dispatch(setFontFamily(fontFamily));
  };

  useEffect(() => {
    applyFont(selectedFont.value);
  }, [selectedFont]);

  useEffect(() => {
    const settings = getSettings();
    applyFont(settings.fontFamily || selectedFont.value);
  }, []);

  const handleFontChange = (option: Option) => {
    setSelectedFont(option);
  };

  const availableFonts = fonts.filter((font) => isFontAvailable(font.value.split(',')[0]));

  return (
    <div className="inline-flex items-center gap-2 w-full justify-between">
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200 select-none">
        {t('Font')}
      </label>
      <SelectBox
        options={availableFonts}
        selectedOption={selectedFont}
        setSelectedOption={handleFontChange}
        buttonClassName="w-full rounded-lg"
        isSearchable={availableFonts.length >= 15}
        DefaultIcon={AiOutlineFontSize}
      />
    </div>
  );
};

export default FontSetting;

// src/hooks/useAnimation.ts

import { useState } from 'react';

const useAnimation = (duration: number = 1000) => {
  const [animatedOption, setAnimatedOption] = useState<string | null>(null);

  const triggerAnimation = (option: string) => {
    setAnimatedOption(option);
    setTimeout(() => setAnimatedOption(null), duration);
  };

  const getAnimationClass = (currentOption: string, animationClass: string) => {
    return animatedOption === currentOption ? animationClass : '';
  };

  return { animatedOption, triggerAnimation, getAnimationClass };
};

export default useAnimation;

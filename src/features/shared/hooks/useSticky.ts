import { useState, useEffect, RefObject } from 'react';

const useSticky = (ref: RefObject<HTMLDivElement | null>, trigger: boolean) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (trigger && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const isAboveMaxHeight = rect.height > 384; // 96 * 4 = 384px
      if (!isAboveMaxHeight) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    } else {
      setIsSticky(false);
    }
  }, [trigger, ref]);

  return isSticky;
};

export default useSticky;

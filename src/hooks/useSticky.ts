import { useState, useEffect, RefObject } from 'react';

const useSticky = (ref: RefObject<HTMLDivElement>, trigger: boolean) => {
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        if (trigger && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setIsSticky(true);
        } else {
            setIsSticky(false);
        }
    }, [trigger, ref]);

    return isSticky;
};

export default useSticky;

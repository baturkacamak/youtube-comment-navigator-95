import React, { useEffect } from 'react';

interface PerformanceWrapperProps {
    id: string;
}

const PerformanceWrapper: React.FC<React.PropsWithChildren<PerformanceWrapperProps>> = ({ id, children }) => {
    useEffect(() => {
        console.timeEnd(id);
    }, [id]);

    console.time(id);

    return <>{children}</>;
};

export default PerformanceWrapper;

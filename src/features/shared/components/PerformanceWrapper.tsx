import { useEffect } from 'react';

interface PerformanceWrapperProps {
  id: string;
}

export const PerformanceWrapper: React.FC<React.PropsWithChildren<PerformanceWrapperProps>> = ({
  id,
  children,
}) => {
  useEffect(() => {
    return () => {};
  }, [id]);

  return <>{children}</>;
};

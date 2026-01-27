import { useEffect } from 'react';
import logger from '../utils/logger';

interface PerformanceWrapperProps {
  id: string;
}

export const PerformanceWrapper: React.FC<React.PropsWithChildren<PerformanceWrapperProps>> = ({
  id,
  children,
}) => {
  useEffect(() => {
    logger.start(id);
    return () => {
      logger.end(id);
    };
  }, [id]);

  return <>{children}</>;
};

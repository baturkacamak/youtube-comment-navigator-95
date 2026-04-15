import { devToolsStore, DevLogLevel } from './devToolsStore';

export const devLog = (
  level: DevLogLevel,
  scope: string,
  message: string,
  data?: unknown
) => {
  devToolsStore.add({ level, scope, message, data });
};

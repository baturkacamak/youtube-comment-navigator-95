// src/utils/environmentVariables.ts
export const isLocalEnvironment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};
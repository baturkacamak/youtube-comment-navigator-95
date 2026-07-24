import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';

const withoutExtensionPlugins = (plugins: PluginOption[]): PluginOption[] =>
  plugins.flat(Infinity).filter((plugin) => {
    if (!plugin || typeof plugin !== 'object' || !('name' in plugin)) return Boolean(plugin);
    return !String(plugin.name).startsWith('crx:');
  });

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['../public'],
  viteFinal(config) {
    return {
      ...config,
      publicDir: false,
      plugins: withoutExtensionPlugins(config.plugins ?? []),
    };
  },
};

export default config;

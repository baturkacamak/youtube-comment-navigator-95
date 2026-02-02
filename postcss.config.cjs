const prefixSelector = require('postcss-prefix-selector');

module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    prefixSelector({
      prefix: '#youtube-comment-navigator-app',
      transform: function (prefix, selector, prefixedSelector, filePath, rule) {
        // Don't prefix selectors that already contain our app ID
        if (selector.includes('youtube-comment-navigator-app')) {
          return selector;
        }
        // Don't prefix @keyframes or animation names
        if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') {
          return selector;
        }
        // Transform :root, html, body to target our container
        if (selector === ':root' || selector === 'html' || selector === ':host') {
          return prefix;
        }
        if (selector === 'body') {
          return prefix;
        }
        // Handle ::backdrop specially (can't be scoped)
        if (selector === '::backdrop') {
          return selector;
        }
        // For universal selectors, scope them properly
        if (selector === '*' || selector === '*, ::before, ::after' || selector === '*::before' || selector === '*::after') {
          return selector.split(',').map(s => `${prefix} ${s.trim()}`).join(', ');
        }
        // Default: prefix the selector
        return prefixedSelector;
      },
    }),
    require('autoprefixer'),
  ],
};

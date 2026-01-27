# ADR 0001: Use Vite for Build System

## Status

Accepted

## Context

We needed a build system for a React-based Chrome extension that supports:

- Hot Module Replacement (HMR) for development
- TypeScript compilation
- CSS processing (TailwindCSS, SCSS, PostCSS)
- Chrome extension manifest v3 compatibility

## Decision

We chose Vite with the CRXJS plugin for the following reasons:

1. Fast development server with native ES modules
2. Excellent HMR support for React
3. CRXJS plugin handles Chrome extension specifics (manifest, content scripts, service workers)
4. Built-in TypeScript support
5. Simple configuration compared to Webpack

## Consequences

### Positive

- Significantly faster development builds
- Simplified configuration
- Native support for modern JavaScript features
- Active community and plugin ecosystem

### Negative

- CRXJS is still in beta (2.0.0-beta)
- Some edge cases with Chrome extension APIs may need workarounds

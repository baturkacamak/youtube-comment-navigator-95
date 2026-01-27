# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Performance:** Migrated storage backend to **IndexedDB** (using Dexie.js) for handling large datasets efficiently.
- **Performance:** Implemented **List Virtualization** (using `react-window` and `react-virtualized-auto-sizer`) to significantly improve rendering performance for comment lists.
- **Performance:** Added `PerformanceMonitor` utility to track and log key performance metrics (fetch time, processing time, memory usage).
- **Scripts:** Added `just bump` for automated version management.
- **Scripts:** Added `just package` for easy extension bundling.
- **Reliability:** Added batch accumulator for optimized database writes during high-volume fetching.

### Changed

- **Architecture:** Moved source of truth from Redux to IndexedDB. Redux is now used primarily for UI state and view buffering.
- **Refactor:** Updated `fetchAndProcessComments` to support batch processing and explicit reply fetching.

## [1.7.0] - 2025-01-27

### Added

- Enhanced CommentReplies component with dynamic height adjustment
- Unit tests for CommentItem component
- BookmarkButton and ShareButton component tests

### Changed

- Demoted info logs to debug level for replies fetching

### Fixed

- Updated reply count and added multiple replies to comments

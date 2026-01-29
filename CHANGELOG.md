# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.8.5] - 2026-01-29

### Fixed

- **Styles:** Used `postcss-prefix-selector` for scoped Tailwind preflight to prevent style leaks.
- **Player:** Restored timestamp seeking via main-world injection.
- **Store Sync:** Improved login handling and navigation retry logic for store description updates.

## [1.8.4] - 2026-01-29

### Added

- **Automation:** Implemented multi-language Chrome Web Store description automation.
- **Docs:** Updated README features list with new functionalities.

### Fixed

- **Styles:** Isolated styles to prevent leaking into the host page.
- **Scripts:** Included `package-lock.json` in version bump script.

## [1.8.3] - 2026-01-29

### Added

- **Transcripts:** Added SRT download support.

### Changed

- **UI:** Moved `DownloadAccordion` to `ControlPanel` for better accessibility.

### Fixed

- **Accessibility:** Hidden comment footer from screen readers to prevent unwanted selection.
- **Build:** Removed unused props in `AdvancedFilters` component.

## [1.8.2] - 2026-01-29

### Changed

- **Scripts:** Consolidated scripts and enhanced version bump script.
- **I18n:** Updated missing translations for 40 languages.

### Fixed

- **Tests:** Relaxed build verification tests and fixed extension settings tests.

## [1.8.1] - 2026-01-28

### Added

- **UI:** Implemented infinite scroll with loading indicator.
- **UI:** Unified download and export functionality with `DownloadAccordion`.
- **Tests:** Added extensive E2E test coverage (Playwright) and CI workflow.

### Changed

- **Performance:** Deferred content script initialization to video pages only.
- **Styles:** Modernized scrollbar design and set fixed font-size for app container.

### Fixed

- **I18n:** Stored translations in content script context to fix loading issues.
- **UI:** Restored spacing between comment items.

## [1.8.0] - 2026-01-27

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

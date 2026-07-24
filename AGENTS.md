# Repo Instructions

- Do not use `git commit --no-verify` as a workaround for failing hooks. Fix the hook or its command resolution first.
- In this repository, prefer local Node entrypoints such as `node node_modules/<pkg>/...` instead of relying on `node_modules/.bin`.
- Before committing, make sure the relevant local checks pass through the repo's normal scripts or hook commands.
- GitHub Actions installs private `@baturkacamak` packages with the
  `PACKAGES_READ_TOKEN` repository secret; keep that token out of files and logs.
- Commit messages must satisfy commitlint. Use conventional commit format such as `fix: ...`, `feat: ...`, or `chore: ...`.
- If a hook fails, fix the hook itself or the command path it uses. Do not bypass `pre-commit` or `commit-msg`.
- The staged-file hook runs ESLint, Prettier, and `vitest related` once for the combined TypeScript/JavaScript file set; do not split that test command into concurrent overlapping groups.
- For code changes, run the narrowest relevant test first, then run broader checks as needed.
- For extension/release-facing changes, the minimum verification set is:
  - `npm run build`
  - `npm run test:e2e:build-only`
  - any feature-specific unit or integration tests touched by the change
- For Playwright in this repo, prefer the repo scripts or local entrypoint:
  - `npm run test:e2e`
  - `node node_modules/@playwright/test/cli.js test <spec>`
  - Set `PLAYWRIGHT_HIDE_BROWSER=true` to run headed extension E2E tests with the browser window off-screen.
- Use `navigateToYouTubePage`, `navigateToYouTubeVideo`, or `reloadYouTubePage` from
  `tests/e2e/helpers/extension.ts` for every YouTube navigation in Playwright tests.
  These helpers centrally dismiss YouTube's cookie-consent modal before test actions continue;
  do not add per-spec consent-clicking logic.
- For Vitest in this repo, prefer:
  - `npm test`
  - `npm test -- --run <spec>`
- After changing UI translation keys or locale files, run `npm run check:translations`.
  It verifies source keys, locale parity, non-empty values, and interpolation placeholders.
- To create a Chrome Store upload artifact, use:
  - `./scripts/pack.sh`
  - or `just package`
- Packaging should happen only after the required verification passes.
- The generated release artifact is named `youtube-comment-navigator-95_v<version>.zip` at the repo root.
- Do not assume README instructions are fully up to date. Verify scripts and hook behavior from actual repo files first.
- If you modify release, build, lint, test, or hook behavior, update this file and any nearby developer docs in the same change.
- Private `@baturkacamak/extension-ai-*` dependencies are installed from GitHub Packages. Local installs require `NODE_AUTH_TOKEN` with `read:packages`; GitHub Actions must use its scoped `GITHUB_TOKEN` with `packages: read` and package Actions access granted to this repository.
- Keep `react-draggable` pinned to `4.5.0` until its newer component declaration works with this project's React/TypeScript build; a fresh install of the current `4.7.x` range fails the production typecheck.

## Extension Secrets

- Never store API keys, access tokens, OAuth credentials, or other secrets in page `localStorage`, `sessionStorage`, the DOM, Redux state, injected page scripts, logs, or extension bundles.
- Store user-provided secrets only in `chrome.storage.local` (or the Firefox equivalent) and access them only from the background service worker.
- Network calls requiring a secret must be made by the background service worker. Content/UI code may receive only non-sensitive status and result data.
- When replacing an insecure legacy setting, migrate it once to extension storage and remove it from page storage immediately; never expose it again for masking or display.

## Error Diagnostics

- Project-wide, every caught unexpected error that prevents an operation from
  completing must emit `logger.error` before it is converted to a user-facing
  message, rethrown, or handled by a fallback. Use `logger.warn` for expected,
  recoverable fallback conditions; do not log user cancellation or normal control
  flow as errors, and avoid repeating the same diagnostic without adding new
  layer-specific context.
- At external API, provider, storage, parsing, and runtime-message failure
  boundaries, add `logger.error` diagnostics with the operation, feature/provider,
  stable identifiers, HTTP status, error code, and safe response shape when
  available. Do not silently discard caught errors or replace them with a generic
  message before logging the underlying cause.
- Never include API keys, access tokens, prompts, generated/user content,
  authorization headers, cookies, or complete provider response bodies in logs.
  Log lengths, counts, IDs, status values, and top-level keys instead.

## UI Implementation

- Before creating UI controls or styles, inspect `src/features/shared/components/` and reuse the existing component that fits. Do not introduce raw inputs, buttons, selects, or duplicate styling when a shared component already provides the behavior.
- If the shared component does not support a required capability, extend it with tests instead of creating a parallel component.

## Reuse and Shared Behavior

- Before adding a utility, parser, formatter, validator, hook, event handler,
  controller, service abstraction, or regular expression for an existing domain
  concept, search the entire repository with `rg`. When the behavior could be
  useful across extensions, also inspect the relevant private
  `@baturkacamak/extension-ai-*` package before implementing it locally.
- If the same semantic behavior is used in two or more places, keep one source
  of truth in the smallest appropriate shared layer. Feature code should compose
  that shared behavior instead of copying its parsing, conversion, validation,
  side-effect, or error-handling logic.
- When introducing or extending shared behavior, migrate the existing call sites
  and remove obsolete duplicate helpers, callbacks, props, regular expressions,
  and direct low-level calls in the same change. Do not leave parallel old and
  new paths unless a documented compatibility boundary requires both.
- Before considering the change complete, run an `rg` audit for the low-level
  primitive being centralized (for example `seekTo`, timestamp regexes, direct
  storage access, provider calls, or runtime messages) and confirm that remaining
  occurrences are intentional boundary implementations.
- Keep project-specific orchestration in this repository. Move genuinely
  cross-project, framework-appropriate behavior into the corresponding private
  package rather than creating similar local implementations in multiple
  extensions.
- Add focused contract tests for shared utilities and at least one representative
  consumer or integration test proving that the shared path is actually used.
- Do not merge concepts merely because they share a name. Preserve separate
  abstractions when their semantics differ, such as video playback offsets versus
  database, log, or wall-clock timestamps.

## YouTube Internal Integration Changes

YouTube frequently changes undocumented page data, Innertube endpoints,
continuations, and client requirements. These rules apply to comments, replies,
live chat, transcripts, playlists, and metadata.

Before changing an integration:

1. Reproduce the problem in a real browser session. Test both direct page load
   and YouTube SPA navigation where relevant.
2. Capture evidence from the current page or network behavior. Verify the
   actual endpoint, request method, headers, request body, response status, and
   response schema before implementing.
3. Treat external projects, old code, documentation, and search results as
   hypotheses, not proof. Validate them against the current YouTube response.
4. Prefer the same request path and page context YouTube currently uses. When
   recreating an internal request, validate the minimum required headers,
   client context, credentials mode, and response shape.
5. Add safe diagnostics for failures: feature and video ID, request or endpoint
   name, HTTP status and response top-level keys, continuation or parser source
   path, and navigation mode (direct versus SPA). Never log cookies,
   authorization headers, API keys, or complete continuation tokens.
6. A fix is not complete until an E2E test proves the user-visible outcome:
   comments or replies appear in the list; live-chat messages appear in the
   list; transcript entries appear in the transcript UI; playlist or metadata
   UI reaches the expected populated state. A successful build or absence of an
   error alone is insufficient.
7. When an integration breaks after a YouTube change, first determine which
   layer changed: page-data source, request construction, response schema,
   parser, persistence, or UI update. Do not add timing retries or DOM
   fallbacks until the failing layer is evidenced.

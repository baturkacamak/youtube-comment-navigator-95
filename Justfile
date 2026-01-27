# Justfile for youtube-comment-navigator-95
# https://github.com/casey/just

# Default recipe - show available commands
default:
    @just --list

# Install dependencies
install:
    npm install

# Start development server with HMR
dev:
    npm run dev

# Run tests
test:
    npm run test

# Run tests with UI
test-ui:
    npm run test:ui

# Run linter
lint:
    npm run lint

# Run linter and fix issues
lint-fix:
    npm run lint:fix

# Format code with Prettier
format:
    npm run format

# Check formatting
format-check:
    npm run format:check

# Build for production
build:
    npm run build

# Preview production build
preview:
    npm run preview

# Clean build artifacts
clean:
    rm -rf dist coverage

# Run all checks (lint, format, test)
check: lint format-check test

# Prepare for commit (lint-fix, format, test)
pre-commit: lint-fix format test

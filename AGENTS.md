# Repo Instructions

- Do not use `git commit --no-verify` as a workaround for failing hooks. Fix the hook or its command resolution first.
- In this repository, prefer local Node entrypoints such as `node node_modules/<pkg>/...` instead of relying on `node_modules/.bin`.
- Before committing, make sure the relevant local checks pass through the repo's normal scripts or hook commands.

# Execution Plan: Fix Docker Build Credentials

- [x] `~/.docker/config.json`: Remove `credsStore` property to bypass failing credential helper.
- [ ] `backend/.dockerignore`: Create/Update to exclude `node_modules` and temp files.
- [ ] `frontend/.dockerignore`: Create/Update to exclude `node_modules` and temp files.
- [ ] Terminal: Retry `docker compose up -d --build` to verify fix.

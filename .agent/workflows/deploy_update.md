---
description: Deploy updates with mandatory version bump to ensure Netlify detection
---

1. Check current version in `package.json`.
2. Increment the version number (patch for bugfixes, minor for features).
3. Update `package.json` with the new version.
4. Run `git add .`
5. Run `git commit -m "v[NEW_VERSION]: [Description of changes]"`
6. Run `git push origin main`
7. Notify user of the new version number.

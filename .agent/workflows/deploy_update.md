---
description: Deploy updates with mandatory version bump to ensure Netlify detection
---

1. Read `package.json` to identify the current version.
2. Increment the patch version (e.g., 0.1.0 -> 0.1.1) in `package.json`.
3. Verify the build to ensure stability.
   `npm run build`
4. Stage all changes.
   `git add .`
5. Commit with the new version number.
   `git commit -m "chore: bump version and deploy"`
6. Push to remote.
   `git push`

Cloning committed branch: TimurHaryo/s01-t013
Cloning into '/tmp/s01-checks/readme-clone'...
done.
git clone exit=0

$ pnpm install
Scope: all 3 workspace projects
✓ Lockfile passes supply-chain policies (verified 2d ago)
Lockfile is up to date, resolution step is skipped
Update available! 12.15.0 → 12.16.1.
Changelog: https://pnpm.io/v/12.16.1
To update, run: curl -fsSL https://get.pnpm.io/install.sh | sh -
Packages are cloned from the content-addressable store to the virtual store.
  Content-addressable store is at: /Users/murphy/Library/pnpm/store/v11
  Virtual store is at:             node_modules/.pnpm
Packages: +362
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 362, reused 362, downloaded 0, added 362, done
.../node_modules/unrs-resolver postinstall$ node postinstall.js
.../node_modules/unrs-resolver postinstall: Done

devDependencies:
+ prettier 3.9.10
+ typescript 5.9.3

Done in 531ms using pnpm v12.15.0
exit=0

$ pnpm dev
localhost:3123 contains "Portfolio Teardown"
exit=0

$ pnpm build
$ pnpm -r --if-present build
$ next build
▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 14ms

  Creating an optimized production build ...
✓ Compiled successfully in 817ms
  Running TypeScript ...
  Finished TypeScript in 641ms ...
  Collecting page data using 4 workers ...
  Generating static pages using 4 workers (0/3) ...
✓ Generating static pages using 4 workers (3/3) in 167ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found


○  (Static)  prerendered as static content

exit=0

$ pnpm typecheck
$ pnpm -r --if-present typecheck
$ tsc --noEmit
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
exit=0

$ pnpm lint
$ pnpm -r --if-present lint && pnpm format:check
$ eslint .
$ eslint .
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
exit=0

$ pnpm format
$ prettier --write .
.github/workflows/ci.yml 7ms (unchanged)
.prettierrc 6ms (unchanged)
apps/web/app/globals.css 9ms (unchanged)
apps/web/app/layout.tsx 15ms (unchanged)
apps/web/app/motion.ts 2ms (unchanged)
apps/web/app/page.tsx 3ms (unchanged)
apps/web/app/theme-script.ts 0ms (unchanged)
apps/web/app/theme-toggle.tsx 7ms (unchanged)
apps/web/eslint.config.mjs 2ms (unchanged)
apps/web/next.config.ts 1ms (unchanged)
apps/web/package.json 1ms (unchanged)
apps/web/postcss.config.mjs 1ms (unchanged)
apps/web/tsconfig.json 1ms (unchanged)
package.json 0ms (unchanged)
packages/xploder/eslint.config.mjs 1ms (unchanged)
packages/xploder/package.json 0ms (unchanged)
packages/xploder/src/index.ts 1ms (unchanged)
packages/xploder/src/motion/index.ts 2ms (unchanged)
packages/xploder/tsconfig.json 0ms (unchanged)
pnpm-workspace.yaml 1ms (unchanged)
README.md 10ms (unchanged)
tsconfig.base.json 0ms (unchanged)
exit=0
format clean-tree check exit=0
README-OK

# AGENTS.md

Guidance for OpenCode sessions working in `turbest` — a Scratch mod forked from TurboWarp with security restrictions removed. Project code lives in `src/`; everything under `build/`, `dist/`, `translations/`, and `src/generated/` is build output (gitignored, do not edit by hand).

## Environment

- Node `v24` (see `.nvmrc`). `npm` is pinned to legacy peer deps via `.npmrc` (`legacy-peer-deps=true`). Do not change this without a reason; the locked dep tree (React 16, webpack 4, Babel 7, ESLint 8) needs it.
- Always use `npm ci` for clean installs, not `npm install`.

## Install / build commands

- `npm ci` — installs deps and runs the `postinstall` hook.
- `npm run build` — production build. Output is `build/` (static site) and `dist/` (UMD library, only when `NODE_ENV=production` or `BUILD_MODE=dist`).
- `npm start` — webpack-dev-server on port `8601`, preconfigured with `ROOT=/ ROUTING_STYLE=wildcard` and `historyApiFallback` rewrites for clean URLs.
- The `prebuild` / `prestart` / `postinstall` hooks run `scripts/apply-scratch-paint-lasso.mjs`, which mutates `node_modules/scratch-vm` and `node_modules/scratch-render` in place. Edits to those packages will be wiped on the next install or build.
- `npm run prepublish` (only relevant when publishing) downloads microbit hex files via `scripts/prepublish.mjs`.

### Environment variables that actually matter

- `ROOT` — path prefix for all emitted asset URLs. Must end with `/` if set (`webpack.config.js:18` enforces this). Default `''`.
- `ROUTING_STYLE` — `wildcard` for clean-URL SPA mode (`/123/editor`), `filehash` (default) for `.htm` routes. Mixing the two at runtime breaks navigation; rebuild with the right value to switch.
- `STATIC_PATH` — only used by the UMD `dist/` output.
- `NODE_ENV`, `SOURCEMAP`, `EXTRA_META`, `ENABLE_SERVICE_WORKER`, `ENABLE_WINDCHIMES`, `BUILD_MODE` — wired through `DefinePlugin`.
- `USE_HEADLESS=no` — disable headless Chrome for Selenium integration tests.
- `CI` — set to suppress the webpack `ProgressPlugin` and is checked in scripts.

### Cloudflare Pages deploy

Build command and output dir are documented in `README.md`. The `static/_redirects` file (copied to `build/_redirects` on build) handles SPA routing. `functions/_middleware.js` is a Cloudflare Pages Function that 308-redirects legacy `unsand.*` hosts to `turbest.*`.

## Testing

`npm test` runs in fixed order: `lint -> unit -> build -> integration`. Each step is also a standalone script.

- `npm run test:lint` — `eslint . --ext .js,.jsx`. ESLint config extends `scratch`/`scratch/node`/`scratch/es6`. The `.eslintignore` deliberately skips `src/addons/addons`, `src/addons/libraries`, `src/addons/api-libraries`, and `src/addons/generated` (vendored).
- `npm run test:unit` — runs **only** `test/unit/addons`. The other dirs under `test/unit/` (`components`, `containers`, `reducers`, `util`) are not covered by any script. To run a single Jest file: `npx jest path/to/file.test.js`.
- `npm run test:integration` — Selenium + chromedriver tests, reads from `build/*.html` (`path.resolve(__dirname, '../../build/index.html')` etc.), so the project **must be built first**. `jest --maxWorkers=4`.
- `npm run test:smoke` — `jest --runInBand test/smoke` (single-worker browser smoke test).

Integration test quirks:

- Uses `selenium-webdriver` + `chromedriver` (locked to `117.0.3`). Not Playwright/Puppeteer.
- `test/helpers/selenium-helper.js` is the wrapper. `loadUri` opens `file://` URLs against `build/`.
- Default timeout is 20s; whole `jest` timeout is 30s.
- Headless Chrome is the default. `USE_HEADLESS=no` for headed.
- `npx jest --listTests test/integration` lists them; filter with `-t "name"` for a single case.

## Source layout

- `src/playground/*` — browser entry points: `editor.jsx`, `player.jsx`, `fullscreen.jsx`, `embed.jsx`, `addon-settings.jsx`, `credits/`. Each becomes its own `*-page.htm` via `HtmlWebpackPlugin`.
- `src/index.js` — UMD library entry (compiled only with `NODE_ENV=production` or `BUILD_MODE=dist`). Exports `GUI`, `AppStateHOC`, reducers, initializers.
- `src/containers/` — top-level React containers (e.g. `gui.jsx`, `blocks.jsx`).
- `src/components/` — reusable React components. Subfolders by feature (`menu-bar/`, `blocks/`, `paint-editor/`, `tw-settings-modal/`, etc.).
- `src/reducers/` — Redux reducers. `gui.js` is the root.
- `src/lib/` — utilities and TurboWarp-specific extensions (`tw-*`). Notable: `tw-state-manager-hoc.jsx` (owns `routingStyle`), `tw-persisted-unsandboxed.js`, `tw-scratch-paint.js`, `tw-scratch-render-fonts/`.
- `src/addons/` — vendored addon system from ScratchAddons. See `src/addons/README.md`; `pull.js` regenerates most of `addons/`, `addons-l10n/`, `libraries/`, `generated/`. Edit upstream ScratchAddons first; patches live at https://github.com/TurboWarp/addons.
- `src/css/`, `src/examples/extensions/` — static assets and example extension sources. The `extensions` dir is copied into `build/static/extensions` at build time.

## Code conventions worth noting

- Plain JS + JSX, no TypeScript. No `npm run typecheck` step exists.
- No Prettier; formatting comes from `.editorconfig` (4-space indent, LF, UTF-8) and ESLint.
- CSS Modules are enabled (`css-loader` with `modules: true`); class names are `[name]_[local]_[hash:base64:5]`.
- Babel config is overridden per-file in webpack (`babelrc: false`) so a stray `.babelrc` in a deep dep cannot break the build.
- Webpack module resolution: `text-encoding$` and `scratch-render-fonts$` are aliased to local files in `src/lib/`. Don't rely on the npm packages directly.
- SVG handling: `scripts/turbest-paint-svg-loader.js` runs only against `node_modules/scratch-paint/src`.
- Branding lives in `src/lib/brand.js` (`APP_NAME: 'turbest'`). Static brand assets (favicon, manifest, icons) live in `static/`.
- Webpack cache epoch `CACHE_EPOCH = 'turbest-20260725'` in `webpack.config.js:29` — bump it when shipping a release that must invalidate all JS caches.

## Lint / typecheck / format

- Lint: `npm run test:lint` (or `npx eslint . --ext .js,.jsx`).
- No typecheck.
- No formatter; only `.editorconfig` for whitespace. Match the surrounding file style.

## Things that will silently surprise you

- `npm run test` rebuilds the project. If you only wanted to run Jest, use `npm run test:unit` (and note it is scoped to `test/unit/addons/`).
- Integration tests reference `build/index.html`, `build/player.html`, etc. — but the build emits `index-page.htm` / `editor-page.htm` (renamed from `*.html` to bypass Cloudflare's pretty-URL auto-strip). Tests are currently broken until paths are updated; if you fix them, point at the actual emitted filenames (e.g. `build/editor-page.htm`). The Selenium helper just calls `loadUri(uri)` with whatever path the test passes in.
- The `postinstall` patcher reverts manual edits to `node_modules/scratch-vm` and `node_modules/scratch-render` on every `npm ci`. If you need to keep a change there, modify `scripts/apply-scratch-paint-lasso.mjs` (or the `patches/scratch-paint-lasso.patch` it consumes) instead.
- `src/addons/addons`, `src/addons/libraries`, `src/addons/api-libraries`, `src/addons/generated` are ESLint-skipped AND largely regenerated by `pull.js`. Avoid hand-editing them; send fixes upstream to ScratchAddons or TurboWarp/addons.
- Switching `ROUTING_STYLE` between `wildcard` and `filehash` requires a rebuild — both the build-time `DefinePlugin` value and the runtime `process.env.ROUTING_STYLE` branch in `src/lib/tw-navigation-utils.js` are baked at build.
- `legacy-peer-deps=true` in `.npmrc` is load-bearing; removing it will fail on the React 16 / react-intl 2 / enzyme 3 dep tree.

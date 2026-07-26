# turbest

turbest is a Scratch mod based on TurboWarp with major security restrictions removed. Extensions always load unsandboxed and security confirmation dialogs are disabled.

## Setup

See https://docs.turbowarp.org/development/getting-started to setup the complete environment.

## Build

```bash
npm ci
npm run build
```

The output will be in the `build` folder.

For production deployments:

```bash
NODE_ENV=production npm run build
```

## Deploy to Cloudflare Pages

Build with wildcard routing enabled (routes like `https://site.example/123/editor`):

```bash
NODE_ENV=production ROOT=/ ROUTING_STYLE=wildcard npm run build
```

- **Build output directory:** `build/`
- **Build command:** `npm ci && NODE_ENV=production ROOT=/ ROUTING_STYLE=wildcard npm run build`

> **Important:** Do not prefix `NODE_ENV=production` onto the build command itself or export it
> before `npm ci`. With `NODE_ENV=production` in scope during install, npm skips `devDependencies`
> (webpack, webpack-cli, babel-loader, etc.), and the subsequent webpack run then breaks on
> `node_modules/scratch-paint/src/containers/paint-editor.jsx` with a spurious `Unexpected keyword 'this'`
> syntax error reported against line 104. Splitting install from build avoids the problem.

The `build/_redirects` file (copied from `static/_redirects`) handles SPA-style routing for Cloudflare Pages.

## License

turbest's modifications are licensed under the GNU General Public License v3.0. See LICENSE or https://www.gnu.org/licenses/ for details.

Scratch is a project of the Scratch Foundation. turbest is not affiliated with Scratch, the Scratch Team, or the Scratch Foundation.

# Releasing to npm

Publishing uses [osd-paperjs-annotation](https://github.com/pearcetm/osd-paperjs-annotation)’s model: a **GitHub Release** triggers [`.github/workflows/publish-to-npm.yaml`](../.github/workflows/publish-to-npm.yaml), which runs `npm publish --provenance --access public` with **npm trusted publishing** (OIDC). No `NPM_TOKEN` secret is required after trusted publishing is configured.

## Each release

1. Bump `version` in [`package.json`](../package.json).
2. Commit and push to `main` or `master` — [CI](../.github/workflows/ci.yml) runs `npm ci` and `npm run build` on pushes and pull requests.
3. On GitHub: **Releases → Draft a new release** → tag `vX.Y.Z` matching that version (for example `v1.0.1` for `1.0.1`) → **Publish release**.
4. The **Publish Package to npmjs** workflow publishes to npm (with provenance when trusted publishing is enabled).

Pushing a `v*` tag alone does **not** publish; create the GitHub Release.

The first public release (`1.0.0`) was published manually; subsequent releases use the workflow above.

## Trusted publishing (one-time)

1. On [npmjs.com](https://www.npmjs.com/): **Packages → osdplus → Settings → Trusted publishing**.
2. Provider: **GitHub Actions**.
3. Repository: `pearcetm/OSDPlus` (must match `repository.url` in `package.json`, case-sensitive).
4. Workflow filename: `publish-to-npm.yaml`.
5. Save.

Optional: **Publishing access → Require 2FA and disallow tokens** (the trusted publisher still works).

Requires npm CLI 11.5.1+ and Node 22.14+ on the publish runner (the workflow uses Node 22.x and runs `npm install -g npm` before publish).

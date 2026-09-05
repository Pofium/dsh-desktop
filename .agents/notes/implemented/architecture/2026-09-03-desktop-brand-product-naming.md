# Agent Note: Desktop brand shows the product name and completes the Russian locale

Status: implemented

## Problem

The desktop web client branded the sidebar with `DSH Local Build` plus a rendered build-version badge (`version-commit[-dirty]`), in every shipped locale. The label described how the artifact was built, not which product the user opened, and the badge exposed build metadata in the primary brand row.

The Russian locale was also only half-landed: every client package carried a `ru` dictionary in its `locales.ts`, but thirty packages still registered `{ zh, en }` — `ui-permission-presets` had no Russian popup-gate copy at all — so a browser preferring Russian silently fell back to English for those namespaces. The locale tests still pinned a two-locale world. Separately, the branch shipped a stale `pnpm-lock.yaml`, six packages whose names do not match their directories had no source-plane alias, and the whole-repository `tsc -b` faces carry pre-existing errors, so `pnpm run build` had never produced a fresh client set from this tree.

## Decision

**The sidebar brand row renders the product name only.** The common-namespace key `brand.localBuild` is renamed to `brand.product`, and every shipped dictionary (zh, en, ru) answers `DeepSeek Harness`. The build-configured `DSH_CLIENT_TITLE` override keeps precedence over the dictionary fallback in `AppFrame` and `DocumentTitle`, so official builds keep the DeepSeek wordmark path unchanged. `SidebarRoot` drops `localBuildVersion()` and the badge span and CSS; `DSH_CLIENT_VERSION`, `DSH_CLIENT_COMMIT_HASH`, and `DSH_CLIENT_GIT_DIRTY` remain embedded in the client build record for diagnostics but no client surface projects them into the UI.

**Every client package registers its `ru` dictionary.** The thirty `{ zh, en }` registration maps gain `ru`; `ui-permission-presets` gains `accessRu` and a matching `ACCESS_NS` registration for the popup gate. The locale-runtime tests pin the shipped list `['zh', 'en', 'ru']` and the Language row includes Русский. A key named `localBuild` holding the product name would mislead the next dictionary editor, so the rename covers the three dictionaries, the two render sites, and their specs.

**The client bundle preset locates the repository root by walking up to `pnpm-workspace.yaml`** instead of a fixed relative URL: the helper moved under `packages/client/` on this branch while config-loader bundling moves `import.meta.url` again, so `workspaceManifest` resolved a nonexistent `packages/*/*/package.json` glob base and every client-face build failed before emitting.

**Source-plane aliases and the lockfile are part of the fix.** `pnpm-lock.yaml` is regenerated against the branch manifests, and `tsconfig.base.json` gains the hand-written aliases for the six name≠directory packages (`dsh-client-runtime`, `dsh-client-ui-schedule`, `dsh-host-apiproxy`, `dsh-sdk-jsonrpc-demo`, `dsh-util-time`, `dsh-util-values`), so `gen-tsconfig-paths --check` holds and vitest resolves `@deepseek-ai/dsh-deque` through the generated region.

**Rebuild shape.** The whole-repository `tsc -b` faces still fail on pre-existing errors owned by earlier commits (host face concentrated in `host/apiproxy` and `core/tools`, client face in `client/runtime`), so the client bundles here were rebuilt package-by-package — standalone `tsc -p` emit followed by the package's tsdown client face — which compiles each package's own sources against the installed dependency types without dragging in the broken faces. `ui-renderer` keeps its installed bundle: its sources carry pre-existing drift against built `ui-slots` types, and the brand title reaches the browser through `AppFrame`'s `productTitle` prop, so rebuilding it adds risk without user-visible effect.

## Verification

Focused Vitest suites for `client-locale`, `ui-sidebar`, `ui-layout`, and `ui-renderer` pass (251 tests), including the three-locale list and the single-span brand-row snapshot. Per-package rebuilds report their own `tsc` error counts; the runtime smoke test is the shipped desktop exe booting with the Russian UI and the `DeepSeek Harness` brand. `gen-tsconfig-paths --check` reports the alias table current.

## Alternatives considered

**Keep the key and change only the value.** Rejected: `brand.localBuild: 'DeepSeek Harness'` reads as a contradiction at every future edit site for one line of saved churn.

**Render the badge only in non-official profiles.** Rejected: the badge's information (exact version and commit) belongs to the build record and support flows, not to space the brand row borrows from session navigation.

**Fix the whole-repository `tsc -b` faces first.** Rejected for this change: the errors predate it, concentrate in packages with no client-visible role here, and fixing them is a review-worthy series on its own rather than a rider on a branding change.

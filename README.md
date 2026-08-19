# ui-conversation-indexed

English | [中文](README.zh.md)

An independent, unofficial fork of DeepSeek Harness's `ui-conversation` package. It preserves the original conversation surface and adds a responsive conversation index for navigating turns and rendered Markdown headings.

- Package: `@aihesa/ui-conversation-indexed`
- Author of modifications: [AiHeSa](https://github.com/AiHeSa)
- Upstream: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- Upstream package: `packages/client/ui-conversation`
- Base revision: `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`
- License: [MIT](LICENSE)

This project is not affiliated with or endorsed by DeepSeek.

## What changed

### Responsive conversation index

When the conversation container is at least `920px` wide, a `224px` sticky index appears on the right. The transcript contracts first to make room; when the readable width is no longer available, the index hides and the transcript returns to a single full-width column.

The index provides:

- one minimal card for every currently loaded turn;
- a compact title derived from the turn-opening user message, limited to 80 characters;
- a localized turn-number fallback when the opening message is outside the loaded window;
- nested links for rendered Assistant Markdown `H1`, `H2`, and `H3` headings;
- smooth scrolling to a selected turn or heading;
- reduced-motion support through `prefers-reduced-motion`;
- a short visual marker on the destination after navigation;
- automatic refresh while an answer streams or earlier history is prepended;
- an independently scrollable index with its scrollbar visually hidden.

The index reads the existing rendered DOM instead of parsing Markdown again. This keeps GFM, math, streaming, and future Markdown behavior under the original renderer.

### Cache-hit percentage formatting

The cache-hit percentage is displayed with exactly two decimal places and is truncated downward rather than rounded:

- `90%` becomes `90.00%`;
- `1 / 3` becomes `33.33%`;
- `2 / 3` becomes `66.66%`.

Integer arithmetic with `BigInt` is used to avoid floating-point rounding drift.

### What was not changed

The original conversation behavior remains intact, including the conversation skeleton, chat rows, composer, queue, approval UI, details shell, session statistics, tool slots, plugin slots, streaming behavior, paging, and conversation controller.

The index does not:

- index history that has not been loaded into the page;
- include `H4` through `H6` headings;
- add search or persisted index preferences;
- replace the application-level Tool details panel;
- add any remote service or server-side behavior.

## Important compatibility model

This repository is a DeepSeek Harness workspace package, not a standalone application. It is intended to be checked out under `packages/client/ui-conversation-indexed` in a compatible DeepSeek Harness source tree.

The source package has its own identity, `@aihesa/ui-conversation-indexed`, but its browser bundle deliberately registers under the established runtime module id:

```text
@deepseek-ai/dsh-client-ui-conversation
```

That compatibility identity is required because existing Harness plugins depend on the original conversation module id. The Web bundle therefore aliases the original dependency to this replacement package. Only one conversation implementation must be mounted at a time.

## Requirements

- a compatible checkout of DeepSeek Harness;
- Node.js and Corepack as required by that checkout;
- the pnpm version pinned by the upstream root `package.json`;
- the package checked out at `packages/client/ui-conversation-indexed`.

This fork was prepared against DeepSeek Harness revision `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`. Upstream is in developer preview and may introduce breaking changes.

## Installation

Run the following from a fresh DeepSeek Harness checkout.

### 1. Add this repository

Using a Git submodule is recommended:

```bash
git submodule add https://github.com/AiHeSa/ui-conversation-indexed.git packages/client/ui-conversation-indexed
```

Alternatively, clone it directly:

```bash
git clone https://github.com/AiHeSa/ui-conversation-indexed.git packages/client/ui-conversation-indexed
```

### 2. Register the workspace package

Add the TypeScript path to `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@aihesa/ui-conversation-indexed": [
        "./packages/client/ui-conversation-indexed/src"
      ],
      "@aihesa/ui-conversation-indexed/*": [
        "./packages/client/ui-conversation-indexed/src/*"
      ]
    }
  }
}
```

Add the project reference to `tsconfig.client.json`:

```json
{
  "references": [
    { "path": "./packages/client/ui-conversation-indexed" }
  ]
}
```

In `packages/bundle/web-app/package.json`, replace the original conversation dependency with a workspace alias:

```json
{
  "dependencies": {
    "@deepseek-ai/dsh-client-ui-conversation": "workspace:@aihesa/ui-conversation-indexed@^"
  }
}
```

Keep the existing `ui-conversation` Loader row unchanged:

```yaml
- id: ui-conversation
  name: '@deepseek-ai/dsh-client-ui-conversation'
```

The alias supplies this fork at that established module id. Do not add a second conversation Loader row.

### 3. Install and build

From the DeepSeek Harness repository root:

```bash
corepack pnpm install
corepack pnpm exec tsc -b packages/client/ui-conversation-indexed/tsconfig.json --force
corepack pnpm --filter @aihesa/ui-conversation-indexed run bundle
corepack pnpm run build:web
```

### 4. Start the Web UI

```bash
corepack pnpm dsh web
```

Open [http://127.0.0.1:3080/](http://127.0.0.1:3080/). On a sufficiently wide conversation, the index appears automatically on the right.

## Usage

1. Open or create a conversation.
2. Add multiple turns or load an existing conversation.
3. Use `#`, `##`, or `###` headings in Assistant Markdown output.
4. Widen the conversation area until it reaches the responsive threshold.
5. Select a turn card to locate that turn, or select a heading to locate the rendered section.
6. Narrow the window or open a competing details panel; the index hides automatically when there is no longer enough readable width.

No setting, database migration, API change, or remote configuration is required.

## Development and verification

Commands are run from the parent DeepSeek Harness repository root.

```bash
# Type-check this package
corepack pnpm exec tsc -p packages/client/ui-conversation-indexed/tsconfig.json --noEmit

# Run the package tests
corepack pnpm exec vitest run packages/client/ui-conversation-indexed/tests

# Build the browser plugin
corepack pnpm --filter @aihesa/ui-conversation-indexed run bundle
```

The focused index tests cover turn cards, `H1`–`H3` nesting, `H4` exclusion, click navigation, responsive visibility, and destination marking.

## Updating from upstream

The package began as a complete copy of upstream `packages/client/ui-conversation`. To update it:

1. record the new upstream revision;
2. compare upstream `ui-conversation` against this package;
3. carry upstream fixes into the copied implementation;
4. preserve `ConversationIndex.tsx`, its CSS module, index-related attributes, locales, responsive layout, and tests;
5. run the package tests, client type-check, bundle build, and Web end-to-end test;
6. update the base revision documented above.

## License and attribution

This project is distributed under the MIT License. It contains code derived from DeepSeek Harness:

- original code copyright: `Copyright (c) 2026 DeepSeek`;
- modifications copyright: `Copyright (c) 2026 AiHeSa`.

See [LICENSE](LICENSE) for the full license and [NOTICE.md](NOTICE.md) for attribution and the non-affiliation statement. Third-party dependencies remain subject to their own licenses.

## Model Experience

None, as this package renders existing session history in the browser and does not assemble or send model requests.

#### KV Cache effect

None. The conversation index and cache-hit display do not change provider request content or prompt caching behavior.

## Known Limitations and Deferred Work

- Only history already loaded into the transcript is indexed.
- Only rendered Assistant `H1`, `H2`, and `H3` headings are included.
- The package depends on the surrounding DeepSeek Harness workspace and is not a standalone application or independently installable npm plugin yet.
- Compatibility is pinned to the documented upstream base revision; later Harness revisions may require a manual merge.
- The responsive threshold and index width are currently compile-time CSS values rather than user settings.

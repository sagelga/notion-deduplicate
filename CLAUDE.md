# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Local dev server (Next.js)
npm run build        # Standard Next.js build
npm run lint         # ESLint
npm run pages:build  # Build for Cloudflare Pages (via @cloudflare/next-on-pages)
npm run pages:deploy # Build + deploy to Cloudflare Pages via wrangler
```

There are no tests in this project.

## Important: Next.js on Cloudflare Pages

This is **not standard Next.js**. It runs on Cloudflare Pages via `@cloudflare/next-on-pages`, which adapts Next.js for the Cloudflare Workers edge runtime. Key constraints:

- Every route that uses `cookies()`, `fetch`, or other async APIs **must** declare `export const runtime = 'edge'`
- No Node.js APIs — only Web-standard APIs (fetch, ReadableStream, TextEncoder, etc.)
- No filesystem access at runtime
- Before writing any route or middleware, read `node_modules/next/dist/docs/` for current API behavior — this version may differ from training data

## Architecture

### Auth flow

The user pastes a Notion **integration token** (`secret_...`) into `SetupForm`, which POSTs to `/api/setup`. The token is stored as an `httpOnly` cookie `notion_token`. All API routes read this cookie directly — there is no session layer.

An optional OAuth flow exists (`/api/auth` → `/api/auth/callback`) but is secondary; the token-paste flow is the primary path.

### Core data library: `src/lib/notion.ts`

All Notion API calls go through this file. Key exports:
- `paginateDatabase(databaseId, token)` — async generator, yields `RawNotionPage[]` in batches of 100. Prefetches the next batch before yielding the current one to overlap network latency.
- `getDatabaseSchema(databaseId, token)` — returns typed property list
- `listDatabases(token)` — includes retry logic with exponential backoff for 5xx errors
- `archivePage / deletePage` — single-page mutation helpers

### Deduplication pipeline (`/api/deduplicate/auto`)

Three-stage streaming pipeline, all running concurrently via `Promise.all`:

1. **fetchWorker** — calls `paginateDatabase`, strips pages to `MinimalPage`, pushes to `fetchQueue`
2. **matchWorker** — drains `fetchQueue` with O(1) seenMap lookup; keeps oldest page per field value; pushes duplicates to `deleteQueue`
3. **deleteWorkers (×3)** — drain `deleteQueue` concurrently, each making independent Notion API calls

The response is NDJSON (`Content-Type: application/x-ndjson`), streamed as events: `stage`, `notionAPI`, `page`, `progress`, `actioned`, `actionError`, `done`, `error`.

`dryRun=true` replaces delete workers with drain workers that emit `status: "pending"` instead of calling Notion.

### Client-side state: `src/hooks/useDedup.tsx`

`DedupProvider` (wraps the whole app in `layout.tsx`) persists dedup session state to `localStorage` so the progress bar survives navigation. `pausedRef` is a mutable ref shared between the context and `AutoDeduplicateView` to signal pause/resume without triggering re-renders.

### Main UI flow

`/duplicate` (server component) → fetches database list → passes to `DatabaseSelector` (client component)

`DatabaseSelector` owns the sentence-style config row: **Deduplicate [db] using [field] by [archive/delete] [magically/manually] [now/later] ✓**

Clicking ✓ mounts `AutoDeduplicateView`, which:
- Opens `/api/deduplicate/auto` as a streaming fetch
- Reads NDJSON events in a loop, updating a `pageMapRef` (never mutates — always creates new Map entries)
- Batches DOM updates via a 300ms `setInterval` flush + `requestAnimationFrame`
- In `dryRun` mode (timing = "later"), buffers all `pending` rows and reveals them atomically on `done`

### Streaming pattern

Both `/api/databases/[id]/pages` and `/api/deduplicate/auto` use `ReadableStream` with NDJSON. The client reads with `response.body.getReader()` and splits on `\n`, keeping a partial-line buffer across chunks.

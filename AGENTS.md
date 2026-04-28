# AGENTS.md

## Critical: Not Standard Next.js

This app deploys to **Cloudflare Pages** via `@cloudflare/next-on-pages`. Every route using async APIs (`cookies()`, `fetch`, etc.) **must** declare `export const runtime = 'edge'`. No Node.js APIs — only Web-standard APIs. No filesystem access at runtime.

## Commands

```bash
npm run dev          # Local dev (standard Next.js dev server)
npm run build        # Standard Next.js build
npm run lint         # ESLint
npm run pages:build  # Build for Cloudflare Pages
npm run pages:deploy # Build + deploy via wrangler
```

There are **no tests** in this project.

## Architecture

### All Notion calls route through `/api/notion-proxy`

Notion's API rejects browser CORS preflight requests for integration tokens. Every Notion API call from the client goes through this edge route, which forwards requests to `api.notion.com`. Token travels in the encrypted request body, never as a header.

### Dedup pipeline is entirely client-side

The 3-stage concurrent dedup pipeline (`fetchWorker` → `matchWorker` → `deleteWorkers`) runs **in the browser** via `useAutoDeduplicate` hook (`src/hooks/useAutoDeduplicate.ts`). The server-side streaming endpoint (`/api/deduplicate/auto`) was removed.

- Keeps **oldest** page per field value (newer ones are queued for deletion)
- 10 delete workers in parallel for real runs, 3 drain workers for dry-run preview
- 300ms batch flush to decouple pipeline speed from React re-renders

### Auth: httpOnly cookie, no session layer

Token (`notion_token`) stored as `httpOnly` cookie. All API routes read this cookie directly. No OAuth session management layer.

### Stale docs: CLAUDE.md references non-existent routes

`CLAUDE.md` describes `/api/deduplicate/auto` and `/api/databases/[id]/pages` routes that **do not exist** as files. The actual dedup UI is at `/duplicate` (not `/dashboard`). When in doubt, trust the actual source files over CLAUDE.md.

## Key Source Locations

- `src/lib/notion.ts` — all Notion API calls + adaptive rate limiting
- `src/hooks/useAutoDeduplicate.ts` — client-side dedup pipeline
- `src/hooks/useDedup.tsx` — global dedup context (localStorage persistence, pauseRef)
- `src/app/api/notion-proxy/route.ts` — CORS proxy (edge runtime)
- `src/components/AutoDeduplicateView.tsx` — dedup UI orchestration

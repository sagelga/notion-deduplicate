# Notion Deduplicate

A Next.js web app that helps you find and delete duplicate pages in your Notion databases using OAuth authentication.

## Features

- **Notion OAuth Integration** — Securely connect your Notion workspace
- **Database Selection** — Choose which database to scan
- **Smart Deduplication** — Select any field to deduplicate by (title, rich_text, select, number, email, URL, phone, checkbox, date)
- **Visual Grouping** — See all duplicate groups with side-by-side comparison
- **Intelligent Deletion** — Automatically keeps the newest page per group, deletes the rest
- **Dark UI** — Minimal, information-dense interface with Tailwind CSS

## Setup

### 1. Prerequisites

- Node.js 18+ and npm
- A Notion account with workspace admin access
- Notion OAuth credentials (see below)

### 2. Create Notion OAuth Credentials

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click "New integration"
3. Fill in the integration name (e.g., "Notion Deduplicate")
4. Under "Capabilities", enable **OAuth** only (check the "OAuth" capability box)
5. In the "Redirect URIs" section, add: `http://localhost:3000/api/auth/callback`
6. Click "Submit" and copy your:
   - **Client ID**
   - **Client Secret**

### 3. Install Dependencies

```bash
cd /Users/kumamon/Developer/notion-deduplicate
npm install
```

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local and fill in your credentials:
# NOTION_CLIENT_ID=<your_client_id>
# NOTION_CLIENT_SECRET=<your_client_secret>
# NOTION_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### 5. Run Locally

```bash
npm run dev
```

Then visit http://localhost:3000 in your browser.

## Usage

1. **Landing Page** — Click "Connect with Notion" to start OAuth flow
2. **Dashboard** — After authentication, select a database from your workspace
3. **Field Selection** — Choose which property field to deduplicate on
4. **Review Duplicates** — The app groups pages by the selected field and shows you which pages will be deleted (always keeps the newest)
5. **Confirm Deletion** — Click "Delete X duplicates" to remove them permanently

## Architecture

### API Routes

- **`GET /api/auth`** — Initiates Notion OAuth flow
- **`GET /api/auth/callback`** — Handles OAuth callback, sets `notion_token` cookie
- **`GET /api/databases/[id]/pages`** — Fetches all pages from a database
- **`POST /api/deduplicate`** — Deletes specified pages

### Client Components

- **`DatabaseSelector`** — Dropdown for selecting database and deduplication field
- **`DeduplicateView`** — Visualizes duplicate groups and handles deletion

### Core Library

- **`src/lib/notion.ts`** — Notion API helpers (schema fetching, pagination, property extraction, deletion)

## Security

- **httpOnly Cookies** — OAuth tokens are stored securely in httpOnly cookies, never exposed to JavaScript
- **Secure Transmission** — All tokens only sent via HTTPS in production (set by `process.env.NODE_ENV`)
- **No Token Logging** — Tokens never logged or exposed in error messages
- **Server-Side Auth** — All Notion API calls go through Next.js API routes; token never touches the browser

## Supported Deduplication Fields

- `title` — Page title
- `rich_text` — Text content
- `select` — Single select field
- `number` — Numeric value
- `email` — Email address
- `url` — URL field
- `phone_number` — Phone number
- `checkbox` — Boolean value (true/false)
- `date` — Date value

Unsupported types (database, person, multi_select, relation, etc.) are hidden from the field selector.

## Deletion Logic

The app:
1. Groups all pages by the selected field value
2. Filters to only groups with 2+ pages
3. Sorts pages within each group by creation date (newest first)
4. Marks the newest page as "KEEP"
5. Marks all older pages as "DELETE"
6. On confirmation, deletes marked pages sequentially via Notion API

## Troubleshooting

### "Failed to authenticate with Notion"

- Verify `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET` are correct
- Check that the OAuth redirect URI matches exactly (including protocol and port)
- Ensure your integration has OAuth enabled in the Notion console

### "Unauthorized" errors

- Your `notion_token` cookie may have expired
- Sign out and sign back in
- Cookies expire after 24 hours

### "Failed to fetch pages"

- Your Notion workspace may have rate-limited the API
- The database may have been deleted or you lost access
- Try again in a few moments

## Deployment

To deploy to production (e.g., Vercel):

1. Set environment variables in your hosting platform:
   - `NOTION_CLIENT_ID`
   - `NOTION_CLIENT_SECRET`
   - `NOTION_REDIRECT_URI` (update to your production domain, e.g., `https://myapp.com/api/auth/callback`)

2. Deploy:
   ```bash
   npm run build
   ```

3. Update the redirect URI in your Notion integration console to match your production domain.

## Development

### Build

```bash
npm run build
```

### Type Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

## License

MIT

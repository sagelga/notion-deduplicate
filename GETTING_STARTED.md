# Getting Started with Notion Deduplicate

## Quick Start (5 minutes)

### Step 1: Create Notion Integration

1. Visit https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it "Notion Deduplicate"
4. In the "Capabilities" section, check **OAuth** only
5. Scroll down to "Redirect URIs" and add:
   ```
   http://localhost:3000/api/auth/callback
   ```
6. Click "Save changes"
7. Go to the "Secrets" tab and copy:
   - **Client ID** (looks like `12345...`)
   - **Client secret** (looks like `secret_...`)

### Step 2: Set Up Environment

```bash
cd /Users/kumamon/Developer/notion-deduplicate

# Copy the template
cp .env.local.example .env.local

# Edit .env.local and paste your credentials
# NOTION_CLIENT_ID=<paste_client_id>
# NOTION_CLIENT_SECRET=<paste_client_secret>
# NOTION_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### Step 3: Install & Run

```bash
# Install dependencies (only needed once)
npm install

# Start the dev server
npm run dev

# Open in browser
# http://localhost:3000
```

## Usage Flow

1. **Click "Connect with Notion"** — You'll be redirected to Notion to authorize
2. **Select a database** — Choose which database has duplicates
3. **Pick a field** — Select which property to deduplicate by (e.g., "Email")
4. **Review duplicates** — See all groups with 2+ pages, sorted by group size
5. **Confirm deletion** — Click "Delete X duplicates" to remove them
   - Keeps the newest page per group (by created_time)
   - Deletes all older duplicates

## Supported Deduplication Fields

- Title (page name)
- Text fields (rich_text)
- Single-select fields
- Numbers
- Email addresses
- URLs
- Phone numbers
- Checkboxes (true/false)
- Dates

Other field types (Relations, People, Multi-select, etc.) are automatically hidden from the selector.

## Production Deployment

To deploy to production (e.g., Vercel):

1. Update the redirect URI in your Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Edit your integration
   - Change redirect URI to: `https://yourdomain.com/api/auth/callback`

2. Set environment variables in your hosting platform:
   - `NOTION_CLIENT_ID`
   - `NOTION_CLIENT_SECRET`
   - `NOTION_REDIRECT_URI` (your production URL from step 1)

3. Deploy:
   ```bash
   npm run build
   ```

## Troubleshooting

**"I see a blank page after clicking Connect"**
- Check your `.env.local` file has the correct credentials
- Verify the redirect URI matches exactly in both your `.env.local` and Notion integration settings

**"I see 'Unauthorized' error**
- Your OAuth token expired (they last 24 hours)
- Refresh the page and sign back in

**"No pages appear after selecting a field"**
- The database might be empty
- Or all pages already have unique values in that field
- Try a different field or check your Notion database

**"Delete fails with error"**
- Notion may have rate-limited you (max ~90 requests/min)
- Wait a minute and try again
- Or delete in smaller batches

## Need Help?

See the full README.md for:
- Architecture details
- Security information
- API route documentation
- All configuration options

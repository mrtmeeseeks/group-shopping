# Group Shopping Tracker (real-time, 15 people)

A single-page app backed by Supabase: shared shopping list, purchase ledger,
per-person spend, fair-share balances, and minimal settle-up transfers.
Everyone opens the same URL; changes appear live for all viewers.

## One-time setup (~5 minutes)

1. **Create a free Supabase project** at https://supabase.com (any name, e.g. `group-shopping`).
2. **Run the schema**: Dashboard → SQL Editor → New query → paste the contents of
   `schema.sql` → Run.
3. **Get the keys**: Dashboard → Project Settings → API. Copy:
   - Project URL (looks like `https://xxxx.supabase.co`)
   - `anon` / publishable key
4. **Wire the app**: open `index.html` and replace `PASTE_SUPABASE_URL` and
   `PASTE_SUPABASE_ANON_KEY` at the top of the `<script>` block.
5. **Host the page** (any static host works):
   - Netlify: https://app.netlify.com/drop — drag the folder in, done.
   - GitHub Pages: push this folder to a repo, enable Pages.
6. Share the URL with the group.

## Security model (know what you're getting)

The anon key is designed to be public, but the row-level-security policies in
`schema.sql` allow anyone holding it to read/write the two tables. For a
private friends group with an unlisted URL this is fine; don't reuse this
Supabase project for anything else, and don't post the URL publicly.

## Reading the data programmatically

Anything (including Claude) can read the ledger via Supabase's REST API:

```sh
curl "$SUPABASE_URL/rest/v1/items?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY"
curl "$SUPABASE_URL/rest/v1/people?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Notes

- Purchases are split equally across everyone in the People tab.
- Removing a person is blocked while they have purchases (keeps the math honest).
- The currency picker is a per-device display preference; amounts are stored as numbers.
- CSV export of the ledger is in the Ledger tab.

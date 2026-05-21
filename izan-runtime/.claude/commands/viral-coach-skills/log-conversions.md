---
name: log-conversions
description: >
  Walk through every tagged post that hasn't been reviewed for conversion yet,
  ask whether it drove sales / DMs / inquiries, and log the answer to Supabase
  so the pattern engine can weight recommendations by revenue, not just views.
  Triggers: "log conversions", "review conversions", "did my posts drive sales",
  "score my posts", "tag conversions", "feedback loop".
---

# Log Conversions

Walks you through every tagged post that hasn't yet been reviewed for whether
it drove real business outcomes (DMs, sales, high-ticket inquiries). Saves to
`content_posts.drove_sales` + `conversion_notes` so the pattern engine can rank
hook/content/layout buckets by revenue rather than vanity views.

---

## Setup

Read `viral-sales-coach/.env.local` to get `CRON_SECRET`. Use it as the Bearer token
for every API call below.

If the dev server isn't running, stop and say:
"Start the viral-sales-coach dev server first: `cd viral-sales-coach && npm run dev`"

---

## Step 1 — Fetch Unreviewed Posts

```
GET http://localhost:3000/api/posts/unreviewed
Authorization: Bearer <CRON_SECRET>
```

This returns every post that:
- Has been tagged (exists in `content_posts`)
- Has not yet had `drove_sales` set (it's still NULL)

If 0 posts returned →
"All tagged posts have been reviewed. Run `/viral-coach-skills:content-plan` to
plan next post weighted by what actually converted."
Stop here.

Print: "Found N unreviewed posts. Walking through oldest → newest…"

Sort the array by `post_timestamp` ASC before iterating (the API returns newest
first; you want oldest first so the user reviews in chronological order — recent
posts may not have had time to drive sales yet).

---

## Step 2 — For Each Post: Ask

Present each post compactly. Format:

```
─────────────────────────────────────────
Post [i] of [N] — [date]
[permalink]
Hook: [hook_type] · Type: [content_type] · Layout: [layout] · CTA: [cta_keyword or —]
Views: [views] · Likes: [likes] · Comments: [comments] · Saves: [saves]

Caption (first 200 chars):
[caption truncated]

Did this drive any sales, DMs, or high-ticket inquiries?
```

Then use the AskUserQuestion tool with:
- Option 1: **Yes — drove conversions** (drove_sales = true)
- Option 2: **No — no conversions** (drove_sales = false)
- Option 3: **Skip for now** (leave NULL, move on)

If the user picks "Yes", ask a follow-up free-text question:
"What happened? (e.g. '3 DMs about Academy', 'one high-ticket call booked',
'commenter became client'). Press enter to skip notes."

If the user picks "No", optionally collect a short note explaining why
("posted late Sunday — audience asleep", "weak hook, low watch-through").
Press enter to skip.

---

## Step 3 — Save

```
PATCH http://localhost:3000/api/posts/conversion
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json

{
  "instagram_media_id": "<post.instagram_media_id>",
  "drove_sales": true | false,
  "conversion_notes": "<free text or null>"
}
```

If the user picked "Skip for now", do NOT call the API. Just move to the next post.

Print one line per post as you go:
```
✓ [date] — drove_sales: [yes|no] · "[notes truncated]"
```

---

## Step 4 — Summary

After all posts processed (or user stops early), print:

```
── Conversion review complete ─────────────
Reviewed:    N posts
Drove sales: N posts ([%]%)
No sales:    N posts
Skipped:     N posts (still NULL — will appear in next run)

Next: run /viral-coach-skills:content-plan to plan a post weighted by
the patterns that actually converted, not just the ones that got views.
```

---

## Rules

- Walk oldest → newest. Recent posts haven't had time to convert; old ones have.
- Never auto-mark a post as `drove_sales=false`. The user must explicitly say so —
  otherwise leave NULL and let it surface again next run.
- Drove-sales is **the user's call**, not yours. Don't guess from comments/saves.
  High engagement ≠ high conversion. Ask, save what they say.
- If the user wants to stop mid-list, save progress and print the partial summary.
  Anything not reviewed stays NULL and will reappear next run.
- If a post has a CTA keyword (e.g. `ACADEMY`, `TECHPACK`), point that out in the
  prompt — it's a signal the post was explicitly trying to drive a conversion.

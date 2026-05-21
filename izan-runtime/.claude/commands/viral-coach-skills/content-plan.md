---
name: content-plan
description: >
  Plan your next piece of content informed by real performance data. Fetches
  your viral patterns first (what hooks, CTAs, and formats are winning), then
  helps you plan and script a post optimised for those patterns.
  Triggers: "plan content", "what should I post next", "content plan",
  "help me plan a post", "what content should I make".
---

# Content Plan

Helps you plan your next Instagram post informed by live performance data from
your Viral Coach app. Starts by loading what's working, then guides you through
a focused planning session.

---

## Step 1 — Load "What's Working"

Fetch viral pattern data from the local Viral Coach API:

```
GET http://localhost:3000/api/content/viral-patterns?days=90&platform=instagram
Authorization: Bearer 659548e6b65151857be58609ab2fc96998141733ec32e398609ebad7202eeba8
```

If the API is unreachable or returns empty/error, skip this section gracefully
and note: "No pattern data available yet — keep posting and syncing."

If data is returned, display a **"What's Working"** summary.

For each bucket, append `· [drove_sales_rate × 100]% drove sales (N/M reviewed)`
when `reviewed_count >= 1`. Otherwise just show avg views.

```
📊 What's Working (last 90 days)
─────────────────────────────────
Baseline: [avg_views] avg views · [avg_engagement_rate]% engagement
Posts analysed: [post_count]

By views:
  Top hook style:   [top_hook_styles[0].style] ([avg_views] avg views[· conv % if reviewed_count >= 1])
  Best CTA keyword: [best_cta_keywords[0].keyword] ([avg_views] avg views[· conv % if reviewed])
  Best format:      [best_content_types[0].type] ([avg_views] avg views[· conv % if reviewed])
  Best layout:      [best_layouts[0].layout] ([avg_views] avg views[· conv % if reviewed])

[sample_size_warning if present]
```

Then compute a **"Best Converters"** section. For each bucket dimension
(hook style, CTA keyword, content type, layout), find the entry with the
highest `drove_sales_rate` where `reviewed_count >= 3`. If at least one
dimension has a qualifying entry, render:

```
💰 Best Converters (revenue-weighted)
─────────────────────────────────────
Top hook style:   [bucket.style] ([drove_sales_rate × 100]% drove sales · [reviewed_count] reviewed)
Best CTA keyword: [bucket.keyword] ([rate]% drove sales · [reviewed] reviewed)
Best format:      [bucket.type] ([rate]% drove sales · [reviewed] reviewed)
Best layout:      [bucket.layout] ([rate]% drove sales · [reviewed] reviewed)
```

Omit individual lines where no bucket meets `reviewed_count >= 3`.

If **no** bucket across all dimensions has `reviewed_count >= 1`, skip the
"Best Converters" section entirely and print:

```
ℹ No conversion data yet — run /viral-coach-skills:log-conversions to
  enable revenue-weighted recommendations.
```

---

## Step 2 — Plan the Post

Ask the user:
1. **Topic or idea** — What's this post about?
2. **Format** — Reel, carousel, or static? Recommend the **Best Converters**
   pick if available (`reviewed_count >= 3`); otherwise fall back to the
   highest avg-views format.
3. **Hook style** — Same rule: prefer the converter winner when reviewed
   data is sufficient, otherwise the view winner.

When you recommend a pick, name *why* in one line, e.g.
"Suggesting carousel — converts 60% (3/5 reviewed) vs. reel's 20% (1/5)."

---

## Step 3 — Draft the Brief

Output a one-page content brief:

```
CONTENT BRIEF
─────────────
Topic: [topic]
Format: [format]
Hook style: [hook_style]
CTA keyword: [best cta_keyword from patterns, or user's choice]
Target length: [target based on format]

Hook (verbatim): [draft hook based on chosen style]
Core value: [what the viewer learns or gets]
CTA: "Comment [KEYWORD] for [offer]"
```

---

## Rules

- Always load patterns in Step 1 before asking for input — data first, then plan
- **Revenue beats vanity.** When a bucket has `reviewed_count >= 3`, prefer
  the highest `drove_sales_rate` over the highest `avg_views`. Views without
  conversions are noise.
- Only fall back to pure view-count winners when no bucket has enough
  reviewed posts to be meaningful.
- If patterns show carousels outperform reels, recommend carousel
- CTA keywords should route toward AI Designer Academy or high-ticket DM — never "link in bio"
- Keep briefs tight; this is a planning tool, not a full script (use /izan-viral-scripter for scripts)

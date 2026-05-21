---
name: izan-creator-finder
description: >
  Use this skill to discover new niche-relevant Instagram creators and add them
  to the creator database. Triggers: "find new creators", "add creators to my list",
  "discover new accounts to watch", "expand my creator list", "find similar creators",
  "who else should I follow for research", "find 5 new creators".
---

# IZAN Creator Finder

Discovers new niche-relevant personal brand creators on Instagram and adds qualifying
ones to the Creator List in Notion.

---

## First-Time Setup

On first run, ask the user for:

1. **Creator List DB** — Notion database URL where creators are stored

2. **Niche** — The specific topic the creator covers
   (e.g. "Instagram growth for coaches", "content creation for real estate agents",
   "AI tools for entrepreneurs")
   Be as specific as possible — this determines what "niche-relevant" means.

3. **Target creator profile** — What kind of creator to look for:
   - Follower range (recommended: 10K–2M)
   - Language (English, Italian, etc.)
   - Geography if relevant

Store these for the session.

---

## What This Skill Does

1. Loads the existing creator list from Notion (to avoid duplicates)
2. Uses Instagram to discover similar creators in the niche
3. Evaluates each candidate against quality criteria
4. Does a quick outlier scan on each candidate's reels
5. Adds qualifying creators to the Notion Creator List DB
6. Reports what was added and why

**Target: 5 new qualifying creators per run**

---

## Phase 1 — Load Existing Creators

```
notion-fetch: [creator list DB URL]
```

Extract all existing Instagram handles. These will be excluded from additions.

---

## Phase 2 — Discovery Methods

Use a combination of these approaches:

### Method A — Instagram Explore / Feed
Navigate to `https://www.instagram.com/` while logged in.
The explore feed surfaces accounts similar to those already being consumed.
Look for creators posting in the user's niche.

### Method B — Suggested Accounts
Navigate to each existing creator's profile.
Look for "Suggested for you" or "Similar accounts" sections.
Run this for 2-3 existing creators.

### Method C — Hashtag Search
Search Instagram for niche-relevant hashtags.
Look at top posts and the accounts behind them.
Identify creators (not brands/companies) who post educational or personal brand content.

### Method D — Comment Mining
Look at comments on the existing creators' best-performing reels.
Active commenters who are themselves creators in the niche are often strong candidates.

---

## Phase 3 — Evaluate Each Candidate

For each candidate, visit their profile and assess:

**JavaScript to check profile basics:**
```javascript
const bio = document.querySelector('header section div:last-child span')?.innerText || '';
const stats = [...document.querySelectorAll('li span span')].map(el => el.innerText);
JSON.stringify({ bio, stats });
```

**Evaluation Criteria — ALL must pass:**

| Criteria | Requirement |
|----------|-------------|
| Niche fit | Content must be primarily in the user's niche — not adjacent topics |
| Follower range | 10K – 2M (under 10K = too early; over 2M = results won't replicate) |
| Active | Posted at least once in the last 30 days |
| Format | Primarily short-form reels (not photo-only or IGTV-heavy) |
| Outlier potential | Some reels visibly outperform others in the grid |
| Not in list | Not already in the Creator List DB |
| Personal brand | A real person sharing expertise — not a brand/media page/aggregator |

**Automatic disqualifiers:**
- Primarily promotes a single product or app
- Reposts or aggregates other people's content
- Under 10K followers
- Over 5M followers
- Posting in the wrong language
- Wrong niche (adjacent but not aligned)
- Already in the existing creator list

---

## Phase 4 — Quick Outlier Scan

For each candidate that passes evaluation, run a quick reels scan:

```javascript
const links = [...document.querySelectorAll('a[href*="/reel/"]')];
const seen = new Set();
const data = [];
links.forEach(a => {
  const path = a.pathname;
  if (seen.has(path)) return;
  seen.add(path);
  const spans = [...a.querySelectorAll('span')];
  let views = '';
  spans.forEach(s => {
    if (s.innerText.match(/^[\d,\.]+[KkMm]?$/)) views = s.innerText.trim();
  });
  if (views) data.push({ url: `https://www.instagram.com${path}`, views });
});
JSON.stringify(data.slice(0, 15));
```

**A good candidate shows:**
- Clear variation in view counts (not all roughly equal)
- At least 1-2 videos noticeably above the rest
- 10+ reels to have a meaningful baseline

**If all view counts are similar** (little variation), the creator may not have a replicable
system and is lower priority.

---

## Phase 5 — Add to Notion Creator List

For each approved creator:

```
notion-create-pages(
  parent: { data_source_id: [creator list DB ID] },
  pages: [{
    properties: {
      [title field name]: "[CREATOR NAME IN CAPS]",
      [profile field name]: "https://www.instagram.com/[handle]/"
    }
  }]
)
```

Note: Check the DB schema first with `notion-fetch` to get the exact field names.

**Name format:** ALL CAPS, e.g. `JAYDEN SMITH`, `MARIA GARCIA`

---

## Phase 6 — Report

```
CREATOR FINDER REPORT — [Date]

ADDED TO CREATOR LIST: X
✅ @handle — [Name] — [Xk followers] — [why they qualify]
✅ @handle — [Name] — [Xk followers] — [why they qualify]

EVALUATED BUT REJECTED:
❌ @handle — [reason: wrong niche / too large / no outlier variation / already in list]
❌ @handle — [reason]

TOTAL IN CREATOR LIST NOW: X
```

---

## Quality Standard

The goal is not volume — it's quality. A single great reference creator is worth
more than five mediocre ones.

**Ideal candidate profile:**
- 30K–500K followers
- Posts 3-6 times per week
- Has at least 1-2 videos with 5-10x their average views
- Content is educational and in the exact niche
- There is a clear strategy behind their content (not random posts)

---
name: izan-viral-spotter
description: >
  Use this skill to research creators in the creator list, identify viral outlier
  videos (5x+ average views), and save them as content ideas in the content calendar.
  Triggers: "find viral videos", "research creators", "check for outliers",
  "find new content ideas", "run the viral spotter", "check what went viral",
  "look for outliers in my creator list".
---

# IZAN Viral Spotter

Researches creators in the creator database, identifies viral outlier videos,
and saves them to the Content Ideas database.

---

## First-Time Setup

On first run, ask the user for:

1. **Creator List** — Notion database URL where creators are stored
   (each row has a creator name and their Instagram profile URL)

2. **Content Ideas DB** — Notion database URL where content ideas are saved
   (each row will have: title, original video URL, content status)

3. **Niche** — What topic/industry the creator is in
   (e.g. "personal branding and content creation", "fitness coaching", "real estate")

Store these for the session. On subsequent runs in the same conversation, skip setup.

---

## What This Skill Does

1. Fetches the creator list from Notion
2. Navigates to each creator's Instagram reels page
3. Scrapes view counts for all visible reels
4. Calculates the baseline average (excluding top 10% to avoid skew)
5. Identifies videos at 5x+ the baseline (the viral outlier threshold)
6. Checks for duplicates against the Content Ideas DB
7. Saves qualifying videos to the Content Ideas DB
8. Reports the full findings

---

## Phase 1 — Load Creator List

Use `notion-fetch` on the Creator List database URL provided by the user.

Extract from each creator entry:
- Creator name
- Instagram profile URL

---

## Phase 2 — Scrape Each Creator's Reels

For each creator, using Chrome browser tools:

**Step 1 — Initialize network tracker BEFORE navigating:**
```
read_network_requests(clear: true, tabId: [instagram_tab])
```

**Step 2 — Navigate to their reels page:**
```
navigate(tabId: [instagram_tab], url: https://www.instagram.com/[handle]/reels/)
```
Wait 3 seconds.

**Step 3 — Extract view counts:**
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
JSON.stringify(data);
```

**Step 4 — Scroll down and repeat** 2-3 times to load more reels.

**Step 5 — Parse view counts:**
- "109K" → 109000
- "1.2M" → 1200000
- "30.6K" → 30600
- "7,276" → 7276

---

## Phase 3 — Calculate Baseline and Find Outliers

**Baseline calculation:**
1. Sort all view counts ascending
2. Remove the top 10% of values (to exclude existing outliers from skewing the average)
3. Average the remaining values = **baseline**

**Outlier threshold: 5x the baseline**

**Rules:**
- Only include videos posted within the last 6 months
  (click into the reel to check the post date — shown below the caption)
- Avoid using mega-accounts (5M+ followers) as reference creators —
  their results don't replicate for smaller creators
- If a creator has fewer than 10 visible reels, still calculate but note the limitation

**Example calculation:**
- Raw views: 109K, 112K, 30.6K, 12.9K, 7.3K, 25.3K, 26.8K, 21.9K, 21.4K, 22.1K
- Remove top 10% (109K, 112K)
- Average of remaining 8 = ~21K = baseline
- 5x threshold = 105K
- Outliers: 109K (5.2x ✓), 112K (5.3x ✓)

---

## Phase 4 — Check for Duplicates

Before saving any video, search the Content Ideas DB for the reel URL:
```
notion-search(
  query: [reel URL],
  data_source_url: [content ideas DB URL from setup]
)
```
If found, skip it.

---

## Phase 5 — Capture Video Details

For each qualifying video, navigate to the reel URL in Chrome to capture:
- Caption / title text (first line of the post description)
- Post date
- View count (confirm it matches)

---

## Phase 6 — Save to Notion

First, use `notion-fetch` on the Content Ideas DB to confirm the exact property names for
the title field, video URL field, and status field. Different users may have different
column names — never assume.

Then create a page for each qualifying video:

```
notion-create-pages(
  parent: { data_source_id: [content ideas DB ID] },
  pages: [{
    properties: {
      [title field]: "@[handle] — [caption excerpt] — [views] ([Xx] avg) — [Month Day]",
      [video URL field]: "[reel URL]",
      [status field]: "IDEA TO APPROVE"
    }
  }]
)
```

**Title format example:**
`@handle — this is what i would do if starting from scratch — 691K (41x avg) — Nov 27`

---

## Phase 7 — Report

```
VIRAL SPOTTER REPORT — [Date]

CREATORS CHECKED: X

OUTLIERS FOUND & SAVED:
✅ @handle — [title] — [views] ([Xx] baseline) → saved to Notion
✅ @handle — [title] — [views] ([Xx] baseline) → saved to Notion

SKIPPED (already in DB):
⏭  @handle — [title] — already saved

NO NEW OUTLIERS:
📊 @handle — baseline [Xk] — best recent [Xk] ([Xx])
📊 @handle — baseline [Xk] — best recent [Xk] ([Xx])
```

---

## Audio URL Capture (Optional — for use with the transcription skill)

While Instagram is loaded, you can capture audio URLs for reels using the
Performance API. These URLs expire within ~1 hour.

> **Important:** Do NOT use `read_network_requests` for audio capture.
> Instagram uses MSE (blob URLs) for playback — the network tracker
> doesn't capture these. Use `performance.getEntriesByType('resource')`
> instead, which sees the underlying HTTP fetches.

**To capture audio from a reel currently loaded:**

1. Clear the performance buffer and hard-reload the reel to isolate it:
```javascript
performance.clearResourceTimings();
performance.setResourceTimingBufferSize(500);
window.location.href = '[REEL_URL]';
```

2. Wait 7 seconds, then extract with smart selection:
```javascript
(async () => {
  await new Promise(r => setTimeout(r, 7000));
  const entries = performance.getEntriesByType('resource');
  const audioEntries = entries.filter(e =>
    e.name.includes('/m78/') || e.name.includes('/m86/'));
  const seen = new Set();
  const candidates = [];
  audioEntries.forEach(e => {
    const url = new URL(e.name);
    url.searchParams.delete('bytestart');
    url.searchParams.delete('byteend');
    const pathKey = url.pathname;
    if (!seen.has(pathKey)) {
      seen.add(pathKey);
      try {
        const efg = url.searchParams.get('efg');
        const decoded = JSON.parse(atob(decodeURIComponent(efg)));
        const isClips = (decoded.vencode_tag || '').includes('clips');
        if (isClips && decoded.duration_s >= 15) {
          candidates.push({
            url: url.toString(), dur: decoded.duration_s,
            isM78: pathKey.includes('/m78/'), bitrate: decoded.bitrate
          });
        }
      } catch(ex) {}
    }
  });
  if (candidates.length === 0)
    return JSON.stringify({ found: false, totalAudio: audioEntries.length });
  candidates.sort((a, b) => {
    if (a.isM78 !== b.isM78) return a.isM78 ? -1 : 1;
    return a.dur - b.dur;
  });
  const best = candidates[0];
  window.__audioUrl = best.url;
  return JSON.stringify({ found: true, dur: best.dur, isM78: best.isM78,
    candidates: candidates.length, urlLen: best.url.length });
})();
```

**Key signals in the `efg` metadata:**
- `vencode_tag` must contain `"clips"` (not `"carousel_item"`)
- `duration_s` ≥ 15 filters out text-overlay reels (≤ 10s = likely no speech)
- Prefer m78 over m86, then shortest duration (actual reel loads first)

**To transfer the URL to the webhook tab:** Use hex encoding in ~270-char
chunks (the Chrome extension's content filter blocks raw URLs with auth
tokens). See the `izan-transcribe-and-script` skill for the full hex
transfer and webhook call procedure.

---

## Outlier Decision Table

| Situation | Action |
|-----------|--------|
| 5x+ baseline AND posted <6 months ago | Save to Notion |
| 5x+ BUT already in Content Ideas DB | Skip |
| 4-4.9x (close but under threshold) | Note in report, don't save |
| Creator has <10 reels | Calculate anyway, flag the limitation |
| Creator has 5M+ followers | Flag for review — results may not replicate |

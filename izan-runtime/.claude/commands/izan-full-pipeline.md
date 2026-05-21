---
name: izan-full-pipeline
description: >
  Use this skill to run the complete content research pipeline end to end:
  research existing creators for viral outliers, discover 5 new creators,
  transcribe all qualifying videos, and rewrite scripts using the knowledge base.
  Triggers: "run the full pipeline", "run the content pipeline", "do the full
  content research", "run everything", "do the weekly content research",
  "start the pipeline", "find viral videos and write the scripts".
---

# IZAN Full Content Pipeline

Runs the complete content creation system in one go:
1. Research existing creators → identify 5x+ outliers → save to content calendar
2. Discover 5 new creators → add to creator list
3. Transcribe all new content ideas → rewrite scripts using the knowledge base
4. Final report

---

## First-Time Setup

On first run, ask the user for all of the following. Save for the session.

**Notion:**
- Creator List DB URL
- Content Ideas DB URL
- Knowledge Base page URL (or they can describe their expertise directly)

**Transcription:**
- n8n Webhook URL (e.g. `https://[domain]/webhook/[path]`)
- Confirm they have two Chrome tabs open:
  1. **Instagram tab** — for navigating to reels
  2. **Webhook tab** — any page on the webhook domain (e.g. open `https://[domain]/` in a tab).
     The webhook fetch MUST be fired from this tab, not Instagram (CORS blocks cross-origin).

**Content:**
- Niche (specific topic, e.g. "content creation for personal brands in the coaching space")
- Creator profile to look for (follower range, language, geography if relevant)

On repeat runs in the same conversation, skip setup and go straight to Step 1.

---

## Pipeline Map

```
STEP 1 → Load creator list from Notion
STEP 2 → For each creator: scrape reels, calculate baseline, find 5x+ outliers
STEP 3 → Save qualifying outliers to Content Ideas DB
STEP 4 → Discover 5 new niche-relevant creators on Instagram
STEP 5 → Add qualifying new creators to Creator List DB
STEP 6 → Load creator's knowledge base from Notion
STEP 7 → For each new content idea: capture audio → transcribe → rewrite script
STEP 8 → Save scripts to Notion, update status to SCRIPT TO APPROVE
STEP 9 → Full pipeline report
```

---

## STEP 1 — Load Creator List

```
notion-fetch: [creator list DB URL]
```

Extract each creator's name and Instagram profile URL.

---

## STEP 2 — Scrape Reels and Find Outliers

For each creator:

**Initialize the tracker first:**
```
read_network_requests(clear: true, tabId: [instagram_tab])
```

**Navigate to their reels:**
```
navigate(tabId: [instagram_tab], url: https://www.instagram.com/[handle]/reels/)
```
Wait 3 seconds.

**Extract view counts:**
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

Scroll down 2-3 times and repeat. Parse K/M into numbers.

**Baseline calculation:**
1. Sort ascending
2. Remove top 10%
3. Average the rest = baseline

**Outlier threshold: 5x the baseline**

**Rules:**
- Only videos posted within the last 6 months
- Skip if already exists in the Content Ideas DB
- Avoid mega-accounts (5M+ followers) as reference creators

---

## STEP 3 — Save Outliers to Notion

Click into each qualifying reel to confirm caption, date, and view count.

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

Note: Use `notion-fetch` on the Content Ideas DB first to confirm the exact field names.

---

## STEP 4 — Discover New Creators

**Target: 5 new qualifying creators per run.**

**Discovery methods:**

**A. Instagram feed/explore** — Navigate to `https://www.instagram.com/`
The algorithm shows similar accounts to what's already being consumed.

**B. Suggested accounts** — Visit each existing creator's profile.
Look for "Suggested for you" or "Similar accounts".

**C. Comment mining** — Check comments on the best-performing reels of existing creators.
Active creator-commenters in the niche are strong candidates.

**Evaluation criteria — all must pass:**

| Criteria | Requirement |
|----------|-------------|
| Niche fit | Must be in the exact niche specified at setup |
| Follower range | 10K–2M |
| Active | Posted in the last 30 days |
| Format | Primarily short-form reels |
| Outlier potential | View count variation visible in their grid |
| Not in list | Not already a tracked creator |
| Personal brand | A real person, not a brand or aggregator page |

**Quick reels scan for each candidate:**
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
JSON.stringify(data.slice(0, 12));
```

A good candidate has visible variation in their view counts — not all roughly equal.

---

## STEP 5 — Add New Creators to Notion

```
notion-create-pages(
  parent: { data_source_id: [creator list DB ID] },
  pages: [{
    properties: {
      [name field]: "[CREATOR NAME IN CAPS]",
      [profile field]: "https://www.instagram.com/[handle]/"
    }
  }]
)
```

---

## STEP 6 — Load Knowledge Base

Fetch the knowledge base from the Notion URL provided at setup:
```
notion-fetch: [knowledge base URL]
```

Extract:
- Creator's natural voice and tone
- Signature frameworks or systems (names and how they work)
- Social proof (specific numbers, results, case studies)
- Specific tools or methods they reference
- Recurring phrases or language patterns

**If no knowledge base exists yet:**
Ask the user:
1. What are your best results or client results? (specific numbers)
2. Do you have a named system or framework? What is it?
3. What tools do you recommend in your niche?
4. How would you describe your speaking style?

---

## STEP 7 — Transcribe and Rewrite Each Content Idea

For each idea saved in Step 3:

### 7a — Pre-screen: Is this a text-overlay reel?

> **Why `performance.getEntriesByType` instead of `read_network_requests`:**
> Instagram uses Media Source Extensions (MSE) with blob URLs for video
> playback. The browser's network request tracking doesn't capture these
> media segment requests. The Performance API does, because MSE segments
> are still fetched as HTTP resources under the hood. This is the only
> reliable way to get the audio CDN URLs.
>
> **Why isolating the reel matters:**
> Instagram's SPA preloads audio from adjacent/suggested reels into the
> same page context. A full hard reload (`window.location.href = url`)
> ensures only the target reel's media loads, making audio selection reliable.

Navigate to the reel, wait for it to load, then run this on the Instagram tab:

```javascript
(async () => {
  await new Promise(r => setTimeout(r, 3000));
  const meta = document.querySelector('meta[property="og:description"]');
  const caption = meta ? meta.content : '';
  const entries = performance.getEntriesByType('resource');
  const audioEntries = entries.filter(e =>
    e.name.includes('/m78/') || e.name.includes('/m86/'));
  const seen = new Set();
  let maxClipsDur = 0;
  audioEntries.forEach(e => {
    const url = new URL(e.name);
    const pathKey = url.pathname;
    if (!seen.has(pathKey)) {
      seen.add(pathKey);
      try {
        const efg = url.searchParams.get('efg');
        const decoded = JSON.parse(atob(decodeURIComponent(efg)));
        if ((decoded.vencode_tag || '').includes('clips')
            && decoded.duration_s > maxClipsDur)
          maxClipsDur = decoded.duration_s;
      } catch(ex) {}
    }
  });
  return JSON.stringify({
    isLikelyTextOverlay: maxClipsDur <= 10,
    maxAudioDuration: maxClipsDur,
    captionPreview: caption.substring(0, 300)
  });
})();
```

**If `isLikelyTextOverlay` is true (audio ≤ 10s):**
- Skip audio extraction — use the caption as source material (see 7b5 below)
- Save the caption as the "transcript" in Notion

**If false:** Proceed to Step 7b.

---

### 7b — Isolate the reel with a full hard reload

Clear the performance buffer, then do a full page reload so only THIS
reel's audio loads:

```javascript
performance.clearResourceTimings();
performance.setResourceTimingBufferSize(500);
window.location.href = '[REEL_URL]';
```

Then wait 7-8 seconds for the page to load and the video to begin playing:

```javascript
(async () => {
  await new Promise(r => setTimeout(r, 7000));
  return 'Page loaded';
})();
```

---

### 7b2 — Extract the correct audio URL with smart selection

After the page loads, find audio URLs and pick the right one using
metadata signals. The `efg` query parameter on every CDN URL contains
base64-encoded JSON with `vencode_tag` (must include `"clips"` — not
`"carousel_item"`), `duration_s`, and `bitrate`.

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
            url: url.toString(),
            dur: decoded.duration_s,
            isM78: pathKey.includes('/m78/'),
            bitrate: decoded.bitrate
          });
        }
      } catch(ex) {}
    }
  });

  if (candidates.length === 0)
    return JSON.stringify({ found: false, totalAudio: audioEntries.length });

  // Prefer m78 over m86, then shortest duration (actual reel loads first)
  candidates.sort((a, b) => {
    if (a.isM78 !== b.isM78) return a.isM78 ? -1 : 1;
    return a.dur - b.dur;
  });
  const best = candidates[0];

  // Verify URL is accessible
  try {
    const head = await fetch(best.url, { method: 'HEAD' });
    if (head.status !== 200)
      return JSON.stringify({ found: false, reason: 'HEAD failed',
                              status: head.status });
  } catch(e) {
    return JSON.stringify({ found: false, reason: 'HEAD error' });
  }

  window.__audioUrl = best.url;
  return JSON.stringify({
    found: true, dur: best.dur, isM78: best.isM78,
    candidates: candidates.length, urlLen: best.url.length
  });
})();
```

**If `found: false`:** Wait 5 more seconds and retry once. If still
nothing, flag the reel and move to the next one.

---

### 7b3 — Transfer the audio URL to the webhook tab

The Chrome extension's content filter blocks raw URLs containing auth
tokens and base64 data. Hex encoding reliably passes through when split
into ~270-character chunks.

**On the Instagram tab — encode and extract in exactly 2 calls:**

Call 1:
```javascript
(() => {
  const url = window.__audioUrl;
  let hex = '';
  for (let i = 0; i < url.length; i++)
    hex += url.charCodeAt(i).toString(16).padStart(2, '0');
  window.__hex = hex;
  const s = 270;
  return JSON.stringify({
    t: hex.length,
    a: hex.substring(0, s),
    b: hex.substring(s, s*2),
    c: hex.substring(s*2, s*3)
  });
})();
```

Call 2:
```javascript
(() => {
  const h = window.__hex; const s = 270;
  return JSON.stringify({
    d: h.substring(s*3, s*4),
    e: h.substring(s*4, s*5),
    f: h.substring(s*5, s*6),
    g: h.substring(s*6)
  });
})();
```

Concatenate all hex parts (a+b+c+d+e+f+g) and transfer to the webhook tab.

---

### 7b4 — Transcribe (fire from the webhook tab)

Fire the webhook FROM THE WEBHOOK TAB (not Instagram — CORS blocks it):

```javascript
(async () => {
  // Reconstruct URL from hex parts transferred from Instagram tab
  const hex = "[a+b+c+d+e+f+g concatenated]";
  let audioUrl = '';
  for (let i = 0; i < hex.length; i += 2)
    audioUrl += String.fromCharCode(parseInt(hex.substring(i, i+2), 16));

  const resp = await fetch('[webhook URL from setup]', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      notion_page_id: "[content idea page ID]"
    })
  });
  const text = await resp.text();
  // Extract just transcript info (avoid echoing URL which triggers content filter)
  const hasSuccess = text.includes('"success":true');
  const tStart = text.includes('"transcript"')
    ? text.split('"transcript":"')[1].substring(0, 150) : 'none';
  return JSON.stringify({ status: resp.status, len: text.length,
                          hasSuccess, tStart });
})();
```

**Important:** When parsing the response, avoid returning the full body
text — it may contain the audio URL which triggers the Chrome extension's
content filter. Extract just the `transcript` preview and `success` flag.

---

### 7b5 — Handle Text-Overlay Reels (No Speech)

Many viral reels — especially short ones under 15 seconds — have no spoken words.
They use text on screen with background music.

**Detect it:** Pre-screening in Step 7a catches these (audio ≤ 10s). The transcript
will also be empty, a single word, or just background music notation.

**Where to find the script:** The real content lives in the **caption**. Use the caption
as the source material to adapt — that's the script, not the (empty) transcript.

**How to get the caption:**
```javascript
const meta = document.querySelector('meta[property="og:description"]');
meta ? meta.content : 'No caption';
```

**How to rewrite text-overlay reels:**
- Keep the same text-on-screen format — your version should also be a text-overlay reel
- Keep the same text that appears on screen (the hook/title text) verbatim
- Adapt the caption content with your own value, stories, and proof points
- Match the same emotional tone, length, and list format of the original caption

**Output format for text-overlay reels:**
```
REWRITTEN SCRIPT (Text-Overlay Format) — ~Xs

[ON-SCREEN TEXT]  "[same hook/title text from original]"

[CAPTION]
[Adapted caption — same structure and emotional tone, your value/proof/voice]
```

If the reel is text-overlay, skip the 5-part framework below and use this format instead.

---

### 7b6 — Verify the transcript matches the reel

After the webhook returns a transcript, sanity-check it: compare the
first ~20 words against the reel's caption or title. If the transcript
is in the wrong language, about a completely different topic, or empty,
the wrong audio URL was selected. In that case:
1. Go back to the Instagram tab
2. Reload the reel fresh (repeat Step 7b)
3. Try the next candidate URL or pick the second-shortest duration

### 7c — Analyze the original transcript

```
ORIGINAL VIDEO ANALYSIS
Total length: ~X seconds
Content type: [Demonstration / Tutorial / Educational / Story-based]

HOOK: [type] — "[hook text]" — [word count]
SELLING SOLUTION: [Interest Peak type] OR [SKIPPED — reason]
PRINCIPLE: [structure — steps / story / demo]
APPLICATION: [how made actionable]
CTA: [resource] / [keyword]
```

### 7d — Rewrite using the IZAN Viral Scripting Framework

**Core Philosophy:** Clarity · Conversion · Curiosity

**Length rule:** As SHORT as possible. Aim 10-20% shorter than the reference.

**The 5-Part Structure:**

**1. HOOK (0-5s)** — Under 10 words / stops scroll / creates stakes
Types: Problem-Based / Pattern Interrupt / Counter-Intuitive / Numbers-Based

**2. SELLING THE SOLUTION (5-15s)** — Builds anticipation without revealing value
Flexibility: SKIP for demos / compress for tutorials / full 10s for educational
7 Interest Peak Types:
- RISK REVERSAL — "this takes under a minute"
- AUTHORITY ENDORSEMENT — "this is what [authority] taught me"
- CONTROVERSIAL — "99% of people won't make it to the end"
- PERSONAL STORY — "this is exactly what I did to [result]"
- NEGATIVE ASSUMPTION — "and no, it's not [the obvious answer]"
- HYPE UP — "I was going to keep this to myself"
- CALL OUT — "this is where most people screw it up"

**3. GIVING THE PRINCIPLE (15-45s)** — Clear steps / 5th-grade language / specific examples

**4. MAKING IT APPLICABLE (45-55s)** — Immediately actionable / specific next step

**5. CALL TO ACTION (55-60s)** — "Comment [KEYWORD] and I'll send you [specific resource]"

**Rewrite rules:**
1. **Keep the exact same hook verbatim.** The hook already went viral in your niche — don't reinvent it. Copy it word for word.
2. **Keep the overall structure and flow of the original video.** Mirror the sequence of sections, pacing, and which parts are compressed or expanded. Swap the value inside, not the frame.
3. Match total length of reference video
4. Creator's knowledge, proof points, and tools replace the original value sections
5. Creator's voice throughout (from knowledge base)
6. 5th-grade language — short sentences, plain words
7. Sounds like a real person speaking

**Script output format:**
```
REWRITTEN SCRIPT — ~X seconds

[HOOK — 0-Xs]  "..."
[SELLING THE SOLUTION — Xs-Xs]  "..."  ← or SKIPPED
[PRINCIPLE — Xs-Xs]  "..."
[APPLICATION — Xs-Xs]  "..."
[CTA — Xs-Xs]  "..."

KEPT: exact hook / overall structure and flow / [which sections / pacing]
CHANGED: value → [what was swapped in] / CTA → [keyword]
```

### 7e — Save to Notion

```
notion-update-page(
  command: "update_content",
  page_id: [content idea page ID],
  content_updates: [{
    old_str: "## Spoken Transcript",
    new_str: "## Rewritten Script\n\n[full script with section labels]\n\n---\n\n## Spoken Transcript\n\n[full transcript]"
  }]
)
```

Update status:
```
notion-update-page(
  command: "update_properties",
  page_id: [content idea page ID],
  properties: { [status field]: "SCRIPT TO APPROVE" }
)
```

---

## STEP 9 — Final Pipeline Report

```
══════════════════════════════════════════
IZAN CONTENT PIPELINE REPORT — [Date]
══════════════════════════════════════════

CREATORS RESEARCHED: X
  @handle — baseline [Xk] — [X] outliers found
  @handle — baseline [Xk] — no new outliers

NEW CONTENT IDEAS SAVED: X
  ✅ @handle — [title] — [views] ([Xx]) → IDEA TO APPROVE
  ✅ @handle — [title] — [views] ([Xx]) → IDEA TO APPROVE

NEW CREATORS ADDED: X
  ✅ @handle — [Name] — [Xk followers] — [why they qualify]
  ✅ @handle — [Name] — [Xk followers]

SCRIPTS WRITTEN: X
  ✅ [title] → SCRIPT TO APPROVE
       Hook: "[hook text]"
  ✅ [title] → SCRIPT TO APPROVE
       Hook: "[hook text]"

ISSUES / SKIPPED:
  ⚠️ [any errors or skipped items with reason]
══════════════════════════════════════════
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No clips entries at all | Video hasn't started playing | Wait longer (10s), click the video element |
| Wrong language / wrong topic transcript | Picked preloaded adjacent reel audio | Use `window.location.href` reload; try next candidate |
| Webhook returns empty body (200, len 0) | CDN token expired or server can't reach CDN | Reload reel page for fresh URLs; retry |
| Multiple candidates, unsure which | Instagram preloaded nearby reels | Prefer shortest-duration clips candidate |
| HEAD check returns 403/404 | URL expired (~1hr CDN token lifetime) | Reload reel page for fresh URLs |
| Thousands of performance entries | Buffer from previous navigations | `performance.clearResourceTimings()` before reload |

**Knowledge base not found in Notion:**
- Ask the user to provide the page URL directly, or describe their expertise in chat

---
name: tag-posts
description: >
  Transcribes all untagged viral-coach posts via Instagram audio capture + n8n webhook,
  then uses Claude to auto-suggest and save hook type, content type, layout, and CTA keyword.
  Triggers: "tag posts", "transcribe posts", "label posts", "auto-tag".
---

# Tag Posts — Transcribe + Auto-Tag

Transcribes every untagged post in the Viral Coach DB, then saves suggested tags so the
Patterns section of the dashboard populates automatically. Run this before opening /tag.

---

## Setup

Read `viral-sales-coach/.env.local` to get the `CRON_SECRET` value. Use it as the Bearer token
for all API calls below.

---

## Step 1 — Fetch Untagged Posts

```
GET http://localhost:3000/api/posts/untagged
Authorization: Bearer <CRON_SECRET>
```

If 0 posts returned → "All posts are already tagged. Open the dashboard to see patterns."
Stop here.

Print: "Found N untagged posts. Starting transcription…"

---

## Step 2 — For Each Post: Transcribe

Process posts one at a time in order.

### 2a — Navigate to Instagram post

Switch to Instagram tab (index 0):
```
mcp__playwright__browser_tabs: action=select, index=0
```

Hard reload the post permalink (do NOT use SPA navigation):
```js
window.location.href = "<post.permalink>"
```

Wait 4 seconds for the page to fully load and audio resources to register.

### 2b — Capture audio URL

Run in Instagram tab (index 0):
```js
performance.getEntriesByType('resource')
  .map(e => e.name)
  .filter(u => u.includes('/m78/') || u.includes('/m86/'))
  .filter(u => {
    try {
      const efgRaw = new URL(u).searchParams.get('efg')
      if (!efgRaw) return false
      const efg = JSON.parse(atob(efgRaw))
      return (efg.vencode_tag || '').includes('clips') && (efg.duration_s || 0) >= 15
    } catch { return false }
  })
  // prefer /m78/ over /m86/, then shortest duration
  .sort((a, b) => {
    const scoreA = a.includes('/m78/') ? 0 : 1
    const scoreB = b.includes('/m78/') ? 0 : 1
    if (scoreA !== scoreB) return scoreA - scoreB
    const durA = (() => { try { return JSON.parse(atob(new URL(a).searchParams.get('efg'))).duration_s } catch { return 999 } })()
    const durB = (() => { try { return JSON.parse(atob(new URL(b).searchParams.get('efg'))).duration_s } catch { return 999 } })()
    return durA - durB
  })[0] || null
```

**If no audio URL found:**
- Check if this is a text-overlay reel: max `clips` duration ≤ 10s, or truly no CDN entries
- If text-overlay: use `post.caption` as the transcript source. Set `transcript = post.caption`. Skip to Step 3.
- Otherwise: log "⚠ No audio found for [permalink] — skipping" and move to next post.

### 2c — Transfer URL to webhook tab (CORS requirement)

The fetch must be fired from the webhook tab, not from instagram.com.
Hex-encode the audio URL and transfer it in ~270-character chunks:

In Instagram tab, run:
```js
// Encode URL as hex
Array.from(audioUrl).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join('')
```

Then in webhook tab (index 1), reassemble and fire the request:
```js
// Step 1: receive first chunk (store globally)
window.__audioHex = "<chunk1>"
// Step 2: append remaining chunks
window.__audioHex += "<chunk2>"
// ... repeat until full hex string is assembled

// Step 3: decode and POST to n8n
const audioUrl = window.__audioHex.match(/.{2}/g).map(h => String.fromCharCode(parseInt(h,16))).join('')
const resp = await fetch('https://n8n.ahmadhameed.com/webhook-test/instagram-transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audio_url: audioUrl })
})
const json = await resp.json()
JSON.stringify({ success: json.success, transcript: (json.transcript || '').slice(0, 150) })
```

Extract `transcript` from the response. Do NOT log or display the full audio URL.

---

## Step 3 — Suggest Tags from Transcript

Given the transcript (or caption for text-overlay posts), use your judgement to classify:

**Hook type** — pick the single best fit or null:
- `Question` — opens with a question ("Why do most…", "What if…")
- `Contrast / Before-After` — contrast between two states
- `Proof / Result` — leads with a result, number, or outcome
- `Curiosity Gap` — teases information without revealing it
- `Bold Statement` — strong declarative claim
- `Story` — narrative, personal experience
- `Tutorial / How-to` — instruction-first opening

**Content type** — pick the single best fit or null:
- `Talking head` — person on camera talking directly
- `Text overlay` — text on screen, no or minimal talking
- `Voiceover + B-roll` — voiceover narration over footage
- `Tutorial / Screen record` — step-by-step with screen or hands
- `Montage` — cut sequence of clips without continuous speech

**Layout** — pick the single best fit or null:
- `Single clip` — one continuous shot
- `Split screen` — two panels
- `Carousel / slides` — slide-by-slide format
- `Talking head + text` — face cam with on-screen text
- `Full screen text` — no person visible, text only

**CTA keyword** — if the transcript contains "Comment [WORD]" or "DM me [WORD]",
extract the keyword (e.g. `ACADEMY`). Otherwise null.

---

## Step 4 — Save to DB

```
POST http://localhost:3000/api/posts/tag
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json

{
  "instagram_media_id": "<post.instagram_media_id>",
  "transcript": "<full transcript text>",
  "hook_type": "<suggested or null>",
  "content_type": "<suggested or null>",
  "layout": "<suggested or null>",
  "cta_keyword": "<extracted or null>"
}
```

Print one line per post as you go:
```
✓ [date] [views]v — Hook: [hook_type] · Type: [content_type] · CTA: [cta_keyword or —]
```

---

## Step 5 — Summary

After all posts are processed, print:

```
── Auto-tag complete ──────────────────────
Tagged:     N posts
Skipped:    N posts (no audio / no caption)
CTA found:  N posts

Open http://localhost:3000/tag to review or correct any tags.
Open http://localhost:3000 to see your Patterns section populate.
```

---

## Rules

- Never display or log the raw audio URL — it triggers browser content filters.
- Always hard reload (not SPA navigate) before capturing audio resources.
- If the dev server is not running, stop and say: "Start the viral-sales-coach dev server first: `cd viral-sales-coach && npm run dev`"
- If n8n returns an error, log it and continue with next post — don't abort the whole run.
- Tag suggestions are a best guess from the transcript — the user can correct them at /tag.

---
name: create-carousel
description: >
  Create a slide-by-slide Instagram carousel script informed by your top-performing
  hooks and CTA keywords. Fetches live pattern data before writing.
  Triggers: "create a carousel", "write a carousel", "make a carousel post",
  "carousel script", "slides for my post".
---

# Create Carousel

Writes a complete slide-by-slide carousel script, pre-loaded with your
top-performing hooks and CTA keywords so every carousel is built on real data.

---

## Step 1 — Load Pattern Suggestions

Fetch from the local Viral Coach API:

```
GET http://localhost:3000/api/content/viral-patterns?days=90&platform=instagram
Authorization: Bearer 659548e6b65151857be58609ab2fc96998141733ec32e398609ebad7202eeba8
```

Extract and hold for use in Step 3:
- `patterns.top_hook_styles` → top 3 hook styles
- `patterns.best_cta_keywords` → top 3 CTA keywords

If the API is unreachable or returns empty, skip gracefully: continue without
suggestions and note "No pattern data yet."

---

## Step 2 — Get Topic and Brief

Ask the user:
1. **Topic** — What is this carousel teaching or showing?
2. **Audience** — Who is this for? (founders, designers, creatives, etc.)
3. **Core insight** — What's the one thing the viewer should leave knowing?

---

## Step 3 — Suggest Hook and CTA

Based on pattern data (or best judgement if no data), suggest:

```
Suggested hook styles (from your top performers):
  1. [top_hook_styles[0]] — avg [views] views
  2. [top_hook_styles[1]] — avg [views] views

Suggested CTA keywords (from your top performers):
  1. [best_cta_keywords[0].keyword]
  2. [best_cta_keywords[1].keyword]
```

Let the user confirm or override.

---

## Step 4 — Write the Carousel

Output the carousel as numbered slides. Standard format:

```
SLIDE 1 — COVER (Hook)
[Bold hook text — max 8 words]
[Subtext if needed — max 12 words]

SLIDE 2 — PROBLEM / SETUP
[What's wrong or what they're missing]

SLIDE 3-N — VALUE SLIDES
[One insight or step per slide — keep each under 20 words of headline]
[Supporting detail in smaller text if needed]

FINAL SLIDE — CTA
Comment [KEYWORD] [brief promise]
[Secondary: follow for more if relevant]
```

- 5–10 slides is the sweet spot; never exceed 12
- Cover slide decides whether they swipe — make it unmissable
- Each slide should make you want to see the next
- CTA keyword should route toward AI Designer Academy or high-ticket DM

---

## Rules

- Load patterns before asking for input — data informs the hook, not the other way around
- If no pattern data: use the IZAN framework defaults (question hook + direct CTA)
- Never use "link in bio" as a CTA

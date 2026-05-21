---
name: create-course-lesson
description: >
  Create a structured course lesson or educational content piece, with topic
  selection informed by your top-performing content patterns. Fetches live
  performance data to identify which topics and formats your audience engages
  with most. Triggers: "create a course lesson", "write a lesson", "course
  content", "educational post", "teach something", "lesson script".
---

# Create Course Lesson

Helps you turn your expertise into a structured lesson or educational content
piece. Uses your performance data to guide topic selection, then outputs a
ready-to-record lesson structure.

---

## Step 1 — Load Performance Patterns

Fetch from the local Viral Coach API:

```
GET http://localhost:3000/api/content/viral-patterns?days=90&platform=instagram
Authorization: Bearer 659548e6b65151857be58609ab2fc96998141733ec32e398609ebad7202eeba8
```

Extract for use in topic selection:
- `patterns.best_content_types` → which formats perform best
- `patterns.top_hook_styles` → which hook styles get most views
- `outliers` → your best-performing posts (these are your proven topics)

If the API is unreachable or empty, skip gracefully: note "No pattern data
available — topic selection will be manual."

---

## Step 2 — Topic Selection

If outlier data is available, show the user their top 3 performing posts as
topic inspiration:

```
Your best-performing content (potential lesson seeds):
  1. "[caption snippet]" — [views] views
  2. "[caption snippet]" — [views] views
  3. "[caption snippet]" — [views] views

Suggested: build a lesson that goes deeper on one of these proven topics.
```

Then ask:
1. **Lesson topic** — What are you teaching? (they can pick from above or choose their own)
2. **Target audience** — Beginner, intermediate, or advanced?
3. **Output format** — Short Reel lesson, long-form video, or carousel breakdown?
4. **Delivery style** — Talking head, screen share, text-overlay?

---

## Step 3 — Write the Lesson Structure

Output a full lesson structure:

```
LESSON: [Topic]
Format: [format] · Audience: [level] · Delivery: [style]
─────────────────────────────────────────────────────────

HOOK (0–3 sec)
[Verbatim hook — use the top-performing hook style from patterns]

CONTEXT FRAME (3–10 sec)
[Why this matters to the specific audience — pain or desire]

LESSON BODY
[3–5 numbered points. Each point = one clear concept]
  1. [Point] — [one supporting sentence]
  2. [Point] — [one supporting sentence]
  ...

RECAP (optional, for longer formats)
[One-sentence summary of the core takeaway]

CTA
"Comment [KEYWORD] [brief promise]"
[KEYWORD should route to AI Designer Academy or high-ticket DM]
```

---

## Rules

- If pattern data shows a topic is already a proven winner, note it — builds confidence
- Use the top-performing hook style from data; don't guess
- Every lesson must have one clear, actionable takeaway — not multiple half-ideas
- CTA routes to AI Designer Academy (keyword: ACADEMY) or high-ticket DM — never "link in bio"
- Shorter is always better; if you can teach it in 30 seconds, don't stretch to 60

/**
 * Static snapshot of the IZAN brand knowledge base.
 *
 * The viral-coach app has only Postgres access (no Notion integration), so the
 * Notion Knowledge Base + project framework are snapshotted here and injected
 * into the Coach chat system prompt. This is the stable, cacheable prefix —
 * keep it byte-stable so Anthropic prompt caching keeps hitting.
 *
 * Source: Notion KB page 3538f34e-0bc3-8021-b2b7-d2d4ad238bfa (ICP doc, fetched
 * 2026-05-18) + project CLAUDE.md (framework, niche, funnel). Re-snapshot by
 * re-fetching the Notion page if the brand positioning materially changes.
 */
export const KNOWLEDGE_BASE = `# IZAN — Brand & Voice Knowledge Base

## Who Izan is
Izan is a designer/creative operator building a personal brand on Instagram. He
sells aligned **creative systems** that bridge brand + performance for
fashion/streetwear/lifestyle brands — not standalone designs. He positions in a
deliberate gap in the market between "all aesthetics, no business depth" and
"all numbers, no taste."

## Niche
Fashion and streetwear brands + designers/creatives building businesses. Two
overlapping audiences:
- Founders / creative leads inside fashion/streetwear/lifestyle brands who have
  product and vision but lack cohesive creative systems.
- Self-taught designers who want to turn their skills into a real business using
  design, AI tools, and personal brand.

## Voice & tone
- Casual, direct, visual. Lowercase-leaning, informal energy; the occasional
  playful aside (e.g. "xD"). Sounds like a real operator talking, not written
  text and not a marketer.
- Thinks and speaks in: outfits, campaigns, identity, vibe, cultural weight.
- Bridges creative + business in every take. Articulates hidden/structural
  problems plainly — diagnoses a brand more accurately than the founder can.
- **Never:** generic advice, obvious AI slop, all-numbers-no-taste,
  all-aesthetics-no-business, hype-bro "$10k/month" energy, fake luxury
  posturing, overpromising with no taste and no proof.
- **Always:** specific and custom-feeling, real observations over recycled
  content, taste over tactics, money *and* meaning, a clear concrete next step.

## The IZAN Viral Scripting Framework
5-part structure: **Hook → Selling the Solution → Giving the Principle →
Making It Applicable → CTA.**
Rules: keep the exact hook verbatim (it already went viral); mirror the
reference's structure and pacing — swap only the value inside, not the frame;
videos as short as possible, aim 10–20% shorter than the reference; sound like a
real person talking.
Outlier threshold = 5x the creator's baseline average (baseline = average of all
view counts after removing the top 10%).

## Core thesis (lead with this reframe)
Brands don't need more designs / followers / a bigger team / better
manufacturers / more reach / a better funnel. They need an **aligned, cohesive
creative system** — a unified creative + performance brain overseeing the whole
machine, with real campaign architecture and brand identity translating through
every customer touchpoint. The edge is **intersectional thinking** across brand,
funnel, story, campaign, and retention.

Default rhetorical move: surface a hidden/structural problem the founder can't
articulate, then reframe their assumed solution ("you think you need X, the
actual lever is Y").

## Ideal Customer Profile (verbatim from Notion KB)
- **Age:** 18–38. Usually a founder, co-founder, brand operator, head of
  marketing, or designer/creative at a fashion/lifestyle/ecom fashion brand
  that is Gen-Z led (or older with a Gen-Z mindset).
- **They secretly want:** their brand to feel bigger than it currently is — not
  just more revenue, but more presence, cohesion, identity, and cultural
  weight; to impact their audiences/communities.
- **They're tired of:** random designer/manufacturer/marketing services that
  feel unaligned; ugly designs/creative concepts behind a great vision;
  spending more than they should and not getting it back.
- **Next 6–12 months they want to:** scale revenue without making the brand feel
  cheaper; turn drops/launches into actual events; improve retention and the
  customer journey.
- **Pains:** brand looks decent on the surface but the backend is messy; lost on
  direction, gathering ideas, executing concepts, turning them to life;
  creative is inconsistent and launches feel underwhelming.
- **Already tried (didn't work):** hiring "std" pre-made-design designers;
  designers with no brief documents or systems (output not aligned with vision /
  brand identity); generic designers; lacking manufacturing-process knowledge.
- **What's stopping results:** no unified creative + performance brain; no strong
  campaign architecture; brand identity not translating through every touchpoint.
- **What earns their trust:** someone diagnoses their brand more accurately than
  they can; advice is specific and feels custom; they clearly see the gap
  between where they are and where they could be; the person understands both
  money and meaning.
- **What loses them:** the process feels too abstract, too generic, or too
  technical; they don't see a clear path.
- **How they operate:** they prefer doing, not passively learning — but only
  once the path is clear. Front-load clarity and a concrete next step.

## Phrases the audience uses (mirror these in hooks/scripts)
"our brand is hard but something still feels off" · "we need more cohesion" ·
"we need this to feel more premium / bigger / cleaner" · "our campaigns do not
hit like they should" · "we need someone who gets both brand and performance".

## Izan's vocabulary palette
cohesion · identity · taste · vibe · cultural weight · presence · aligned ·
systems · brand + performance · drops/launches as events · retention · customer
journey · touchpoint · campaign architecture · intersectional thinking ·
creative brain.

## Offer ladder / funnel
Content → Lead Magnet → DMs → **AI Designer Academy** (paid course) /
High-ticket diagnostic → **Agency services (7 lab)**.
CTAs in scripts/answers should route toward the AI Designer Academy or a
high-ticket diagnostic — never a generic "link in bio" or an invented offer.

## Proof discipline
No specific revenue/client figures are recorded in the knowledge base. Do NOT
fabricate numbers, client names, or case studies. When proof is used it must be
concrete and taste-credible — never round-number hype.
`

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const TOOLS = [
  { type: 'web_search_20260209', name: 'web_search' },
] as any

// Stream events as newline-delimited JSON
function encodeEvent(event: Record<string, any>): string {
  return JSON.stringify(event) + '\n'
}

export async function POST(req: NextRequest) {
  const { niche } = await req.json()

  if (!niche || typeof niche !== 'string') {
    return new Response(JSON.stringify({ error: 'Niche is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: Record<string, any>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)))
        } catch {
          closed = true
        }
      }
      const close = () => {
        if (!closed) {
          closed = true
          try { controller.close() } catch {}
        }
      }

      try {
        send({ type: 'status', text: `Searching for ${niche} RSS feeds and subreddits...` })

        const client = getClient()
        const messages: Anthropic.MessageParam[] = [
          {
            role: 'user',
            content: `You are helping a content creator in the "${niche}" niche find RSS feeds and subreddits to follow for news and inspiration.

Search the web to find REAL, ACTIVE RSS feeds and subreddits relevant to "${niche}".

Requirements:
- Find 5-8 RSS feeds that are currently active (published within the last few months)
- Find 3-5 active subreddits with decent subscriber counts
- Only include feeds/subreddits you've verified exist via web search
- For RSS feeds, find the actual RSS/Atom feed URL (usually ends in /feed, /rss, /atom.xml, or similar)
- For subreddits, just provide the subreddit name (e.g. "machinelearning" not "r/machinelearning")

After searching, respond with ONLY a JSON object in this exact format (no other text):
{
  "sources": [
    { "name": "Source Name", "source_type": "rss", "url": "https://example.com/feed", "color": "#hex" },
    { "name": "r/example", "source_type": "reddit", "url": "example", "color": "#hex" }
  ]
}

Use varied, visually distinct colors. For Reddit sources, "url" is just the subreddit name without "r/".`,
          },
        ]

        let response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          tools: TOOLS,
          messages,
        })

        // Stream tool use events and handle continuations
        let continuations = 0
        while (continuations < 8) {
          // Emit events for each content block
          for (const block of response.content) {
            if (block.type === 'text' && block.text.trim()) {
              send({ type: 'text', text: block.text })
            } else if (block.type === 'server_tool_use') {
              const toolBlock = block as any
              if (toolBlock.name === 'web_search') {
                const query = toolBlock.input?.query ?? ''
                send({ type: 'tool_start', tool: 'web_search', query })
              }
            } else if (block.type === 'web_search_tool_result') {
              const resultBlock = block as any
              const searches = Array.isArray(resultBlock.content) ? resultBlock.content : []
              for (const search of searches) {
                if (search.type === 'web_search_result' && search.title) {
                  send({
                    type: 'search_result',
                    title: search.title,
                    url: search.url,
                  })
                }
              }
            }
          }

          if (response.stop_reason !== 'pause_turn') break

          continuations++
          send({ type: 'status', text: 'Searching for more sources...' })
          messages.push({ role: 'assistant', content: response.content })
          response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            tools: TOOLS,
            messages,
          })
        }

        // Extract JSON from the final text block
        send({ type: 'status', text: 'Compiling results...' })

        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        )

        let sources: any[] = []

        if (textBlock) {
          // Try parsing directly
          let jsonText = textBlock.text.trim()
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (jsonMatch) jsonText = jsonMatch[1].trim()

          // Try to find JSON object in the text
          const objMatch = jsonText.match(/\{[\s\S]*"sources"\s*:\s*\[[\s\S]*\]\s*\}/)
          if (objMatch) jsonText = objMatch[0]

          try {
            const parsed = JSON.parse(jsonText)
            sources = parsed.sources ?? []
          } catch {
            // If parsing fails, do a second pass to extract structured data
            send({ type: 'status', text: 'Extracting source data...' })
            const extractResponse = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              messages: [
                {
                  role: 'user',
                  content: `Extract the RSS feeds and subreddits from this text and return ONLY a JSON object. No other text at all.

Text:
${textBlock.text}

Return format (no markdown, no explanation):
{"sources":[{"name":"...","source_type":"rss"|"reddit","url":"...","color":"#hex"}]}

For Reddit sources, "url" should be just the subreddit name. Use varied hex colors.`,
                },
              ],
            })
            const extractText = extractResponse.content.find(
              (b): b is Anthropic.TextBlock => b.type === 'text'
            )
            if (extractText) {
              let et = extractText.text.trim()
              const em = et.match(/```(?:json)?\s*([\s\S]*?)```/)
              if (em) et = em[1].trim()
              const om = et.match(/\{[\s\S]*"sources"\s*:\s*\[[\s\S]*\]\s*\}/)
              if (om) et = om[0]
              try {
                const parsed = JSON.parse(et)
                sources = parsed.sources ?? []
              } catch {
                // Give up
              }
            }
          }
        }

        // Validate and generate IDs
        const validSources = sources
          .map((s: any, i: number) => ({
            id: `discovered-${Date.now()}-${i}`,
            name: String(s.name ?? ''),
            source_type: s.source_type === 'reddit' ? 'reddit' as const : 'rss' as const,
            url: String(s.url ?? ''),
            color: String(s.color ?? '#666666'),
          }))
          .filter((s) => s.name && s.url)

        send({ type: 'done', sources: validSources })
      } catch (err) {
        console.error('News discovery error:', err)
        send({ type: 'error', text: 'Failed to discover sources. Try adding some manually.' })
      } finally {
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  })
}

'use client'

import { useState } from 'react'
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react'
import { avg, type AnalyticsData } from './analytics-types'

interface Insight {
  category: 'working' | 'attention' | 'recommendation'
  title: string
  description: string
  severity: 'green' | 'amber' | 'red'
}

export function AiInsightsPanel({ data }: { data: AnalyticsData }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)

  async function generateInsights() {
    setLoading(true)
    setError('')

    // Summarize data for the API
    const allIg = [...data.igPosts, ...data.igReels]
    const summary = {
      instagram: {
        posts: allIg.length,
        stories: data.igStories.length,
        followers: data.igStats?.Followers ?? 0,
        avgEngagement: avg(allIg.map(p => p.engagement)),
        totalReach: allIg.reduce((s, p) => s + p.reach, 0),
        topPost: allIg.sort((a, b) => b.engagement - a.engagement)[0]?.content?.slice(0, 100) ?? '',
        bottomPost: allIg.sort((a, b) => a.engagement - b.engagement)[0]?.content?.slice(0, 100) ?? '',
      },
      twitter: {
        posts: data.twPosts.length,
        followers: data.twStats?.Followers ?? 0,
        avgEngagement: avg(data.twPosts.map(p => p.totalEngagement)),
        totalImpressions: data.twPosts.reduce((s, p) => s + p.totalImpressions, 0),
      },
      linkedin: {
        posts: data.liPosts.length,
        followers: data.liStats?.Followers ?? 0,
        avgEngagement: avg(data.liPosts.map(p => p.totalEngagement)),
        totalImpressions: data.liPosts.reduce((s, p) => s + p.totalImpressions, 0),
      },
      youtube: {
        subscribers: data.ytStats?.Subscribers ?? 0,
        totalViews: data.ytTimeline.reduce((s, p) => s + p.value, 0) || data.ytPosts.reduce((s, p) => s + p.views, 0),
        videos: data.ytPosts.length,
        totalLikes: data.ytPosts.reduce((s, p) => s + p.likes, 0),
        avgEngagement: avg(data.ytPosts.map(p => p.engagement)),
        topVideo: [...data.ytPosts].sort((a, b) => b.views - a.views)[0]?.title?.slice(0, 100) ?? '',
      },
    }

    try {
      const res = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setInsights(result.insights ?? [])
      setGenerated(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  const categoryConfig = {
    working: { icon: TrendingUp, label: "What's Working", color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    attention: { icon: AlertTriangle, label: 'Needs Attention', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    recommendation: { icon: Lightbulb, label: 'Recommendations', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  }

  const severityColors = {
    green: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)', dot: '#10b981' },
    amber: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', dot: '#f59e0b' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)', dot: '#ef4444' },
  }

  if (!generated) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <h3 className="text-sm font-semibold text-white mb-1">AI Insights</h3>
        <p className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Analyze your content performance and get actionable recommendations
        </p>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: '#fff',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    )
  }

  // Group insights by category
  const grouped = {
    working: insights.filter(i => i.category === 'working'),
    attention: insights.filter(i => i.category === 'attention'),
    recommendation: insights.filter(i => i.category === 'recommendation'),
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-white">AI Insights</h2>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="text-[11px] px-3 py-1.5 rounded-md transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          {loading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {(['working', 'attention', 'recommendation'] as const).map(cat => {
        const items = grouped[cat]
        if (items.length === 0) return null
        const config = categoryConfig[cat]
        const Icon = config.icon
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
              <span className="text-[11px] font-semibold" style={{ color: config.color }}>{config.label}</span>
            </div>
            <div className="space-y-2">
              {items.map((insight, i) => {
                const sev = severityColors[insight.severity]
                return (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: sev.dot }} />
                      <div>
                        <p className="text-xs font-semibold text-white mb-0.5">{insight.title}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{insight.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

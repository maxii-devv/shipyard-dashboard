'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Youtube, Instagram, Linkedin, ArrowRight } from 'lucide-react'
import { Sparkline, TrendBadge } from '@/components/sparkline'

interface ActivityDay {
  total: number
  instagram: number
  linkedin: number
  youtube: number
}

interface PostingActivityData {
  activity: Record<string, ActivityDay>
  totals: { instagram: number; linkedin: number; youtube: number; total: number }
}

interface PlatformCardsProps {
  ytInProgress: number
  ytReady: number
  ytPublished: number
  igAiCount: number
  igPending: number
  liAiCount: number
  liPending: number
}

/** Aggregate daily activity into weekly buckets for the last N weeks */
function weeklyBuckets(activity: Record<string, ActivityDay>, platform: 'instagram' | 'linkedin' | 'youtube', weeks = 8): number[] {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const buckets: number[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    let count = 0
    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (w * 7 + d))
      const key = date.toISOString().slice(0, 10)
      count += activity[key]?.[platform] ?? 0
    }
    buckets.push(count)
  }

  return buckets
}

function PlatformCard({
  href,
  icon: Icon,
  name,
  iconBg,
  iconColor,
  sparkColor,
  hoverBorder,
  sparkData,
  children,
}: {
  href: string
  icon: React.ElementType
  name: string
  iconBg: string
  iconColor: string
  sparkColor: string
  hoverBorder: string
  sparkData: number[]
  children: React.ReactNode
}) {
  const hasData = sparkData.length > 1 && sparkData.some(v => v > 0)

  return (
    <Link href={href} className="block group">
      <div
        className={`relative rounded-xl overflow-hidden transition-all ${hoverBorder}`}
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Content layer */}
        <div className="relative z-10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
              </div>
              <span className="text-sm font-semibold text-white">{name}</span>
              {hasData && <TrendBadge data={sparkData} />}
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'white' }} />
          </div>
          {children}
        </div>

        {/* Sparkline — bleeds to bottom edge of card */}
        {hasData && (
          <div className="absolute bottom-0 left-0 right-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity">
            <Sparkline
              data={sparkData}
              color={sparkColor}
              width="100%"
              height={48}
              strokeWidth={1.5}
              showDot={false}
              fill={true}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

export function PlatformCards({
  ytInProgress, ytReady, ytPublished,
  igAiCount, igPending,
  liAiCount, liPending,
}: PlatformCardsProps) {
  const [activity, setActivity] = useState<Record<string, ActivityDay> | null>(null)

  useEffect(() => {
    const localDate = new Date().toLocaleDateString('en-CA')
    fetch(`/api/posting-activity?today=${localDate}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PostingActivityData | null) => {
        if (data?.activity) setActivity(data.activity)
      })
      .catch(() => {})
  }, [])

  const ytData = useMemo(() => activity ? weeklyBuckets(activity, 'youtube') : [], [activity])
  const igData = useMemo(() => activity ? weeklyBuckets(activity, 'instagram') : [], [activity])
  const liData = useMemo(() => activity ? weeklyBuckets(activity, 'linkedin') : [], [activity])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <PlatformCard
        href="/dashboard/youtube"
        icon={Youtube}
        name="YouTube"
        iconBg="rgba(220,38,38,0.12)"
        iconColor="#dc2626"
        sparkColor="#dc2626"
        hoverBorder="hover:border-red-600/25"
        sparkData={ytData}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-white">{ytInProgress}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(245,158,11,0.7)' }}>In Progress</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{ytReady}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(56,189,248,0.7)' }}>Ready</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{ytPublished}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(34,197,94,0.7)' }}>Published</p>
          </div>
        </div>
      </PlatformCard>

      <PlatformCard
        href="/dashboard/instagram"
        icon={Instagram}
        name="Instagram"
        iconBg="rgba(225,48,108,0.12)"
        iconColor="#e1306c"
        sparkColor="#e1306c"
        hoverBorder="hover:border-pink-500/25"
        sparkData={igData}
      >
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-white">{igAiCount}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>AI generated</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: igPending > 0 ? '#f59e0b' : 'white' }}>{igPending}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Pending</p>
          </div>
        </div>
      </PlatformCard>

      <PlatformCard
        href="/dashboard/linkedin"
        icon={Linkedin}
        name="LinkedIn"
        iconBg="rgba(0,119,181,0.12)"
        iconColor="#0ea5e9"
        sparkColor="#0ea5e9"
        hoverBorder="hover:border-sky-500/25"
        sparkData={liData}
      >
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-white">{liAiCount}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>AI generated</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: liPending > 0 ? '#f59e0b' : 'white' }}>{liPending}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Pending</p>
          </div>
        </div>
      </PlatformCard>
    </div>
  )
}

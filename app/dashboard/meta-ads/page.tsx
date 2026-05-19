import { MetaAdsClient } from './meta-ads-client'

const ACCENT = '#0866ff'

export default function MetaAdsPage() {
  return (
    <div className="p-8" style={{ background: '#262624', minHeight: '100vh' }}>
      <div className="max-w-6xl">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={ACCENT}>
              <path d="M17.5 5c-2.4 0-4.3 1.8-5.5 4-1.2-2.2-3.1-4-5.5-4C3.4 5 1.5 8.1 1.5 12s1.9 7 4.9 7c2.4 0 4.3-1.8 5.6-4 1.3 2.2 3.2 4 5.5 4 3 0 4.9-3.1 4.9-7s-1.9-7-4.9-7Zm-11 11.5c-1.6 0-2.6-2-2.6-4.5s1-4.5 2.6-4.5c1.6 0 2.9 2 4 4.5-1.1 2.5-2.4 4.5-4 4.5Zm11 0c-1.6 0-2.9-2-4-4.5 1.1-2.5 2.4-4.5 4-4.5 1.6 0 2.6 2 2.6 4.5s-1 4.5-2.6 4.5Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#fff' }}>
              Meta Ads
            </h1>
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Spend, ROAS &amp; campaign verdicts — what to kill, what to scale
            </p>
          </div>
        </div>

        <div className="mt-6">
          <MetaAdsClient />
        </div>
      </div>
    </div>
  )
}

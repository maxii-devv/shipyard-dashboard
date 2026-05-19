interface PlatformPlaceholderProps {
  platform: string
  handle?: string
  accentColor: string
  icon: React.ReactNode
  description: string
  comingSoonItems: string[]
}

export function PlatformPlaceholder({
  platform,
  handle,
  accentColor,
  icon,
  description,
  comingSoonItems,
}: PlatformPlaceholderProps) {
  return (
    <div className="p-8" style={{ background: '#262624', minHeight: '100vh' }}>
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
          >
            <div style={{ color: accentColor }}>{icon}</div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#fff' }}>
              {platform}
            </h1>
            {handle && (
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {handle}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 600 }}>
          {description}
        </p>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{
            background: '#2d2c2a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}10` }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold" style={{ color: '#fff' }}>
                Not connected yet
              </h2>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Connect your {platform} account to start syncing performance data.
              </p>
              <button
                disabled
                className="mt-4 px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity cursor-not-allowed"
                style={{
                  background: accentColor,
                  color: '#fff',
                  opacity: 0.6,
                }}
              >
                Connect {platform}
              </button>
              <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Integration coming soon
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p
            className="text-[10px] mb-3 font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Coming soon
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {comingSoonItems.map((item) => (
              <div
                key={item}
                className="px-4 py-3 rounded-lg text-[13px]"
                style={{
                  background: '#2d2c2a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <span style={{ color: accentColor, marginRight: 8 }}>•</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { AssetCard } from '@/components/asset-card'
import { VideoActions } from '@/components/video-actions'
import { ABVariantSection } from '@/components/ab-variant-section'
import { VideoDetailTabs } from '@/components/video-detail-tabs'
import { RemixSources } from '@/components/remix-sources'
import { EditingSection } from '@/components/editing-section'
import { AttachmentsSection } from '@/components/attachments-section'
import { Asset, AssetType } from '@/lib/types'

const WRITING_ASSETS: AssetType[] = ['intro', 'structure', 'outro']
const ALL_ASSET_TYPES: AssetType[] = ['title', 'thumbnail', 'intro', 'structure', 'outro', 'script', 'description', 'tags']

const statusConfig = {
  in_progress: { label: 'In Progress', cls: 'text-amber-400', dot: 'bg-amber-400' },
  ready_to_create: { label: 'Ready to Create', cls: 'text-pink-400', dot: 'bg-pink-400' },
  editing: { label: 'Editing', cls: 'text-purple-400', dot: 'bg-purple-400' },
  ready: { label: 'Ready', cls: 'text-sky-400', dot: 'bg-sky-400' },
  published: { label: 'Published', cls: 'text-emerald-400', dot: 'bg-emerald-400' },
  backlog: { label: 'Backlog', cls: 'text-violet-400', dot: 'bg-violet-400' },
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let video: any, videoThumbnails: any[], abVariants: any[], attachments: any[]

  try {
    const supabase = await createClient()

    const [v, vt, ab, att] = await Promise.all([
      supabase.from('videos').select('*, assets(*)').eq('id', id).single(),
      supabase
        .from('video_thumbnails')
        .select('*, thumbnail:thumbnails(*)')
        .eq('video_id', id)
        .order('is_chosen', { ascending: false }),
      supabase
        .from('video_ab_variants')
        .select('*, thumbnail:thumbnails(*)')
        .eq('video_id', id)
        .order('variant', { ascending: true }),
      supabase
        .from('video_attachments')
        .select('*')
        .eq('video_id', id)
        .order('sort_order', { ascending: true }),
    ])

    if (v.error || !v.data) notFound()

    video = v.data
    videoThumbnails = vt.data ?? []
    abVariants = ab.data ?? []
    attachments = att.data ?? []
  } catch (err: any) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center" style={{ background: '#262624' }}>
        <p className="text-red-400 text-sm font-mono mb-2">Server error loading video page</p>
        <p className="text-white/30 text-xs font-mono">{String(err?.message ?? err)}</p>
      </div>
    )
  }

  const assetsByType = (video.assets ?? []).reduce((acc: Record<string, Asset>, asset: Asset) => {
    if (!acc[asset.type] || asset.version > acc[asset.type].version) {
      acc[asset.type] = asset
    }
    return acc
  }, {})

  const cfg = statusConfig[video.status as keyof typeof statusConfig]

  const allAssets: Asset[] = Object.values(assetsByType)
  const approved = allAssets.filter((a: Asset) => a.status === 'approved').length
  const pendingReview = allAssets.filter((a: Asset) => a.status === 'pending_review').length
  const revisionNeeded = allAssets.filter((a: Asset) => a.status === 'revision_requested').length
  const totalTypes = ALL_ASSET_TYPES.length
  const progressPct = Math.round((approved / totalTypes) * 100)

  const descriptionAsset = assetsByType['description'] ?? null

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#262624' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/dashboard/youtube"
          className="inline-flex items-center gap-1.5 text-sm text-white/35 hover:text-white/65 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> YouTube
        </Link>

        {/* Title + status */}
        <div className="space-y-2">
          {cfg && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className={`text-sm font-medium ${cfg.cls}`}>{cfg.label}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-white/90 leading-snug">{video.title}</h1>
          <div className="flex items-center gap-4">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Created {new Date(video.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {video.youtube_url && (
              <a
                href={video.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on YouTube
              </a>
            )}
          </div>
        </div>

        {/* Hero: A/B variants + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: A/B test variants */}
          <div className="lg:col-span-2">
            <ABVariantSection
              videoId={id}
              initialVariants={abVariants}
              videoTitle={video.title}
              chosenThumbnailId={videoThumbnails.find((vt: any) => vt.is_chosen)?.thumbnail_id ?? null}
            />
          </div>

          {/* Right: actions, progress, remix */}
          <div className="space-y-4">
            {/* Actions */}
            <VideoActions video={video} />

            {/* Asset progress */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Assets</p>
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span className="text-white font-semibold">{approved}</span>/{totalTypes}
                </p>
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100 ? '#10b981' : '#dc2626',
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {approved > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> {approved} approved
                  </span>
                )}
                {pendingReview > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" /> {pendingReview} pending
                  </span>
                )}
                {revisionNeeded > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" /> {revisionNeeded} revision{revisionNeeded > 1 ? 's' : ''}
                  </span>
                )}
                {approved === 0 && pendingReview === 0 && revisionNeeded === 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>No assets yet</span>
                )}
              </div>
            </div>

            {/* Remix sources */}
            <div className="rounded-xl p-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
              <RemixSources contentType="video" contentId={id} />
            </div>
          </div>
        </div>

        {/* Tabbed workspace */}
        <VideoDetailTabs
          assetSummary={`${WRITING_ASSETS.filter(t => assetsByType[t]).length}/${WRITING_ASSETS.length}`}
          attachmentCount={attachments.length}
          assetsContent={
            <div className="space-y-3 pt-4">
              {WRITING_ASSETS.map(type => (
                <AssetCard
                  key={type}
                  type={type}
                  asset={assetsByType[type] ?? null}
                  videoId={video.id}
                />
              ))}
            </div>
          }
          attachmentsContent={
            <AttachmentsSection
              videoId={id}
              initialAttachments={attachments}
            />
          }
          publishingContent={
            <EditingSection
              videoId={id}
              videoTitle={video.title}
              initialVideoFilePath={(video as any).video_file_path ?? null}
              initialVideoFileName={(video as any).video_file_name ?? null}
              initialVideoFileSize={(video as any).video_file_size ?? null}
              initialDescription={descriptionAsset?.content ?? null}
              initialDescriptionStatus={descriptionAsset?.status ?? null}
            />
          }
        />
      </div>
    </div>
  )
}

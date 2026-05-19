'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter, usePathname } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

// ─── Tour Step Definition ────────────────────────────────────────────────────

interface TourStep {
  /** CSS selector or data-tour attribute value */
  target: string
  /** Title shown in the tooltip */
  title: string
  /** Description text */
  description: string
  /** Which page this step should appear on */
  page: string
  /** Position of tooltip relative to target */
  position: 'top' | 'bottom' | 'left' | 'right'
  /** Optional action label for the CTA */
  action?: string
  /** If true, advance when user clicks the target element */
  advanceOnClick?: boolean
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Your command center',
    description: 'This sidebar is how you navigate Shipyard. All your platforms, content tools, and analytics are organized here.',
    page: '/dashboard',
    position: 'right',
  },
  {
    target: '[data-tour="pipeline"]',
    title: 'Content pipeline',
    description: 'Track your content from draft to published. This pipeline shows you exactly where everything stands across all platforms.',
    page: '/dashboard',
    position: 'top',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick actions',
    description: 'Jump to your most-used tools. Thumbnails, analytics, calendar, research, and competitors — one click away.',
    page: '/dashboard',
    position: 'top',
  },
  {
    target: '[data-tour="nav-competitors"]',
    title: 'Track competitors',
    description: 'Keep tabs on other creators in your niche. Monitor their posting frequency, view counts, and content strategy.',
    page: '/dashboard',
    position: 'right',
    action: 'Go to Competitors',
  },
  {
    target: '[data-tour="add-competitor-btn"]',
    title: 'Add your first competitor',
    description: 'Add a YouTube channel or Instagram account to start tracking. You\'ll get alerts when they post and insights into their strategy.',
    page: '/dashboard/competitors',
    position: 'bottom',
    action: 'Click to add',
    advanceOnClick: true,
  },
]

// ─── Context ─────────────────────────────────────────────────────────────────

interface TourContextValue {
  isActive: boolean
  currentStep: number
  startTour: () => void
  endTour: () => void
}

const TourContext = createContext<TourContextValue>({
  isActive: false,
  currentStep: 0,
  startTour: () => {},
  endTour: () => {},
})

export const useTour = () => useContext(TourContext)

// ─── Claude Mascot ───────────────────────────────────────────────────────────

function ClaudeMascot({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/clawd.png" alt="Claude" className={className} style={{ objectFit: 'contain' }} />
  )
}

// ─── Spotlight Overlay ───────────────────────────────────────────────────────

function SpotlightOverlay({
  targetRect,
  children,
}: {
  targetRect: DOMRect | null
  children: React.ReactNode
}) {
  if (!targetRect) return null

  const padding = 8
  const borderRadius = 12
  const x = targetRect.left - padding
  const y = targetRect.top - padding
  const w = targetRect.width + padding * 2
  const h = targetRect.height + padding * 2

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
        />
      </svg>

      {/* Highlight border around target */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius,
          border: '2px solid rgba(245, 158, 11, 0.5)',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)',
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      />

      {/* Tooltip content positioned relative to target */}
      {children}
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onAction,
}: {
  step: TourStep
  stepIndex: number
  totalSteps: number
  targetRect: DOMRect
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onAction: () => void
}) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!tooltipRef.current) return
    const tt = tooltipRef.current.getBoundingClientRect()
    const gap = 16
    let top = 0
    let left = 0

    switch (step.position) {
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tt.height / 2
        left = targetRect.right + gap
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tt.height / 2
        left = targetRect.left - tt.width - gap
        break
      case 'bottom':
        top = targetRect.bottom + gap
        left = targetRect.left + targetRect.width / 2 - tt.width / 2
        break
      case 'top':
        top = targetRect.top - tt.height - gap
        left = targetRect.left + targetRect.width / 2 - tt.width / 2
        break
    }

    // Clamp to viewport
    top = Math.max(12, Math.min(top, window.innerHeight - tt.height - 12))
    left = Math.max(12, Math.min(left, window.innerWidth - tt.width - 12))

    setPos({ top, left })
  }, [targetRect, step.position])

  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1

  return (
    <motion.div
      ref={tooltipRef}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, pointerEvents: 'auto' }}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div
        className="w-80 rounded-xl p-5 shadow-2xl"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header with mascot */}
        <div className="flex items-start gap-3 mb-3">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <ClaudeMascot className="w-10 h-10 flex-shrink-0" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">{step.title}</h3>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {step.description}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="p-1 rounded-md transition-colors hover:bg-white/10 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 transition-all duration-300"
              style={{
                background: i <= stepIndex ? '#F59E0B' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors disabled:opacity-20"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {stepIndex + 1}/{totalSteps}
            </span>
            {step.action ? (
              <button
                onClick={onAction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-black transition-opacity hover:opacity-90"
                style={{ background: '#F59E0B' }}
              >
                {step.action} <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-black transition-opacity hover:opacity-90"
                style={{ background: '#F59E0B' }}
              >
                {isLast ? 'Finish' : 'Next'} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Welcome Modal ───────────────────────────────────────────────────────────

function WelcomeModal({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <motion.div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          className="mx-auto mb-4"
        >
          <ClaudeMascot className="w-20 h-20 mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-white mb-2">Hey, welcome aboard!</h2>
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            I&apos;m Claude, your Shipyard guide. Let me walk you through the dashboard so you know where everything is.
          </p>
          <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Takes about 60 seconds
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={onStart}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90"
            style={{ background: '#F59E0B' }}
          >
            <Sparkles className="w-4 h-4" /> Show me around
          </button>
          <button
            onClick={onSkip}
            className="text-xs py-2 transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            I&apos;ll explore on my own
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [showWelcome, setShowWelcome] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [checked, setChecked] = useState(false)
  const observerRef = useRef<MutationObserver | null>(null)

  // Check if tour should auto-start
  useEffect(() => {
    if (checked) return
    const shouldStart = sessionStorage.getItem('shipyard_start_tour')
    if (shouldStart === 'true' && pathname === '/dashboard') {
      sessionStorage.removeItem('shipyard_start_tour')
      setShowWelcome(true)
    }
    setChecked(true)
  }, [pathname, checked])

  // Find and track the target element for the current step
  const updateTargetRect = useCallback(() => {
    if (!isActive) return
    const step = TOUR_STEPS[currentStep]
    if (!step) return

    const el = document.querySelector(step.target)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [isActive, currentStep])

  useEffect(() => {
    updateTargetRect()

    // Re-measure on scroll/resize
    window.addEventListener('scroll', updateTargetRect, true)
    window.addEventListener('resize', updateTargetRect)

    // Watch for DOM changes (elements mounting)
    observerRef.current = new MutationObserver(updateTargetRect)
    observerRef.current.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('scroll', updateTargetRect, true)
      window.removeEventListener('resize', updateTargetRect)
      observerRef.current?.disconnect()
    }
  }, [updateTargetRect])

  // Navigate to the correct page for the current step
  useEffect(() => {
    if (!isActive) return
    const step = TOUR_STEPS[currentStep]
    if (!step) return
    if (pathname !== step.page) {
      router.push(step.page)
    }
  }, [isActive, currentStep, pathname, router])

  const completeTour = useCallback(async () => {
    setIsActive(false)
    setShowWelcome(false)
    setCurrentStep(0)
    setTargetRect(null)

    try {
      await fetch('/api/tour', { method: 'POST' })
    } catch {
      // Non-critical
    }
  }, [])

  const startTour = useCallback(() => {
    setShowWelcome(false)
    setIsActive(true)
    setCurrentStep(0)
  }, [])

  const endTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  const goNext = useCallback(() => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      completeTour()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, completeTour])

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleAction = useCallback(() => {
    const step = TOUR_STEPS[currentStep]
    if (!step) return

    if (step.advanceOnClick) {
      // Let the user click the actual element
      goNext()
    } else {
      // Navigate to next step (which will be on a different page)
      goNext()
    }
  }, [currentStep, goNext])

  // Handle clicking the spotlight target for advanceOnClick steps
  useEffect(() => {
    if (!isActive) return
    const step = TOUR_STEPS[currentStep]
    if (!step?.advanceOnClick) return

    const el = document.querySelector(step.target)
    if (!el) return

    const handler = () => {
      // Small delay so the click registers on the element first
      setTimeout(() => goNext(), 200)
    }

    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [isActive, currentStep, goNext])

  return (
    <TourContext.Provider value={{ isActive, currentStep, startTour, endTour }}>
      {children}

      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal
            onStart={startTour}
            onSkip={completeTour}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isActive && targetRect && (
          <SpotlightOverlay targetRect={targetRect}>
            <TourTooltip
              step={TOUR_STEPS[currentStep]}
              stepIndex={currentStep}
              totalSteps={TOUR_STEPS.length}
              targetRect={targetRect}
              onNext={goNext}
              onPrev={goPrev}
              onSkip={endTour}
              onAction={handleAction}
            />
          </SpotlightOverlay>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  )
}

'use client'

import { useProfilePicture } from './profile-picture-context'

interface ProfileAvatarProps {
  /** Pixel size (width & height) */
  size: number
  /** Fallback text when no image (e.g. "TG" or "T") */
  fallback: string
  /** Extra tailwind classes on the outer container */
  className?: string
  /** Inline styles on the outer container */
  style?: React.CSSProperties
  /** Font size class for the fallback text */
  fallbackTextClass?: string
  /** Color class for the fallback text */
  fallbackTextColor?: string
}

export default function ProfileAvatar({
  size,
  fallback,
  className = '',
  style,
  fallbackTextClass = 'text-sm',
  fallbackTextColor = 'text-white/30',
}: ProfileAvatarProps) {
  const { url } = useProfilePicture()

  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {url ? (
        <img
          src={url}
          alt="Profile"
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span className={`font-bold ${fallbackTextClass} ${fallbackTextColor}`}>
          {fallback}
        </span>
      )}
    </div>
  )
}

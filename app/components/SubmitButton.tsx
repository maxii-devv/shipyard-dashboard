'use client'

import { useFormStatus } from 'react-dom'
import styles from './SubmitButton.module.css'

export function SubmitButton({
  children,
  className,
  pendingLabel,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      <span className={styles.label}>
        {pending && pendingLabel ? pendingLabel : children}
      </span>
      {pending && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  )
}

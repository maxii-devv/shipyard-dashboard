'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface ProfilePictureContextValue {
  url: string | null
  loading: boolean
  refresh: () => void
}

const ProfilePictureContext = createContext<ProfilePictureContextValue>({
  url: null,
  loading: true,
  refresh: () => {},
})

export function useProfilePicture() {
  return useContext(ProfilePictureContext)
}

export function ProfilePictureProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/settings/profile-picture')
      .then(r => r.json())
      .then(data => setUrl(data.url ?? null))
      .catch(() => setUrl(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <ProfilePictureContext.Provider value={{ url, loading, refresh }}>
      {children}
    </ProfilePictureContext.Provider>
  )
}

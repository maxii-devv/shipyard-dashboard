'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="btn btn-xs btn-ghost text-gray-500 hover:text-white w-full justify-start gap-2 px-2"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  )
}

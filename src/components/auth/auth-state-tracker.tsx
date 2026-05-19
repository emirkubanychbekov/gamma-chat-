'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function AuthStateTracker() {
  const supabase = createClient()

  useEffect(() => {
    const updateLastSeen = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          updateLastSeen()
        }
      }
    )

    // Also update on mount if logged in
    updateLastSeen()

    // Periodically update last seen if the tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateLastSeen()
      }
    }, 1000 * 60 * 5) // Every 5 minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [supabase])

  return null
}

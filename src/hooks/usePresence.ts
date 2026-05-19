'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimePresenceState } from '@supabase/supabase-js'

export function usePresence(channelId: string, userId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    const channelName = `presence:${channelId}_${Date.now()}`
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const userIds = Object.keys(state)
        setOnlineUsers(userIds)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => [...new Set([...prev, key])])
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== key))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId: typingUserId, isTyping } = payload
        setTypingUsers((prev) => {
          if (isTyping) {
            return [...new Set([...prev, typingUserId])]
          } else {
            return prev.filter((id) => id !== typingUserId)
          }
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [channelId, userId, supabase])

  const setTyping = (isTyping: boolean) => {
    const channel = supabase.channel(`presence:${channelId}`)
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping },
    })
  }

  return { onlineUsers, typingUsers, setTyping }
}

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/lib/types/chat'

export function useRealtimeMessages(channelId: string, initialMessages: Message[]) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const isMounted = useRef(true)

  const addOptimisticMessage = (message: Message) => {
    setMessages((prev) => [...prev, message])
    
    setTimeout(() => {
      if (!isMounted.current) return
      setMessages((prev) => 
        prev.map(m => m.id === message.id ? { ...m, isOptimistic: false } : m)
      )
    }, 2500)
  }

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    setMessages(initialMessages)
  }, [channelId, initialMessages])

  useEffect(() => {
    if (!channelId) return

    console.log('📡 Realtime: Initializing for channel:', channelId)
    
    const channelName = `chat:${channelId}_${Date.now()}`
    const channel = supabase.channel(channelName)

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (!isMounted.current) return

          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id)
              if (exists) return prev

              const optimisticIndex = prev.findIndex(m => 
                m.isOptimistic && (
                  (m.content && m.content === newMsg.content) || 
                  (!m.content && m.type === newMsg.type)
                )
              )

              if (optimisticIndex !== -1) {
                const newMessages = [...prev]
                newMessages[optimisticIndex] = { ...newMsg, isOptimistic: false }
                return newMessages
              }

              return [...prev, newMsg]
            })

            // Enrich with profile/attachments
            const { data: fullMsg } = await supabase
              .from('messages')
              .select('*, profiles:sender_id(*), attachments(*)')
              .eq('id', newMsg.id)
              .single()

            if (fullMsg && isMounted.current) {
              setMessages((prev) => 
                prev.map(m => m.id === newMsg.id ? { ...fullMsg, isOptimistic: false } : m)
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) => msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attachments' },
        (payload) => {
          if (!isMounted.current) return
          setMessages((prev) => 
            prev.map((msg) => msg.id === payload.new.message_id 
              ? { ...msg, attachments: [...(msg.attachments || []), payload.new] } 
              : msg
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        async (payload) => {
          if (!isMounted.current) return
          const messageId = payload.eventType === 'DELETE' ? payload.old.message_id : payload.new.message_id
          const { data: reactions } = await supabase.from('reactions').select('*').eq('message_id', messageId)
          
          if (isMounted.current) {
            setMessages((prev) =>
              prev.map((msg) => msg.id === messageId ? { ...msg, reactions: reactions || [] } : msg)
            )
          }
        }
      )

    // Safe subscription
    channel.subscribe((status) => {
      if (isMounted.current) {
        console.log(`🔌 Channel ${channelId} Status:`, status)
      }
    })

    return () => {
      console.log('🧹 Realtime: Cleaning up channel:', channelId)
      // Unsubscribe gracefully
      channel.unsubscribe().catch(err => {
        console.warn('Silent cleanup error:', err.message)
      })
    }
  }, [channelId, supabase])

  return { messages, setMessages, addOptimisticMessage }
}

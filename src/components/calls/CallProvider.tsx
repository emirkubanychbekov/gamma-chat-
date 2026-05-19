'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { CallPanel } from './CallPanel'
import { IncomingCallModal } from './IncomingCallModal'

interface CallContextType {
  activeCall: any | null
  callToken: string | null
  initiateCall: (channelId: string, type: 'audio' | 'video') => Promise<void>
  joinCall: (call: any) => Promise<void>
  endCall: () => Promise<void>
  isIncomingCall: boolean
  incomingCallData: any | null
  acceptCall: () => void
  declineCall: () => void
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [activeCall, setActiveCall] = useState<any | null>(null)
  const [callToken, setCallToken] = useState<string | null>(null)
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null)

  const activeCallRef = useRef<any>(null)
  const signalingChannelRef = useRef<any>(null)

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  // 1. Listen for NEW Incoming Calls (Global)
  useEffect(() => {
    const channel = supabase
      .channel('global_call_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (payload.new.caller_id !== user?.id && payload.new.status === 'ongoing' && !activeCallRef.current) {
          // Verify user is in this channel
          const { data: member } = await supabase
            .from('channel_members')
            .select('*')
            .eq('channel_id', payload.new.channel_id)
            .eq('user_id', user?.id)
            .single()

          if (member) {
            setIncomingCallData(payload.new)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // 2. Listen for Call Status Updates (Specific to the active call)
  useEffect(() => {
    if (!activeCall?.id) return

    const channel = supabase
      .channel(`call_session:${activeCall.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'calls',
        filter: `id=eq.${activeCall.id}` 
      }, (payload) => {
        if (payload.new.status === 'ended') {
          console.log('🏁 Remote peer ended the call')
          handleCleanup()
        }
      })
      .on('broadcast', { event: 'hangup' }, () => {
        console.log('🏁 Hang-up signal received via broadcast')
        handleCleanup()
      })
      .subscribe()

    signalingChannelRef.current = channel

    return () => { supabase.removeChannel(channel) }
  }, [activeCall?.id, supabase])

  const handleCleanup = () => {
    setActiveCall(null)
    setCallToken(null)
    setIncomingCallData(null)
  }

  const initiateCall = async (channelId: string, type: 'audio' | 'video') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const roomName = `room_${channelId}_${Date.now()}`
    
    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        channel_id: channelId,
        caller_id: user.id,
        type,
        room_name: roomName,
        status: 'ongoing'
      })
      .select()
      .single()

    if (error) throw error

    // Insert a rich 'call' type message with metadata for the CallMessage card
    const { data: callMsg } = await supabase.from('messages').insert({
      channel_id: channelId,
      sender_id: user.id,
      content: `${type === 'video' ? '📹' : '📞'} Started a ${type} call`,
      type: 'call',
      metadata: {
        call_id: call.id,
        room_name: roomName,
        call_type: type,
        ended_at: null,
        duration: null,
      }
    }).select().single()

    // Store message id on the call object so endCall can patch it
    if (callMsg) {
      call._msg_id = callMsg.id
    }

    try {
      const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', user.id).single()
      const participantName = encodeURIComponent(profile?.display_name || profile?.username || 'User')

      const response = await fetch(`/api/livekit?room=${roomName}&username=${user.id}&participantName=${participantName}`)
      const { token, error: tokenError } = await response.json()
      if (tokenError) throw new Error(tokenError)
      setCallToken(token)
      setActiveCall(call)
    } catch (err) {
      console.error('Failed to start call:', err)
      toast.error('Could not connect to call server')
    }
  }

  const joinCall = async (call: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', user.id).single()
      const participantName = encodeURIComponent(profile?.display_name || profile?.username || 'User')

      const response = await fetch(`/api/livekit?room=${call.room_name}&username=${user.id}&participantName=${participantName}`)
      const { token, error: tokenError } = await response.json()
      if (tokenError) throw new Error(tokenError)
      setCallToken(token)
      setActiveCall(call)
      setIncomingCallData(null)
    } catch (err) {
      console.error('Failed to join call:', err)
      toast.error('Failed to join call')
    }
  }

  const endCall = async () => {
    const callToStop = activeCallRef.current
    if (callToStop) {
      const endedAt = new Date().toISOString()
      const durationSecs = callToStop.created_at 
        ? Math.round((Date.now() - new Date(callToStop.created_at).getTime()) / 1000)
        : 0
      const durationFmt = `${Math.floor(durationSecs / 60)}:${String(durationSecs % 60).padStart(2, '0')}`

      // 1. Tell the peer to hang up immediately
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'hangup',
        payload: { callId: callToStop.id }
      })

      // 2. Update calls table
      await supabase
        .from('calls')
        .update({ status: 'ended' })
        .eq('id', callToStop.id)

      // 3. Patch the call message metadata so card shows "Call ended" + duration
      if (callToStop._msg_id) {
        await supabase
          .from('messages')
          .update({
            metadata: {
              call_id: callToStop.id,
              room_name: callToStop.room_name,
              call_type: callToStop.type,
              ended_at: endedAt,
              duration: durationFmt,
            }
          })
          .eq('id', callToStop._msg_id)
      }
    }
    handleCleanup()
  }

  return (
    <CallContext.Provider value={{ 
      activeCall, 
      callToken, 
      initiateCall, 
      joinCall, 
      endCall,
      isIncomingCall: !!incomingCallData,
      incomingCallData,
      acceptCall: () => incomingCallData && joinCall(incomingCallData),
      declineCall: () => setIncomingCallData(null)
    }}>
      {children}
      {incomingCallData && (
        <IncomingCallModal 
          call={incomingCallData} 
          onAccept={() => joinCall(incomingCallData)} 
          onDecline={() => setIncomingCallData(null)} 
        />
      )}
      <CallPanel />
    </CallContext.Provider>
  )
}

export const useCall = () => {
  const context = useContext(CallContext)
  if (!context) throw new Error('useCall must be used within CallProvider')
  return context
}

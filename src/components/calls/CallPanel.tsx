'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useConnectionState,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track, ConnectionState, LocalTrack, createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client'
import { useCall } from './CallProvider'
import { Minimize2, Maximize2, PhoneOff, Video, Mic, ShieldCheck, Loader2, VideoOff, Camera, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'
import { toast } from 'react-hot-toast'
import '@livekit/components-styles'

export function CallPanel() {
  const { activeCall, callToken, endCall } = useCall()
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [preAcquiredTracks, setPreAcquiredTracks] = useState<LocalTrack[]>([])
  const [isAcquiring, setIsAcquiring] = useState(false)
  const [hardError, setHardError] = useState<string | null>(null)

  const roomOptions = useMemo(() => ({
    publishDefaults: { simulcast: true },
    adaptiveStream: true,
  }), [])

  // HARDWARE TEST: Using native getUserMedia to verify permissions before handing off to LiveKit
  const handleHardJoin = async () => {
    setIsAcquiring(true)
    setHardError(null)
    
    try {
      console.log('🚀 Requesting hardware permissions...')
      
      // 1. Check Site Security
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error("INSECURE CONTEXT: Browser blocks cameras on non-HTTPS sites. Please use localhost:3000.")
      }

      // 2. Raw Test Request
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.type === 'video'
      })
      
      // Immediately release the tracks so LiveKit components can grab them properly with the right dimensions
      stream.getTracks().forEach(track => track.stop())

      setHasJoined(true)
      toast.success("Hardware Access Granted!")
    } catch (err: any) {
      console.error('💥 BARE METAL FAILURE:', err)
      let msg = err.message || "Unknown hardware error"
      if (err.name === 'NotAllowedError') msg = "Permission Denied: Please reset camera permissions in your browser URL bar."
      if (err.name === 'NotFoundError') msg = "No Camera Found: Please check if your camera is plugged in."
      if (err.name === 'NotReadableError') msg = "Hardware Busy: Another app (Zoom/Teams) is using your camera."
      
      setHardError(msg)
      toast.error(msg)
    } finally {
      setIsAcquiring(false)
    }
  }

  if (!activeCall || !callToken || typeof window === 'undefined') return null

  if (!hasJoined) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center p-6">
        <div className="relative w-full max-w-md glass border border-white/10 rounded-[40px] p-10 flex flex-col items-center gap-8 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-white italic">Hardware Check</h2>
            <p className="text-slate-400 text-sm leading-relaxed px-4">
              Click below to perform a bare-metal hardware test and join the call.
            </p>
          </div>

          {hardError && (
            <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-200">Hardware Failure</p>
                <p className="text-[10px] text-red-400 leading-tight">{hardError}</p>
              </div>
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleHardJoin}
              disabled={isAcquiring}
              className="w-full py-5 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isAcquiring ? <Loader2 className="w-5 h-5 animate-spin" /> : "ENABLE CAMERA & JOIN"}
            </button>
            <button onClick={endCall} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all">Cancel</button>
          </div>
          
          <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold">
            Current Host: {window.location.hostname}
          </p>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div style={{ zIndex: 99999 }} className={cn("fixed transition-all duration-500 ease-in-out bg-slate-950 shadow-2xl overflow-hidden flex flex-col", isMinimized ? "bottom-6 right-6 w-80 h-48 rounded-3xl border border-white/20" : "inset-0 md:inset-10 md:rounded-[40px] border border-white/10")}>
      {/* Minimize / Maximize toggle — always on top */}
      <button
        onClick={() => setIsMinimized(prev => !prev)}
        className="absolute top-4 right-4 z-[100001] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
        title={isMinimized ? 'Maximize' : 'Minimize'}
      >
        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
      </button>

      <div className="flex-1 relative">
        <LiveKitRoom
          video={activeCall.type === 'video'}
          audio={true}
          token={callToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          onDisconnected={endCall}
          connect={true}
          options={roomOptions}
          className="h-full flex flex-col"
        >
          <RoomManager activeCall={activeCall} isMinimized={isMinimized} onEnd={endCall} />
        </LiveKitRoom>
      </div>
    </div>,
    document.body
  )
}

function RoomManager({ activeCall, isMinimized, onEnd }: { activeCall: any, isMinimized: boolean, onEnd: () => void }) {
  const connectionState = useConnectionState()

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-950">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Securing Line...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 relative">
        {activeCall.type === 'video' ? <VideoConference /> : (
          <>
            <AudioGrid />
            <RoomAudioRenderer />
          </>
        )}
      </div>
      {!isMinimized && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 shadow-2xl">
           <ControlBar variation="minimal" controls={{ leave: false }} />
           <div className="w-px h-6 bg-white/10 mx-2" />
           <button onClick={onEnd} className="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all active:scale-95"><PhoneOff className="w-5 h-5" /></button>
        </div>
      )}
    </>
  )
}

function AudioGrid() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: false })
  return (
    <div className="flex flex-wrap gap-12 justify-center p-8 bg-slate-950 h-full">
      {tracks.map((track) => (
        <div key={track.participant.identity} className="flex flex-col items-center gap-4">
          <div className={cn("w-32 h-32 rounded-full bg-slate-800 border-4 border-white/5 flex items-center justify-center transition-all duration-300 relative", track.participant.isSpeaking && "border-primary shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-110")}>
            <div className="text-3xl font-bold text-slate-300 uppercase">{track.participant.identity[0]}</div>
          </div>
          <span className="text-sm font-bold text-white">{track.participant.name || 'User'}</span>
        </div>
      ))}
    </div>
  )
}

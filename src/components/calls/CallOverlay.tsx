'use client'

import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer, 
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import '@livekit/components-styles'

interface CallOverlayProps {
  token: string
  onEnd: () => void
  type: 'audio' | 'video'
}

import { createPortal } from 'react-dom'

export function CallOverlay({ token, onEnd, type }: CallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  if (typeof window === 'undefined') return null

  return createPortal(
    <div 
      style={{ zIndex: 99999 }}
      className={cn(
        "fixed transition-all duration-500 ease-in-out bg-slate-950 shadow-2xl",
        isMinimized 
          ? "bottom-6 right-6 w-80 h-48 rounded-3xl overflow-hidden border border-white/20" 
          : "inset-0 flex flex-col"
      )}
    >
      {/* Emergency End Call (Always Visible) */}
      <button 
        onClick={onEnd}
        className="absolute top-6 right-6 z-[100000] p-3 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-xl active:scale-95 transition-all"
        title="End Call"
      >
        <PhoneOff className="w-6 h-6" />
      </button>

      <LiveKitRoom
        video={type === 'video'}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onDisconnected={onEnd}
        connect={true}
        className="h-full flex flex-col relative"
      >
        <VideoConference />
        <RoomAudioRenderer />
        
        {/* Minimize Toggle */}
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute top-6 right-20 z-[100000] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
        >
          {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
        </button>
      </LiveKitRoom>
    </div>,
    document.body
  )
}

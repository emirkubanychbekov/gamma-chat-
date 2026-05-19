'use client'

import { Message } from '@/lib/types/chat'
import { Phone, Video, PhoneOff, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useCall } from '../calls/CallProvider'
import { cn } from '@/lib/utils'

export function CallMessage({ message, isMe }: { message: Message, isMe: boolean }) {
  const { joinCall, activeCall } = useCall()
  const metadata = message.metadata as any
  const isOngoing = !metadata.ended_at // Usually signaled via call status, but for cards we check metadata

  return (
    <div className={cn(
      "glass p-4 rounded-2xl border border-white/5 min-w-[280px] space-y-4",
      isMe ? "bg-primary/5" : "bg-slate-800/50"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center",
          metadata.call_type === 'video' ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
        )}>
          {metadata.call_type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
        </div>
        
        <div className="flex-1">
          <p className="font-bold text-slate-100 uppercase tracking-tight text-xs">
            {metadata.call_type} Call
          </p>
          <p className="text-sm text-muted-foreground">
            {isOngoing ? 'Call in progress' : 'Call ended'}
          </p>
        </div>
      </div>

      {!metadata.ended_at ? (
        <div className="flex gap-2">
          <button 
            disabled={activeCall?.id === metadata.call_id}
            onClick={() => joinCall({ id: metadata.call_id, room_name: metadata.room_name })}
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded-xl transition-all glow text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {activeCall?.id === metadata.call_id ? 'In Call' : 'Join Call'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-widest pt-2 border-t border-white/5">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{metadata.duration || '0:00'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(message.created_at), 'MMM d, HH:mm')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { Phone, PhoneOff, Video, User } from 'lucide-react'

interface IncomingCallModalProps {
  call: any
  onAccept: () => void
  onDecline: () => void
}

export function IncomingCallModal({ call, onAccept, onDecline }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center relative">
              <User className="w-12 h-12 text-slate-400" />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Incoming Call</h3>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              {call.type === 'video' ? 'Video Call' : 'Voice Call'}
            </p>
          </div>

          <div className="flex items-center gap-6 w-full mt-4">
            <button 
              onClick={onDecline}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-500 transition-all group-hover:scale-110">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-red-400">Decline</span>
            </button>

            <button 
              onClick={onAccept}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 bg-green-500/10 hover:bg-green-500/20 rounded-full flex items-center justify-center text-green-500 transition-all group-hover:scale-110 animate-bounce">
                {call.type === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-green-400">Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

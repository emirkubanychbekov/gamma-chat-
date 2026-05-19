import { Hash, Search, MessageSquare, Sparkles } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950/20 animate-in fade-in duration-500 overflow-hidden relative">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 -right-64 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-64 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Premium Header Skeleton */}
      <header className="h-16 flex items-center justify-between px-6 glass border-b border-white/5 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-shimmer relative overflow-hidden border border-white/5" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 bg-white/5 rounded-full animate-shimmer relative overflow-hidden" />
            <div className="h-2.5 w-20 bg-white/5 rounded-full animate-shimmer relative overflow-hidden" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-white/5 rounded-lg animate-shimmer relative overflow-hidden border border-white/5" />
          <div className="h-9 w-9 bg-white/5 rounded-lg animate-shimmer relative overflow-hidden border border-white/5" />
          <div className="w-px h-6 bg-white/5 mx-1" />
          <div className="h-9 w-9 bg-white/5 rounded-lg animate-shimmer relative overflow-hidden border border-white/5" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <div className="flex-1 p-6 space-y-8">
          {[
            { align: 'left', width: 'w-64' },
            { align: 'right', width: 'w-48' },
            { align: 'left', width: 'w-96' },
            { align: 'left', width: 'w-56' },
            { align: 'right', width: 'w-72' },
          ].map((item, i) => (
            <div key={i} className={`flex gap-4 ${item.align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-10 h-10 rounded-xl bg-white/5 animate-shimmer relative overflow-hidden border border-white/5 shrink-0" />
              <div className={`space-y-3 ${item.align === 'right' ? 'items-end' : 'items-start'} flex-1 max-w-[80%]`}>
                <div className={`h-2.5 w-24 bg-white/5 rounded-full animate-shimmer relative overflow-hidden`} />
                <div className={`h-16 ${item.width} bg-white/5 rounded-2xl animate-shimmer relative overflow-hidden border border-white/5 shadow-xl`} 
                     style={{ borderRadius: item.align === 'right' ? '20px 4px 20px 20px' : '4px 20px 20px 20px' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Floating Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-primary/20">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <MessageSquare className="w-12 h-12 relative animate-bounce duration-1000" />
          </div>
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-[0.2em]">
            <Sparkles className="w-3 h-3 animate-spin duration-[3000ms]" />
            Initializing Sync
          </div>
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="p-6 bg-slate-950/50 border-t border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-end gap-3">
          <div className="h-12 w-12 bg-white/5 rounded-xl animate-shimmer relative overflow-hidden border border-white/5" />
          <div className="h-12 w-12 bg-white/5 rounded-xl animate-shimmer relative overflow-hidden border border-white/5" />
          <div className="flex-1 h-12 bg-white/5 rounded-2xl animate-shimmer relative overflow-hidden border border-white/5" />
          <div className="h-12 w-12 bg-primary/5 rounded-2xl animate-shimmer relative overflow-hidden border border-primary/10" />
        </div>
      </div>
    </div>
  )
}

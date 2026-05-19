'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedUrl } from '@/lib/upload'
import { Download, File as FileIcon, Play, Pause, Volume2, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Attachment {
  id: string
  filename: string
  file_path: string
  content_type: string
  size_bytes: number
  width?: number
  height?: number
  duration_seconds?: number
  thumbnail_url?: string
}

export function MessageAttachment({ attachment }: { attachment: Attachment }) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    async function loadUrls() {
      const signed = await getSignedUrl(supabase, attachment.file_path)
      setUrl(signed)

      if (attachment.thumbnail_url) {
        const thumbSigned = await getSignedUrl(supabase, attachment.thumbnail_url)
        setThumbUrl(thumbSigned)
      }
    }
    loadUrls()
  }, [attachment, supabase])

  if (!url) return <div className="w-20 h-20 glass animate-pulse rounded-lg" />

  // 1. IMAGES
  if (attachment.content_type.startsWith('image/')) {
    return (
      <>
        <div 
          onClick={() => setShowLightbox(true)}
          className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/5 bg-slate-900"
        >
          <img 
            src={url} 
            alt={attachment.filename}
            className="max-w-full max-h-[300px] object-contain transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-white" />
          </div>
        </div>

        {showLightbox && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowLightbox(false)}
          >
            <img src={url} className="max-w-full max-h-full object-contain shadow-2xl" />
            <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <Download className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
      </>
    )
  }

  // 2. VIDEOS
  if (attachment.content_type.startsWith('video/')) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-900 max-w-[400px]">
        <video 
          src={url} 
          controls 
          poster={thumbUrl || undefined}
          className="w-full"
        />
      </div>
    )
  }

  // 3. AUDIO (Voice Messages)
  if (attachment.content_type.startsWith('audio/')) {
    return (
      <div className="glass px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-4 min-w-[240px]">
        <button 
          onClick={togglePlay}
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-4 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className={cn("absolute inset-0 bg-primary/30 transition-all", isPlaying && "animate-shimmer")} 
              style={{ width: isPlaying ? '100%' : '100%' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{attachment.duration_seconds ? `${Math.floor(attachment.duration_seconds)}s` : 'Voice'}</span>
            <Volume2 className="w-3 h-3" />
          </div>
        </div>
        <audio 
          ref={audioRef}
          src={url} 
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
    )
  }

  // 4. GENERAL FILES
  return (
    <div className="glass px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-4 max-w-xs">
      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-primary">
        <FileIcon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.filename}</p>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
          {(attachment.size_bytes / 1024).toFixed(1)} KB
        </p>
      </div>
      <a 
        href={url} 
        download={attachment.filename}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
      >
        <Download className="w-5 h-5" />
      </a>
    </div>
  )
}

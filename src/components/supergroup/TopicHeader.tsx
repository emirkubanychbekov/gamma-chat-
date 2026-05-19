'use client'

import { Hash, Users, Info, ChevronDown, Settings, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface TopicHeaderProps {
  topic: any
  onlineCount: number
  onSettingsClick?: () => void
}

export function TopicHeader({ topic, onlineCount, onSettingsClick }: TopicHeaderProps) {
  if (!topic) return null

  return (
    <header className="h-16 flex items-center justify-between px-6 glass border-b border-white/5 shrink-0 z-30">
      <div className="flex items-center gap-4">
        <Link href="/" className="md:hidden p-2 hover:bg-white/5 rounded-lg text-muted-foreground mr-1">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-2xl">
          {topic.icon_emoji}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-100">{topic.name}</h2>
            {topic.is_archived && (
              <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground">
                Archived
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {topic.message_count} messages • {onlineCount} online
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground ml-2 border-l border-white/10 pl-4"
            title="Group Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  )
}

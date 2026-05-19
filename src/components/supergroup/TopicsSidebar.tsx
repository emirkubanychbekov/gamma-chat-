'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Hash, Plus, MessageSquare, ChevronRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CreateTopicModal } from './CreateTopicModal'

export function TopicsSidebar({ channelId }: { channelId: string }) {
  const supabase = createClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTopicId = searchParams.get('topic')
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await supabase
        .from('topics')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
      
      setTopics(data || [])
      setLoading(false)

      // Auto-select General if none selected
      if (!currentTopicId && data && data.length > 0) {
        const general = data.find(t => t.name === 'General') || data[0]
        router.push(`/chat/${channelId}?topic=${general.id}`)
      }
    }

    fetchTopics()

    // Real-time updates for topics
    const channel = supabase
      .channel(`topics:${channelId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'topics',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTopics(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setTopics(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
        } else if (payload.eventType === 'DELETE') {
          setTopics(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId, currentTopicId, router, supabase])

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Topics
        </h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground transition-colors"
          title="Add Topic"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/chat/${channelId}?topic=${topic.id}`}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:bg-white/5",
                currentTopicId === topic.id ? "bg-primary/20 text-primary glow-sm" : "text-slate-400"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-xl">{topic.icon_emoji}</span>
                <span className="truncate font-medium">{topic.name}</span>
              </div>
              
              {topic.message_count > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  currentTopicId === topic.id ? "bg-primary text-white" : "bg-white/10 text-slate-400"
                )}>
                  {topic.message_count}
                </span>
              )}
            </Link>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/5">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors w-full">
          <Settings className="w-4 h-4" />
          Group Settings
        </button>
      </div>

      <CreateTopicModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        channelId={channelId}
      />
    </div>
  )
}

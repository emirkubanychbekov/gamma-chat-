'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  MessageSquare, 
  Hash, 
  Settings, 
  LogOut, 
  Search,
  MessageCircle,
  Users,
  ChevronRight,
  Pin
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'
import { UserSearchModal } from '@/components/groups/UserSearchModal'
import { signout } from '@/app/(auth)/actions'
import { StoryBar } from '@/components/stories/StoryBar'

export function Sidebar({ user, profile }: { user: any, profile: any }) {
  const supabase = createClient()
  const params = useParams()
  const currentChannelId = params.channelId as string
  
  const [channels, setChannels] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<any[]>([])
  const [isPinned, setIsPinned] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_pinned')
    if (saved !== null) {
      setIsPinned(saved === 'true')
    }
  }, [])

  const togglePin = () => {
    const next = !isPinned
    setIsPinned(next)
    localStorage.setItem('sidebar_pinned', String(next))
  }

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch channels where user is a member
      const { data: memberChannels } = await supabase
        .from('channel_members')
        .select(`
          channel:channels (*)
        `)
        .eq('user_id', user.id)

      if (memberChannels) {
        const channelsData = memberChannels.map(mc => {
          const c: any = Array.isArray(mc.channel) ? mc.channel[0] : mc.channel
          return c
        }).filter(Boolean)
        
        // Find all DM channels to rename them for the UI
        const dmChannels = channelsData.filter(c => c && c.type === 'dm')
        if (dmChannels.length > 0) {
          const { data: allMembers } = await supabase
            .from('channel_members')
            .select('channel_id, user_id, profiles(username, display_name, avatar_url)')
            .in('channel_id', dmChannels.map(c => c.id))
            .neq('user_id', user.id)
            
          if (allMembers) {
            channelsData.forEach(c => {
              if (c && c.type === 'dm') {
                const otherMember = allMembers.find(m => m.channel_id === c.id)
                if (otherMember && otherMember.profiles) {
                  const p = Array.isArray(otherMember.profiles) ? otherMember.profiles[0] : otherMember.profiles
                  // Override the display name and avatar for DMs
                  c.name = p?.display_name || p?.username || 'Unknown User'
                  c.avatar_url = p?.avatar_url
                } else {
                  c.name = 'Unknown User'
                }
              }
            })
          }
        }
        
        setChannels(channelsData)
      }

      // 2. Fetch other users for contact selection in modal
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user.id)
        .limit(20)
      
      setContacts(users || [])
      setLoading(false)
    }

    fetchData()

    // Real-time listener for new channels/memberships
    const channel = supabase
      .channel('sidebar_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'channel_members',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user.id, supabase])

  return (
    <div 
      className={cn(
        "transition-all duration-300 z-50 select-none",
        currentChannelId ? "hidden md:block" : "w-full md:block",
        isPinned 
          ? "md:relative md:w-72 md:h-screen shrink-0" 
          : "md:fixed md:left-0 md:top-0 md:bottom-0 md:w-3 md:hover:w-72 group"
      )}
    >
      <aside 
        className={cn(
          "h-full border-r border-white/5 flex flex-col bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ease-out shadow-2xl relative w-full md:w-72",
          !isPinned && "md:absolute md:left-0 md:top-0 md:bottom-0 md:-translate-x-[calc(100%-8px)] md:group-hover:translate-x-0"
        )}
      >
        {/* Hover Indicator Handle (Glowing Accent Strip) */}
        {!isPinned && (
          <div className="absolute right-0 top-0 bottom-0 w-2 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none md:flex hidden">
            <div className="w-1 h-16 bg-gradient-to-b from-primary to-accent rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] opacity-60" />
          </div>
        )}

        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center glow-sm">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">Gamma</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={togglePin}
                className={cn(
                  "p-2 rounded-lg transition-colors hidden md:block",
                  isPinned 
                    ? "text-primary hover:bg-primary/10 bg-primary/5" 
                    : "text-muted-foreground hover:bg-white/5"
                )}
                title={isPinned ? "Collapse Sidebar (Hover to reveal)" : "Pin Sidebar"}
              >
                <Pin className={cn("w-4 h-4 transition-transform", isPinned && "rotate-45")} />
              </button>
              <Link href="/settings/profile" className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-primary/20"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Search */}
      <div className="p-4 space-y-2">
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-muted-foreground hover:bg-white/5 hover:text-slate-200 transition-all text-sm"
        >
          <Search className="w-4 h-4" />
          Find someone...
        </button>
      </div>

      {/* Story Bar */}
      <StoryBar currentUserId={user.id} />

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Channels</span>
        </div>

        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground italic">No channels yet.</p>
          </div>
        ) : (
          channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/chat/${channel.id}`}
              className={cn(
                "group flex items-center justify-between px-3 py-3 rounded-xl transition-all",
                currentChannelId === channel.id 
                  ? "bg-primary/10 text-primary border border-primary/10 shadow-sm" 
                  : "text-slate-400 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
                  currentChannelId === channel.id ? "bg-primary/20" : "bg-slate-900"
                )}>
                  {channel.avatar_url ? (
                    <img src={channel.avatar_url} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    channel.type === 'dm' ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-semibold text-sm">{channel.name || 'Private Chat'}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{channel.type}</span>
                </div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 opacity-0 transition-opacity",
                currentChannelId === channel.id ? "opacity-100" : "group-hover:opacity-100"
              )} />
            </Link>
          ))
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-slate-800">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                  {profile?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden max-w-[100px]">
              <span className="text-sm font-bold truncate text-slate-200">{profile?.display_name || profile?.username}</span>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</span>
            </div>
          </div>
          <button 
            onClick={() => signout()}
            className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CreateGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        contacts={contacts}
      />
      <UserSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </aside>
    </div>
  )
}

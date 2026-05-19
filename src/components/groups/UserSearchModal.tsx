'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, MessageSquare, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export function UserSearchModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startingChat, setStartingChat] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(10)

    if (data) setResults(data)
    setLoading(false)
  }

  const startChat = async (targetUserId: string) => {
    setStartingChat(targetUserId)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to start a chat');
        return;
      }

      // 1. Manually find existing DM channel (Bypassing broken RPC)
      const { data: existingMembers, error: findError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id)

      if (findError) throw findError

      const channelIds = existingMembers.map(m => m.channel_id)
      
      // Check which of these channels also has the target user
      const { data: dmMember, error: dmError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .in('channel_id', channelIds)
        .eq('user_id', targetUserId)
        .limit(1)

      if (dmMember && dmMember.length > 0) {
        // Double check it's actually a DM channel
        const { data: channel } = await supabase
          .from('channels')
          .select('id, type')
          .eq('id', dmMember[0].channel_id)
          .single()

        if (channel?.type === 'dm') {
          router.push(`/chat/${channel.id}`);
          onClose();
          return;
        }
      }

      // 2. Create new DM if none exists
      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert({ type: 'dm' })
        .select()
        .single()

      if (createError) throw createError

      const { error: memberError } = await supabase
        .from('channel_members')
        .insert([
          { channel_id: newChannel.id, user_id: user.id },
          { channel_id: newChannel.id, user_id: targetUserId }
        ])

      if (memberError) throw memberError

      router.push(`/chat/${newChannel.id}`);
      onClose();
    } catch (err: any) {
      console.error('Error starting chat:', err);
      toast.error(`Failed to start chat: ${err.message}`);
    } finally {
      setStartingChat(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md glass border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Find Someone
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSearch} className="relative mb-6">
            <input 
              autoFocus
              placeholder="Search by username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-primary rounded-xl text-white">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {results.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden bg-slate-800">
                    {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-primary">{profile.username[0].toUpperCase()}</div>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-100">{profile.display_name || profile.username}</span>
                    <span className="text-xs text-muted-foreground tracking-wide">@{profile.username}</span>
                  </div>
                </div>
                <button onClick={() => startChat(profile.id)} disabled={!!startingChat} className="p-3 bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-xl transition-all">
                  {startingChat === profile.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

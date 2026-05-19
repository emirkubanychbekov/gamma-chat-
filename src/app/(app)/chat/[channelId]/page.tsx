import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatContainer from './chat-container'
import { Message } from '@/lib/types/chat'

interface PageProps {
  params: Promise<{ channelId: string }>
}

export default async function ChatPage({ params }: PageProps) {
  const { channelId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Parallelize core data fetching
  const [channelResult, messagesResult, profileResult] = await Promise.all([
    supabase.from('channels').select('*').eq('id', channelId).single(),
    supabase.from('messages')
      .select('*, topic_id, profiles:sender_id (*), reply_to:reply_to_id (*, profiles:sender_id (*)), reactions (*), attachments (*)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('*').eq('id', user.id).single()
  ])

  const channel = channelResult.data
  const messages = messagesResult.data ? [...messagesResult.data].reverse() : []
  const currentUserProfile = profileResult.data

  if (!channel) {
    redirect('/')
  }

  // 2. Optimized DM name fetch
  if (channel.type === 'dm') {
    const { data: otherMember } = await supabase
      .from('channel_members')
      .select('profiles(username, display_name)')
      .eq('channel_id', channelId)
      .neq('user_id', user.id)
      .single()
      
    if (otherMember && otherMember.profiles) {
      const p = Array.isArray(otherMember.profiles) ? otherMember.profiles[0] : otherMember.profiles
      channel.name = p?.display_name || p?.username || 'Unknown User'
    } else {
      channel.name = 'Unknown User'
    }
  }

  // 3. Mark as read (Fire and forget or run in background)
  supabase.rpc('update_last_read_at', { p_channel_id: channelId })

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <ChatContainer 
        channel={channel} 
        initialMessages={(messages || []) as Message[]} 
        userId={user.id} 
        currentUserProfile={currentUserProfile}
      />
    </div>
  )
}

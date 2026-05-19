'use client'

import { useState, useEffect, useMemo } from 'react'
import { Message, Channel } from '@/lib/types/chat'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { usePresence } from '@/hooks/usePresence'
import { createClient } from '@/lib/supabase/client'
import { Hash, Users, Phone, Video, Trash2, Settings } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { TopicHeader } from '@/components/supergroup/TopicHeader'
import { useCall } from '@/components/calls/CallProvider'
import { deleteGroup } from '@/app/(app)/chat/actions'
import { GroupSettings } from '@/components/groups/GroupSettings'

interface ChatContainerProps {
  channel: Channel
  initialMessages: Message[]
  userId: string
  currentUserProfile?: any
}

export default function ChatContainer({ channel, initialMessages, userId, currentUserProfile }: ChatContainerProps) {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const topicId = searchParams.get('topic')
  
  const { initiateCall } = useCall()
  const { messages, setMessages, addOptimisticMessage } = useRealtimeMessages(channel.id, initialMessages)
  const { onlineUsers, typingUsers, setTyping } = usePresence(channel.id, userId)
  
  const [topic, setTopic] = useState<any>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Fetch topic details if topicId changes
  useEffect(() => {
    if (topicId) {
      supabase.from('topics').select('*').eq('id', topicId).single().then(({ data }) => {
        setTopic(data)
      })
    } else {
      setTopic(null)
    }
  }, [topicId, supabase])

  const handleClearContext = () => {
    setReplyingTo(null)
    setEditingMessage(null)
  }

  // Filter messages by topic if in a supergroup
  const filteredMessages = useMemo(() => {
    if (channel.type === 'supergroup') {
      return messages.filter(m => m.topic_id === topicId)
    }
    return messages
  }, [messages, channel.type, topicId])

  // Filter typing users (excluding self)
  const activeTypingUsers = typingUsers.filter(id => id !== userId)

  if (showSettings) {
    return <GroupSettings channel={channel} currentUserId={userId} onClose={() => setShowSettings(false)} />
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Dynamic Header */}
      {channel.type === 'supergroup' && topic ? (
        <TopicHeader topic={topic} onlineCount={onlineUsers.length} onSettingsClick={() => setShowSettings(true)} />
      ) : (
        <header className="h-16 flex items-center justify-between px-6 glass border-b border-white/5 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              {channel.type === 'dm' ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-100">{channel.name || 'Private Chat'}</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  {onlineUsers.length} Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => initiateCall(channel.id, 'audio')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
              title="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => initiateCall(channel.id, 'video')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
              title="Video Call"
            >
              <Video className="w-5 h-5" />
            </button>
            
            {channel.type !== 'dm' && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground ml-2 border-l border-white/10 pl-4"
                title="Group Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {channel.type === 'dm' && (
              <button 
                onClick={async () => {
                  if(confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
                    await deleteGroup(channel.id)
                  }
                }}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-500/70 hover:text-red-500 ml-2"
                title="Delete Chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>
      )}

      {/* Message Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950/20">
        {/* Background Decorative Glow */}
        <div className="absolute top-1/4 -right-64 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -left-64 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <MessageList 
          messages={filteredMessages} 
          currentUserId={userId}
          onReply={setReplyingTo}
          onEdit={setEditingMessage}
        />

        {/* Typing Indicator */}
        {activeTypingUsers.length > 0 && (
          <div className="px-6 py-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1">
            <span className="font-semibold">{activeTypingUsers.length === 1 ? 'Someone' : 'Multiple people'}</span> is typing...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0">
        <MessageInput 
          channelId={channel.id}
          topicId={topicId}
          userId={userId}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onClearContext={handleClearContext}
          onTyping={setTyping}
          onOptimisticMessage={addOptimisticMessage}
          currentUserProfile={currentUserProfile}
        />
      </div>
    </div>
  )
}

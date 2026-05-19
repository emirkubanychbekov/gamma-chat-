'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/lib/types/chat'
import { MessageItem } from './Message'
import { isSameDay, differenceInMinutes } from 'date-fns'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
}

export function MessageList({ messages, currentUserId, onReply, onEdit }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-2 py-4 space-y-1 scroll-smooth"
    >
      {messages.map((message, index) => {
        const prevMessage = messages[index - 1]
        
        // Grouping logic:
        // 1. First message of the day
        // 2. Different sender
        // 3. More than 5 minutes gap
        const showDetails = !prevMessage || 
          prevMessage.sender_id !== message.sender_id ||
          !isSameDay(new Date(prevMessage.created_at), new Date(message.created_at)) ||
          differenceInMinutes(new Date(message.created_at), new Date(prevMessage.created_at)) > 5

        const isNewDay = prevMessage && !isSameDay(new Date(prevMessage.created_at), new Date(message.created_at))

        return (
          <div key={message.id}>
            {isNewDay && (
              <div className="flex items-center gap-4 my-8">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {new Date(message.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            )}
            <MessageItem 
              message={message} 
              isMe={message.sender_id === currentUserId}
              showDetails={showDetails}
              onReply={onReply}
              onEdit={onEdit}
            />
          </div>
        )
      })}
      <div ref={lastMessageRef} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Message, Reaction } from '@/lib/types/chat'
import { format } from 'date-fns'
import { Smile, Reply, Pencil, Trash2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

import { MessageAttachment } from './MessageAttachment'
import { CallMessage } from './CallMessage'

interface MessageProps {
  message: Message & { attachments?: any[], metadata?: any }
  isMe: boolean
  showDetails: boolean // For grouping
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
}

export function MessageItem({ message, isMe, showDetails, onReply, onEdit }: MessageProps) {
  const supabase = createClient()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleReaction = async (emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if user already reacted with this emoji
    const existing = message.reactions?.find(r => r.user_id === user.id && r.emoji === emoji)

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({
        message_id: message.id,
        user_id: user.id,
        emoji: emoji
      })
    }
    setShowEmojiPicker(false)
    setShowActions(false)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase.from('messages').update({
      content: 'Message deleted',
      deleted_at: new Date().toISOString(),
      type: 'system'
    }).eq('id', message.id)

    if (error) {
      console.error('Failed to delete message:', error)
      toast.error('Failed to delete: ' + error.message)
    } else {
      toast.success('Message deleted')
    }
    setShowActions(false)
  }

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className={cn(
      "group flex w-full gap-3 px-4 py-1 transition-colors hover:bg-white/5",
      !showDetails && "pt-0 pb-0",
      isMe ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className="w-10 flex-shrink-0">
        {showDetails && (
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-800">
            {message.profiles?.avatar_url ? (
              <img src={message.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                {message.profiles?.username?.[0].toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
        {showDetails && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-slate-200">
              {message.profiles?.display_name || message.profiles?.username}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
        )}

        <div className="relative group/bubble">
          {/* Reply Context */}
          {message.reply_to && (
            <div className={cn(
              "text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-t-lg border-l-2 border-primary mb-[-4px] truncate max-w-full",
              isMe ? "mr-2" : "ml-2"
            )}>
              <span className="font-semibold">{message.reply_to.profiles?.username}:</span> {message.reply_to.content}
            </div>
          )}

          <div 
            onClick={() => setShowActions(!showActions)}
            className={cn(
              "px-4 py-2 rounded-2xl text-sm relative space-y-2 cursor-pointer select-none",
              isMe 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-slate-800 text-slate-200 rounded-tl-none",
              message.deleted_at && "italic text-muted-foreground opacity-70 bg-white/5 border border-white/5",
              message.isOptimistic && "opacity-60"
            )}
          >
            {/* Attachments */}
            {!message.deleted_at && message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-1">
                {message.attachments.map((attachment) => (
                  <MessageAttachment key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}

            {message.type === 'call' ? (
              <CallMessage message={message} isMe={isMe} />
            ) : (
              message.content && <p>{message.content}</p>
            )}
            
            {message.edited_at && !message.deleted_at && (
              <span className="text-[10px] opacity-50 ml-2">(edited)</span>
            )}

            {/* Hover Actions */}
            <div className={cn(
              "absolute opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 glass p-1 rounded-lg border border-white/10 shadow-xl z-20",
              showActions && "opacity-100 pointer-events-auto",
              isMe 
                ? "md:right-full md:mr-2 md:top-0 top-full mt-1 right-0" 
                : "md:left-full md:ml-2 md:top-0 top-full mt-1 left-0"
            )}>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  onReply(message)
                  setShowActions(false)
                }}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                title="Reply"
              >
                <Reply className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEmojiPicker(!showEmojiPicker)
                }}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                title="React"
              >
                <Smile className="w-4 h-4" />
              </button>
              {isMe && !message.deleted_at && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(message)
                      setShowActions(false)
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="p-1.5 hover:bg-accent/20 text-accent rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
              <div className={cn(
                "absolute bottom-full mb-2 z-50",
                isMe ? "right-0" : "left-0"
              )}>
                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative">
                  <EmojiPicker 
                    onEmojiClick={(data) => handleReaction(data.emoji)}
                    theme={Theme.DARK}
                    skinTonesDisabled
                    searchDisabled
                    height={350}
                    width={300}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reactions List */}
        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="flex items-center gap-1 px-2 py-0.5 glass border border-white/10 rounded-full text-xs hover:bg-white/10 transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

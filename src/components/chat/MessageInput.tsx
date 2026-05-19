'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Smile, X, Reply, Pencil, Paperclip, Loader2, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/lib/types/chat'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { cn } from '@/lib/utils'
import { AttachmentPicker } from './AttachmentPicker'
import { AudioRecorder } from './AudioRecorder'
import { CameraModal } from './CameraModal'
import { processAndUploadFile } from '@/lib/upload'
import { toast } from 'react-hot-toast'

interface MessageInputProps {
  channelId: string
  topicId?: string | null
  userId: string
  replyingTo: Message | null
  editingMessage: Message | null
  onClearContext: () => void
  onTyping: (isTyping: boolean) => void
  onOptimisticMessage: (message: Message) => void
  currentUserProfile?: any
}

export function MessageInput({ 
  channelId, 
  topicId,
  userId, 
  replyingTo, 
  editingMessage, 
  onClearContext,
  onTyping,
  onOptimisticMessage,
  currentUserProfile
}: MessageInputProps) {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content)
    }
  }, [editingMessage])

  const handleTyping = () => {
    onTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000)
  }

  const handleSend = async (manualFiles?: File[]) => {
    const filesToSend = manualFiles || pendingFiles
    if ((!content.trim() && filesToSend.length === 0) || isSending) return
    setIsSending(true)
    setUploadProgress(10)

    try {
      // Clear input immediately for a snappy feel (Optimistic UI)
      const messageContent = content.trim()
      setContent('')
      setPendingFiles([])
      onClearContext()
      onTyping(false)

      // 1. Add Optimistic Message (only if it's a new message, not an edit)
      if (!editingMessage) {
        onOptimisticMessage({
          id: `temp-${Date.now()}`,
          channel_id: channelId,
          sender_id: userId,
          content: messageContent,
          type: filesToSend.length > 0 ? 'file' : 'text',
          reply_to_id: replyingTo?.id || null,
          created_at: new Date().toISOString(),
          isOptimistic: true,
          edited_at: null,
          deleted_at: null,
          profiles: currentUserProfile
        })
      }

      let messageId: string

      if (editingMessage) {
        await supabase
          .from('messages')
          .update({ content: messageContent, edited_at: new Date().toISOString() })
          .eq('id', editingMessage.id)
        messageId = editingMessage.id
      } else {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            channel_id: channelId,
            topic_id: topicId || null,
            sender_id: userId,
            content: messageContent,
            reply_to_id: replyingTo?.id || null,
            type: filesToSend.length > 0 ? 'file' : 'text'
          })
          .select()
          .single()
        
        if (error) {
          // If it fails, put the content back so the user doesn't lose it
          setContent(messageContent)
          throw error
        }
        messageId = data.id
      }

      // Handle Attachments
      if (filesToSend.length > 0) {
        setUploadProgress(30)
        const total = filesToSend.length
        for (let i = 0; i < total; i++) {
          await processAndUploadFile(supabase, filesToSend[i], channelId, messageId)
          setUploadProgress(30 + ((i + 1) / total) * 70)
        }
      }
      setUploadProgress(0)
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error(error.message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleVoiceMessage = async (blob: Blob) => {
    const file = new File([blob], `voice_message_${Date.now()}.webm`, { type: blob.type })
    // No need to wait for state, send it directly
    handleSend([file])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else {
      handleTyping()
    }
  }

  return (
    <div className="px-4 py-3 bg-slate-950/50 border-t border-white/5 relative">
      <AttachmentPicker 
        onFilesSelected={(files) => setPendingFiles(prev => [...prev, ...files])}
        pendingFiles={pendingFiles}
        onRemoveFile={(index) => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
        uploading={isSending}
        progress={uploadProgress}
      />

      {/* Context Bar (Reply/Edit) */}
      {(replyingTo || editingMessage) && (
        <div className="absolute bottom-full left-0 right-0 glass border-t border-white/5 px-6 py-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            {replyingTo ? (
              <>
                <Reply className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Replying to </span>
                  <span className="font-bold">{replyingTo.profiles?.username}</span>
                </div>
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Editing message</span>
                </div>
              </>
            )}
          </div>
          <button onClick={onClearContext} className="p-1 hover:bg-white/10 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground"
            >
              <Smile className="w-6 h-6" />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-4 z-50">
                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative">
                  <EmojiPicker 
                    onEmojiClick={(data) => setContent(prev => prev + data.emoji)}
                    theme={Theme.DARK}
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground"
            title="Attach file"
          >
            <Paperclip className="w-6 h-6" />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setPendingFiles(prev => [...prev, ...files])
              }}
            />
          </button>

          <button 
            onClick={() => setShowCamera(true)}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground"
            title="Take photo"
          >
            <Camera className="w-6 h-6" />
          </button>
          
          <AudioRecorder onRecordingComplete={handleVoiceMessage} />
        </div>

        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none max-h-40 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        </div>

        <button 
          onClick={() => handleSend()}
          disabled={(!content.trim() && pendingFiles.length === 0) || isSending}
          className="p-3 bg-primary hover:bg-primary/90 text-white rounded-2xl transition-all glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
        </button>
      </div>

      {showCamera && (
        <CameraModal 
          onCapture={(file) => handleSend([file])} 
          onClose={() => setShowCamera(false)} 
        />
      )}
    </div>
  )
}

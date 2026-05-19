'use client'

import { useState } from 'react'
import { X, Loader2, Hash } from 'lucide-react'
import { createTopic } from '@/app/(app)/chat/actions'
import { toast } from 'react-hot-toast'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { useRouter } from 'next/navigation'

export function CreateTopicModal({ isOpen, onClose, channelId }: { isOpen: boolean, onClose: () => void, channelId: string }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💬')
  const [loading, setLoading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const router = useRouter()

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const topic = await createTopic(channelId, name, emoji)
      toast.success('Topic created!')
      onClose()
      setName('')
      setEmoji('💬')
      router.push(`/chat/${channelId}?topic=${topic.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            New Topic
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 relative">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowEmoji(!showEmoji)}
                className="w-12 h-12 rounded-xl bg-slate-900/50 border border-white/10 flex items-center justify-center text-2xl hover:bg-white/5 transition-colors"
              >
                {emoji}
              </button>
              {showEmoji && (
                <div className="absolute top-14 left-0 z-50">
                  <div className="fixed inset-0" onClick={() => setShowEmoji(false)} />
                  <div className="relative">
                    <EmojiPicker 
                      theme={Theme.DARK} 
                      onEmojiClick={(e) => {
                        setEmoji(e.emoji)
                        setShowEmoji(false)
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Topic name..."
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl transition-all glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Topic'}
          </button>
        </div>
      </div>
    </div>
  )
}

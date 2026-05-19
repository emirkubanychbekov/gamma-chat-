'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/utils/image'
import { Camera, Loader2, Smile, X, Check } from 'lucide-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  status: string | null
  status_emoji: string | null
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [formData, setFormData] = useState({
    username: profile.username,
    display_name: profile.display_name || '',
    bio: profile.bio || '',
    status: profile.status || '',
    status_emoji: profile.status_emoji || '👋',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleEmojiClick = (emojiData: any) => {
    setFormData((prev) => ({ ...prev, status_emoji: emojiData.emoji }))
    setShowEmojiPicker(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let finalAvatarUrl = profile.avatar_url

      // 1. Upload avatar if changed
      if (fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0]
        const compressedBlob = await compressImage(file)
        const fileExt = 'jpg'
        const filePath = `${profile.id}/avatar_${Date.now()}.${fileExt}`

        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(filePath, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        
        finalAvatarUrl = publicUrl
      }

      // 2. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...formData,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', profile.id)

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Username is already taken.')
        }
        throw updateError
      }

      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 glass p-8 rounded-2xl">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-slate-900 relative">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
                {formData.display_name?.charAt(0) || formData.username.charAt(0)}
              </div>
            )}
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />
        </div>
        <p className="text-sm text-muted-foreground">Click to change avatar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Username */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Username</label>
          <input
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="username"
            required
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Display Name</label>
          <input
            name="display_name"
            value={formData.display_name}
            onChange={handleInputChange}
            placeholder="John Doe"
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Status Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground ml-1">Status</label>
        <div className="flex gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-12 w-12 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-center text-2xl hover:bg-slate-800 transition-all"
            >
              {formData.status_emoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-14 left-0 z-50">
                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.DARK}
                    lazyLoadEmojis
                  />
                </div>
              </div>
            )}
          </div>
          <input
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            placeholder="What's on your mind?"
            className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground ml-1">Bio</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Tell us about yourself..."
          rows={4}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl transition-all glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>
            <Check className="w-5 h-5" />
            Save Changes
          </>
        )}
      </button>
    </form>
  )
}

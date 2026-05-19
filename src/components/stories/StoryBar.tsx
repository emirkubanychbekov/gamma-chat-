'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CameraModal } from '@/components/chat/CameraModal'
import { toast } from 'react-hot-toast'

interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'video' | 'image'
  created_at: string
  expires_at: string
  profiles: {
    username: string
    avatar_url: string | null
    display_name: string | null
  }
}

interface StoryGroup {
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
    display_name: string | null
  }
  stories: Story[]
}

export function StoryBar({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null)

  const fetchStories = async () => {
    try {
      // 1. Fetch channel IDs of channels the current user is a member of
      const { data: myMemberships } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', currentUserId)

      let allowedUserIds = [currentUserId]

      if (myMemberships && myMemberships.length > 0) {
        const myChannelIds = myMemberships.map(m => m.channel_id)
        
        // 2. Fetch all user IDs who share any channel with the current user
        const { data: sharedMembers } = await supabase
          .from('channel_members')
          .select('user_id')
          .in('channel_id', myChannelIds)

        if (sharedMembers) {
          allowedUserIds = Array.from(new Set([
            currentUserId,
            ...sharedMembers.map(m => m.user_id)
          ]))
        }
      }

      // 3. Fetch active stories from the allowed users only
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .in('user_id', allowedUserIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      if (storiesData && storiesData.length > 0) {
        // Fetch profiles manually to bypass foreign key relationship issues
        const userIds = Array.from(new Set(storiesData.map(s => s.user_id)))
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, display_name')
          .in('id', userIds)

        const joinedStories = storiesData.map(story => ({
          ...story,
          profiles: profilesData?.find(p => p.id === story.user_id) || {
            username: 'Unknown User',
            avatar_url: null,
            display_name: 'Unknown User'
          }
        })) as Story[]

        // Group by user
        const uniqueUserIds = Array.from(new Set(joinedStories.map(s => s.user_id)))
        
        const groups = uniqueUserIds.map(uid => {
          // Reverse to show oldest first within a group
          const userStories = joinedStories.filter(s => s.user_id === uid).reverse()
          return {
            user_id: uid,
            profiles: userStories[0].profiles,
            stories: userStories
          }
        })
        
        // Move current user to front if they have a story
        const myGroupIndex = groups.findIndex(g => g.user_id === currentUserId)
        if (myGroupIndex > 0) {
          const myGroup = groups.splice(myGroupIndex, 1)[0]
          groups.unshift(myGroup)
        }
        setStoryGroups(groups)
      } else {
        setStoryGroups([])
      }
    } catch (error) {
      console.error('Error fetching stories:', error)
    }
  }

  useEffect(() => {
    fetchStories()
    const interval = setInterval(fetchStories, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [currentUserId, supabase])

  const handleCapture = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${currentUserId}/${Date.now()}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUserId,
          media_url: publicUrl,
          media_type: file.type.startsWith('video') ? 'video' : 'image'
        })

      if (insertError) throw insertError

      toast.success('Story uploaded!')
      fetchStories()
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload story')
    } finally {
      setUploading(false)
      setShowCamera(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleCapture(file)
  }

  return (
    <>
      <div className="w-full overflow-x-auto py-3 px-4 border-b border-white/5 no-scrollbar bg-slate-950/50">
        <div className="flex gap-4 items-center">
          {/* Add Story via Camera */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button 
              onClick={() => setShowCamera(true)}
              disabled={uploading}
              className={cn(
                "w-14 h-14 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-slate-900 transition-all hover:border-primary/50",
                uploading && "opacity-50 animate-pulse cursor-not-allowed"
              )}
            >
              <Plus className="w-6 h-6 text-muted-foreground" />
            </button>
            <span className="text-[10px] text-muted-foreground font-semibold">Camera</span>
          </div>

          {/* Add Story via Upload */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "w-14 h-14 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-slate-900 transition-all hover:border-primary/50",
                uploading && "opacity-50 animate-pulse cursor-not-allowed"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </button>
            <span className="text-[10px] text-muted-foreground font-semibold">Upload</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden" 
            />
          </div>

          {/* Stories */}
          {storyGroups.map((group, index) => (
            <div key={group.user_id} className="flex flex-col items-center gap-1.5 shrink-0">
              <button 
                onClick={() => setActiveGroupIndex(index)}
                className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-primary to-accent hover:scale-105 transition-all"
              >
                <div className="w-full h-full rounded-full border-2 border-slate-950 overflow-hidden bg-slate-800">
                  {group.profiles.avatar_url ? (
                    <img src={group.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-muted-foreground">
                      {group.profiles.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
              <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[56px]">
                {group.user_id === currentUserId ? 'You' : group.profiles.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showCamera && (
        <CameraModal 
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Story Viewer Overlay */}
      {activeGroupIndex !== null && (
        <StoryViewer 
          groups={storyGroups} 
          initialGroupIndex={activeGroupIndex} 
          onClose={() => setActiveGroupIndex(null)} 
        />
      )}
    </>
  )
}

function StoryViewer({ groups, initialGroupIndex, onClose }: { groups: StoryGroup[], initialGroupIndex: number, onClose: () => void }) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  
  const currentGroup = groups[currentGroupIndex]
  const currentStory = currentGroup.stories[currentStoryIndex]

  // Interval for updating progress strictly, no side-effects
  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return p
        return p + 2 // 50 ticks * 100ms = 5000ms = 5s
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [currentGroupIndex, currentStoryIndex])

  // Effect for handling story transitions when progress finishes
  useEffect(() => {
    if (progress >= 100) {
      if (currentStoryIndex < currentGroup.stories.length - 1) {
        setCurrentStoryIndex(i => i + 1)
        setProgress(0)
      } else if (currentGroupIndex < groups.length - 1) {
        setCurrentGroupIndex(i => i + 1)
        setCurrentStoryIndex(0)
        setProgress(0)
      } else {
        onClose()
      }
    }
  }, [progress, currentStoryIndex, currentGroup.stories.length, currentGroupIndex, groups.length, onClose])

  const nextStory = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(i => i + 1)
      setProgress(0)
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(i => i + 1)
      setCurrentStoryIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(i => i - 1)
      setProgress(0)
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(i => i - 1)
      setCurrentStoryIndex(groups[currentGroupIndex - 1].stories.length - 1)
      setProgress(0)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextStory()
      } else if (e.key === 'ArrowLeft') {
        prevStory()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentGroupIndex, currentStoryIndex, groups, onClose])

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white z-50">
        <X className="w-8 h-8" />
      </button>

      <div className="w-full max-w-md h-[85vh] relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Progress Bar for Current Group */}
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
          {currentGroup.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ width: i === currentStoryIndex ? `${progress}%` : i < currentStoryIndex ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Profile Info */}
        <div className="absolute top-8 left-4 z-20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-slate-800">
            {currentGroup.profiles.avatar_url ? (
              <img src={currentGroup.profiles.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs">{currentGroup.profiles.username[0].toUpperCase()}</div>
            )}
          </div>
          <span className="font-bold text-white shadow-black drop-shadow-md">{currentGroup.profiles.display_name || currentGroup.profiles.username}</span>
          <span className="text-xs text-white/70 shadow-black drop-shadow-md">
            {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Image/Video */}
        <div className="flex-1 relative bg-black">
          {currentStory.media_type === 'video' ? (
            <video src={currentStory.media_url} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={currentStory.media_url} className="w-full h-full object-cover" alt="Story" />
          )}
        </div>

        {/* Navigation Overlays */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={prevStory} />
        <div className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer" onClick={nextStory} />
      </div>
    </div>
  )
}

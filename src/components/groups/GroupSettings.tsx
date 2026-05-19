'use client'

import { useState, useEffect } from 'react'
import { Shield, UserMinus, UserPlus, Crown, Settings, Trash2, LogOut, ChevronRight, X, Users } from 'lucide-react'
import { updateGroupInfo, manageMember, deleteGroup } from '@/app/(app)/chat/actions'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Member {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export function GroupSettings({ channel, currentUserId, onClose }: { channel: any, currentUserId: string, onClose: () => void }) {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const isOwner = channel.owner_id === currentUserId
  const isAdmin = members.find(m => m.user_id === currentUserId)?.role === 'admin' || isOwner

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('channel_members')
        .select('user_id, role, profiles(username, display_name, avatar_url)')
        .eq('channel_id', channel.id)
      
      if (data) setMembers(data as Member[])
    }
    fetchMembers()
  }, [channel.id, supabase])

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setLoading(true)
    try {
      await action()
      toast.success(successMsg)
      
      // Refresh members after action
      const { data } = await supabase
        .from('channel_members')
        .select('user_id, role, profiles(username, display_name, avatar_url)')
        .eq('channel_id', channel.id)
      if (data) setMembers(data as Member[])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-12 relative">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-50"
      >
        <X className="w-6 h-6 text-muted-foreground" />
      </button>
      
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Profile Section */}
        <section className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-3xl bg-slate-900 border-2 border-white/5 overflow-hidden flex-shrink-0 relative group">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">{channel.name[0]}</div>
            )}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Settings className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{channel.name}</h1>
              <p className="text-muted-foreground">{channel.description || 'No description provided.'}</p>
            </div>
            
            <div className="flex gap-4">
              <span className="glass px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-primary border border-primary/20">
                {channel.type}
              </span>
              <span className="glass px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-muted-foreground border border-white/5">
                {members.length} Members
              </span>
            </div>
          </div>
        </section>

        {/* Member Management */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Members
            </h3>
            {isAdmin && (
              <button className="flex items-center gap-2 text-sm text-primary hover:underline font-semibold">
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
            )}
          </div>

          <div className="glass rounded-3xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {members.map((member) => (
              <div key={member.user_id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden">
                    {member.profiles.avatar_url ? <img src={member.profiles.avatar_url} /> : <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{member.profiles.username[0]}</div>}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {member.profiles.display_name || member.profiles.username}
                      {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                      {member.role === 'admin' && <Shield className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{member.role}</div>
                  </div>
                </div>

                {isAdmin && member.user_id !== currentUserId && member.role !== 'owner' && (
                  <div className="flex items-center gap-2">
                    {isOwner && member.role === 'member' && (
                      <button 
                        onClick={() => handleAction(() => manageMember(channel.id, member.user_id, 'promote'), 'Promoted to Admin')}
                        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        title="Promote to Admin"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    )}
                    {isOwner && member.role === 'admin' && (
                      <button 
                        onClick={() => handleAction(() => manageMember(channel.id, member.user_id, 'demote'), 'Demoted to Member')}
                        className="p-2 hover:bg-yellow-500/10 text-yellow-500 rounded-lg transition-colors"
                        title="Demote to Member"
                      >
                        <Shield className="w-5 h-5 opacity-50" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleAction(() => manageMember(channel.id, member.user_id, 'remove'), 'Member removed')}
                      className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors"
                      title="Remove Member"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-12 border-t border-white/5 space-y-6">
          <h3 className="text-xl font-bold text-accent flex items-center gap-2">
            <Trash2 className="w-6 h-6" />
            Danger Zone
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              className="flex items-center justify-between p-6 rounded-3xl bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-all text-left group"
            >
              <div>
                <div className="font-bold text-accent mb-1 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Leave Group
                </div>
                <div className="text-xs text-muted-foreground">You will no longer be able to see messages.</div>
              </div>
              <ChevronRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {isOwner && (
              <button 
                onClick={() => { if(confirm('Are you sure? This cannot be undone.')) deleteGroup(channel.id) }}
                className="flex items-center justify-between p-6 rounded-3xl bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-all text-left group"
              >
                <div>
                  <div className="font-bold text-accent mb-1 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Delete Group
                  </div>
                  <div className="text-xs text-muted-foreground">Permanently delete this group and all messages.</div>
                </div>
                <ChevronRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

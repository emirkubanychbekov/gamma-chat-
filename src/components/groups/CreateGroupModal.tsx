'use client'

import { useState } from 'react'
import { X, Camera, Users, ArrowRight, Check, Loader2, Search } from 'lucide-react'
import { createGroup } from '@/app/(app)/chat/actions'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  username: string
  avatar_url: string | null
}

export function CreateGroupModal({ isOpen, onClose, contacts }: { isOpen: boolean, onClose: () => void, contacts: Contact[] }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [groupInfo, setGroupInfo] = useState({
    name: '',
    description: '',
    type: 'group' as 'group' | 'supergroup',
    avatar_url: ''
  })

  if (!isOpen) return null

  const filteredContacts = contacts.filter(c => 
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', groupInfo.name)
      formData.append('description', groupInfo.description)
      formData.append('type', groupInfo.type)
      formData.append('avatar_url', groupInfo.avatar_url)

      const newGroup = await createGroup(formData, selectedMembers)
      toast.success('Group created!')
      onClose()
      router.push(`/chat/${newGroup.id}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{step === 1 ? 'New Group' : 'Add Members'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-3xl bg-slate-900 border-2 border-dashed border-white/10 flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Group Avatar</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <input 
                    value={groupInfo.name}
                    onChange={e => setGroupInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name..."
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Description (Optional)</label>
                  <textarea 
                    value={groupInfo.description}
                    onChange={e => setGroupInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What is this group about?"
                    rows={3}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setGroupInfo(prev => ({ ...prev, type: 'group' }))}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left",
                      groupInfo.type === 'group' ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="font-bold mb-1">Standard Group</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">1:1 & Group Chat</div>
                  </button>
                  <button 
                    onClick={() => setGroupInfo(prev => ({ ...prev, type: 'supergroup' }))}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left",
                      groupInfo.type === 'supergroup' ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="font-bold mb-1">Supergroup</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Topics & Channels</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex-1 space-y-1">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => toggleMember(contact.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">
                        {contact.avatar_url ? <img src={contact.avatar_url} /> : <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{contact.username[0]}</div>}
                      </div>
                      <span className="font-medium">{contact.username}</span>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                      selectedMembers.includes(contact.id) ? "bg-primary border-primary" : "border-white/10"
                    )}>
                      {selectedMembers.includes(contact.id) && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5">
          <button
            onClick={() => step === 1 ? setStep(2) : handleCreate()}
            disabled={step === 1 ? !groupInfo.name : loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl transition-all glow flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {step === 1 ? 'Next: Add Members' : `Create Group (${selectedMembers.length} selected)`}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

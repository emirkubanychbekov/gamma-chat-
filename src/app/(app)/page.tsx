import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Users, Shield, Zap, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 -right-64 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-64 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-3 h-3" />
          Welcome to the Future
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{profile?.username || 'Pioneer'}</span>.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your interstellar hub for real-time communication is ready. 
            Connect with your crew, start a supergroup, or initiate a secure call.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          {[
            { icon: MessageSquare, title: 'Real-time', desc: 'Instant message delivery' },
            { icon: Users, title: 'Topics', desc: 'Organized forum-style threads' },
            { icon: Shield, title: 'Secure', desc: 'End-to-end encrypted signals' }
          ].map((feature, i) => (
            <div key={i} className="glass p-6 rounded-3xl border border-white/5 text-left space-y-2 hover:border-primary/20 transition-all cursor-default group">
              <feature.icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-slate-100">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground italic">Select a channel from the sidebar or create a new group to start chatting.</p>
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Zap className="w-4 h-4" />
            Everything is synced in real-time
          </div>
        </div>
      </div>
    </div>
  )
}

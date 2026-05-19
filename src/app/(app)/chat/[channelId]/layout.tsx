import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopicsSidebar } from '@/components/supergroup/TopicsSidebar'

interface ChatLayoutProps {
  children: React.ReactNode
  params: Promise<{ channelId: string }>
}

export default async function ChatLayout({ children, params }: ChatLayoutProps) {
  const { channelId } = await params
  const supabase = await createClient()

  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (error || !channel) {
    redirect('/')
  }

  const isSupergroup = channel.type === 'supergroup'

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      {isSupergroup && (
        <aside className="w-64 border-r border-white/5 flex-shrink-0 hidden md:flex flex-col">
          <TopicsSidebar channelId={channelId} />
        </aside>
      )}
      
      <main className="flex-1 min-w-0 h-full relative">
        {children}
      </main>
    </div>
  )
}

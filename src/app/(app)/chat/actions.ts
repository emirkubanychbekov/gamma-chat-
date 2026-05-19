'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createGroup(formData: FormData, memberIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const type = formData.get('type') as 'group' | 'supergroup'
  const avatar_url = formData.get('avatar_url') as string

  // 1. Create channel
  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .insert({
      name,
      description,
      type,
      avatar_url,
      owner_id: user.id
    })
    .select()
    .single()

  if (channelError) throw channelError

  // 2. Add creator as admin
  const members = [
    { channel_id: channel.id, user_id: user.id, role: 'admin' },
    ...memberIds.map(id => ({ channel_id: channel.id, user_id: id, role: 'member' }))
  ]

  const { error: memberError } = await supabase
    .from('channel_members')
    .insert(members)

  if (memberError) throw memberError

  revalidatePath('/')
  return channel
}

export async function createTopic(channelId: string, name: string, emoji: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('topics')
    .insert({
      channel_id: channelId,
      name,
      icon_emoji: emoji
    })
    .select()
    .single()

  if (error) throw error
  
  revalidatePath(`/chat/${channelId}`)
  return data
}

export async function updateGroupInfo(channelId: string, data: any) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('channels')
    .update(data)
    .eq('id', channelId)

  if (error) throw error
  revalidatePath(`/chat/${channelId}`)
}

export async function manageMember(channelId: string, userId: string, action: 'add' | 'remove' | 'promote' | 'demote') {
  const supabase = await createClient()

  if (action === 'remove') {
    await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', userId)
  } else {
    const role = action === 'promote' ? 'admin' : 'member'
    await supabase.from('channel_members').upsert({ channel_id: channelId, user_id: userId, role })
  }

  revalidatePath(`/chat/${channelId}`)
}

export async function deleteGroup(channelId: string) {
  const supabase = await createClient()
  await supabase.from('channels').delete().eq('id', channelId)
  redirect('/')
}

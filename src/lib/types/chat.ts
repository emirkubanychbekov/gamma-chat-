export type MessageType = 'text' | 'image' | 'file' | 'system' | 'call'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  status?: string | null
  status_emoji?: string | null
  last_seen?: string | null
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
}

export interface Attachment {
  id: string
  message_id: string
  filename: string
  file_path: string
  content_type: string
  size_bytes: number
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
  thumbnail_url?: string | null
  created_at: string
}

export interface Message {
  id: string
  channel_id: string
  sender_id: string
  content: string
  type: MessageType
  topic_id?: string | null
  reply_to_id: string | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  metadata?: Record<string, any> | null
  isOptimistic?: boolean
  profiles?: Profile // Joined profile
  reply_to?: Message // Joined reply
  reactions?: Reaction[] // Joined reactions
  attachments?: Attachment[] // Joined attachments
}

export interface Channel {
  id: string
  type: 'dm' | 'group' | 'supergroup'
  name: string | null
  description?: string | null
  avatar_url?: string | null
  owner_id: string | null
  created_at: string
}

export interface ChannelMember {
  channel_id: string
  user_id: string
  role: 'admin' | 'member'
  last_read_at: string
}

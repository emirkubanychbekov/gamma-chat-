import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record, table, type } = await req.json()

    // 1. Get the sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', record.sender_id)
      .single()

    // 2. Get all members of the channel except the sender
    const { data: members } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', record.channel_id)
      .neq('user_id', record.sender_id)

    if (!members || members.length === 0) return new Response('No recipients')

    // 3. Get push tokens for these members
    const userIds = members.map(m => m.user_id)
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', userIds)

    if (!tokens || tokens.length === 0) return new Response('No tokens')

    // 4. Send notification (Simulation/FCM Integration)
    // Note: In a real FCM setup, you would use the FCM Admin SDK or HTTP v1 API
    const notification = {
      title: sender?.display_name || sender?.username || 'New Message',
      body: record.content.substring(0, 50),
      icon: sender?.avatar_url,
      url: `/chat/${record.channel_id}`
    }

    console.log(`Sending notification to ${tokens.length} tokens:`, notification)

    // For demonstration, we'll just log. 
    // To implement FCM, you'd fetch('https://fcm.googleapis.com/v1/projects/.../messages:send', ...)

    return new Response(JSON.stringify({ success: true, recipients: tokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

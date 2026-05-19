-- 1. Add last_read_at to channel_members
alter table public.channel_members 
add column if not exists last_read_at timestamptz default now();

-- 2. Create reactions table
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

-- 3. Enable RLS
alter table public.reactions enable row level security;

-- 4. RLS Policies for Reactions
create policy "Reactions are viewable by everyone in the channel"
  on public.reactions for select
  using (
    exists (
      select 1 from public.messages m
      join public.channel_members cm on cm.channel_id = m.channel_id
      where m.id = reactions.message_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Users can add reactions"
  on public.reactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can remove their own reactions"
  on public.reactions for delete
  using ( auth.uid() = user_id );

-- 5. RLS Policies for Messages (assuming they were missing)
create policy "Messages are viewable by channel members"
  on public.messages for select
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = messages.channel_id
      and user_id = auth.uid()
    )
  );

create policy "Channel members can insert messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.channel_members
      where channel_id = messages.channel_id
      and user_id = auth.uid()
    )
  );

create policy "Users can update their own messages"
  on public.messages for update
  using ( auth.uid() = sender_id );

-- 6. Function to update last_read_at
create or replace function public.update_last_read_at(p_channel_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.channel_members
  set last_read_at = now()
  where channel_id = p_channel_id
  and user_id = auth.uid();
end;
$$;

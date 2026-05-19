-- 1. Update channels table for groups
alter table public.channels 
add column if not exists description text,
add column if not exists avatar_url text;

-- Update type constraint to include supergroup
alter table public.channels drop constraint if exists channels_type_check;
alter table public.channels add constraint channels_type_check check (type in ('dm', 'group', 'supergroup'));

-- 2. Create topics table
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade not null,
  name text not null,
  description text,
  icon_emoji text default '💬',
  is_archived boolean default false,
  message_count integer default 0,
  created_at timestamptz default now()
);

-- 3. Update messages table for topics
alter table public.messages 
add column if not exists topic_id uuid references public.topics(id) on delete cascade;

-- 4. Enable RLS
alter table public.topics enable row level security;

-- 5. RLS Policies for Topics
create policy "Topics are viewable by channel members"
  on public.topics for select
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = topics.channel_id
      and user_id = auth.uid()
    )
  );

create policy "Admins can manage topics"
  on public.topics for all
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = topics.channel_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- 6. Trigger to create General topic for supergroups
create or replace function public.handle_new_supergroup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type = 'supergroup' then
    insert into public.topics (channel_id, name, icon_emoji)
    values (new.id, 'General', '📢');
  end if;
  return new;
end;
$$;

create trigger on_supergroup_created
  after insert on public.channels
  for each row execute procedure public.handle_new_supergroup();

-- 7. Update message count trigger
create or replace function public.update_topic_message_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.topics set message_count = message_count + 1 where id = new.topic_id;
  elsif (tg_op = 'DELETE') then
    update public.topics set message_count = message_count - 1 where id = old.topic_id;
  end if;
  return null;
end;
$$;

create trigger on_message_topic_change
  after insert or delete on public.messages
  for each row execute procedure public.update_topic_message_count();

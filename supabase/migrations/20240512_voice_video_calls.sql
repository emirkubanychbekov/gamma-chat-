-- 1. Create calls table
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade not null,
  caller_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('audio', 'video')) not null,
  room_name text not null unique, -- LiveKit room name
  status text check (status in ('ongoing', 'ended')) default 'ongoing',
  created_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds integer
);

-- 2. Update messages table for call types
alter table public.messages drop constraint if exists messages_type_check;
-- (Assuming type was a simple text column, otherwise update constraint)

-- 3. Enable RLS
alter table public.calls enable row level security;

-- 4. RLS Policies for Calls
create policy "Calls are viewable by channel members"
  on public.calls for select
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = calls.channel_id
      and user_id = auth.uid()
    )
  );

create policy "Users can start calls in their channels"
  on public.calls for insert
  with check (
    exists (
      select 1 from public.channel_members
      where channel_id = calls.channel_id
      and user_id = auth.uid()
    )
  );

create policy "Any member can end the call"
  on public.calls for update
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = calls.channel_id
      and user_id = auth.uid()
    )
  );

-- 5. Helper function to calculate duration on end
create or replace function public.calculate_call_duration()
returns trigger as $$
begin
  if (new.status = 'ended' and old.status = 'ongoing') then
    new.ended_at = now();
    new.duration_seconds = extract(epoch from (new.ended_at - new.created_at));
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_call_ended
  before update on public.calls
  for each row execute procedure public.calculate_call_duration();

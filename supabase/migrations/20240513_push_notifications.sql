-- 1. Create push_tokens table
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null unique,
  platform text, -- 'web', 'android', 'ios'
  created_at timestamptz default now()
);

-- 2. Create notification_preferences table
create table if not exists public.notification_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  global_mute boolean default false,
  quiet_hours_start time,
  quiet_hours_end time,
  muted_channels uuid[] default '{}'::uuid[]
);

-- 3. Enable RLS
alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;

-- 4. RLS Policies
create policy "Users can manage their own tokens"
  on public.push_tokens for all
  using ( auth.uid() = user_id );

create policy "Users can manage their own preferences"
  on public.notification_preferences for all
  using ( auth.uid() = user_id );

-- 5. Auto-create preferences for new users
create or replace function public.handle_new_user_notifications()
returns trigger as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger on_user_created_notifications
  after insert on auth.users
  for each row execute procedure public.handle_new_user_notifications();

-- 6. Trigger to notify Edge Function on new message
-- Note: This requires the pg_net extension to be enabled in Supabase
create or replace function public.notify_on_new_message()
returns trigger as $$
begin
  perform
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer your-service-role-key'
      ),
      body := jsonb_build_object(
        'record', row_to_json(new),
        'table', 'messages',
        'type', 'INSERT'
      )
    );
  return new;
end;
$$ language plpgsql;

create trigger on_message_inserted_notify
  after insert on public.messages
  for each row
  when (new.type != 'system')
  execute procedure public.notify_on_new_message();

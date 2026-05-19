-- 1. Create attachments table
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  filename text not null,
  file_path text not null, -- Supabase storage path
  content_type text not null,
  size_bytes bigint not null,
  width integer, -- for images/videos
  height integer, -- for images/videos
  duration_seconds float, -- for audio/video
  thumbnail_url text, -- optional thumbnail for video
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.attachments enable row level security;

-- 3. Storage bucket setup
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);

-- 4. RLS policies for attachments table
create policy "Attachments are viewable by channel members"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages m
      join public.channel_members cm on cm.channel_id = m.channel_id
      where m.id = attachments.message_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Users can insert attachments for their own messages"
  on public.attachments for insert
  with check (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id
      and m.sender_id = auth.uid()
    )
  );

-- 5. Storage RLS policies
create policy "Users can upload attachments"
  on storage.objects for insert
  with check ( bucket_id = 'attachments' AND auth.role() = 'authenticated' );

create policy "Users can view their channel attachments"
  on storage.objects for select
  using ( bucket_id = 'attachments' AND auth.role() = 'authenticated' );

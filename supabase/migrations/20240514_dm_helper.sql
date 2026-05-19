-- Function to find a DM channel between current user and target user
create or replace function public.get_dm_channel(target_user_id uuid)
returns uuid as $$
declare
  found_channel_id uuid;
begin
  select cm1.channel_id into found_channel_id
  from public.channel_members cm1
  join public.channel_members cm2 on cm1.channel_id = cm2.channel_id
  join public.channels c on cm1.channel_id = c.id
  where c.type = 'dm'
    and cm1.user_id = auth.uid()
    and cm2.user_id = target_user_id
  limit 1;
  
  return found_channel_id;
end;
$$ language plpgsql security definer;

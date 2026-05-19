-- 1. Fix the get_or_create_dm function (resolve ambiguity)
create or replace function public.get_or_create_dm(target_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  found_channel_id uuid;
  new_channel_id uuid;
begin
  -- Try to find existing DM
  select cm1.channel_id into found_channel_id
  from public.channel_members cm1
  join public.channel_members cm2 on cm1.channel_id = cm2.channel_id
  join public.channels c on cm1.channel_id = c.id
  where c.type = 'dm'
    and cm1.user_id = auth.uid()
    and cm2.user_id = target_user_id
  limit 1;

  if found_channel_id is not null then
    return found_channel_id;
  end if;

  -- Create new DM channel if not found
  insert into public.channels (type)
  values ('dm')
  returning id into new_channel_id;

  -- Add both members
  insert into public.channel_members (channel_id, user_id)
  values 
    (new_channel_id, auth.uid()),
    (new_channel_id, target_user_id);

  return new_channel_id;
end;
$$;

-- 2. Relax channel constraints to prevent 23514 check violations
alter table public.channels drop constraint if exists channels_type_check;
alter table public.channels add constraint channels_type_check check (type in ('dm', 'group', 'supergroup'));

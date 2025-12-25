-- Data integrity constraints for DaPaints
-- Ensure users can only be in one active DaPaint at a time

-- Function to check if a user has active 1v1 DaPaint as host
create or replace function public.user_has_active_1v1_host_dapaint(user_id_param uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 
    from dapaints 
    where host_id = user_id_param 
    and status in ('scheduled', 'pending_balance', 'live')
  );
$$;

-- Function to check if a user has active 1v1 DaPaint as foe
create or replace function public.user_has_active_1v1_foe_dapaint(user_id_param uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 
    from dapaints 
    where foe_id = user_id_param 
    and status in ('scheduled', 'pending_balance', 'live')
  );
$$;

-- Function to check if a user has active team DaPaint
create or replace function public.user_has_active_team_dapaint(user_id_param uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 
    from dapaint_participants dp
    join dapaints d on dp.dapaint_id = d.id
    where dp.user_id = user_id_param 
    and d.status in ('scheduled', 'pending_balance', 'live')
  );
$$;

-- Function to check if user can join a DaPaint (enforces exclusivity)
create or replace function public.can_user_join_dapaint(user_id_param uuid, dapaint_id_param uuid)
returns table(can_join boolean, message text)
language plpgsql
as $$
declare
  existing_host_count integer;
  existing_foe_count integer;
  existing_team_count integer;
  total_active integer;
  starts_at timestamp with time zone;
  hours_until_start numeric;
  is_host boolean;
  has_foe boolean;
  dapaint_type_param text;
  current_dapaint_id uuid;
begin
  -- Get DaPaint details
  select d.status, d.starts_at, d.dapaint_type, d.host_id
  into starts_at, starts_at, dapaint_type_param, current_dapaint_id
  from dapaints d
  where d.id = dapaint_id_param;

  -- Count existing active DaPaints for the user
  select 
    count(*) filter (where d.status in ('scheduled', 'pending_balance', 'live') and d.host_id = user_id_param) as host_count,
    count(*) filter (where d.status in ('scheduled', 'pending_balance', 'live') and d.foe_id = user_id_param) as foe_count
  into existing_host_count, existing_foe_count
  from dapaints d
  where (d.host_id = user_id_param or d.foe_id = user_id_param);

  select count(*) into existing_team_count
  from dapaint_participants dp
  join dapaints d on dp.dapaint_id = d.id
  where dp.user_id = user_id_param 
  and d.status in ('scheduled', 'pending_balance', 'live');

  total_active := existing_host_count + existing_foe_count + existing_team_count;

  -- If user is already in an active DaPaint, check rules
  if total_active > 0 then
    -- Get details of the current active DaPaint
    select 
      d.starts_at,
      case when d.host_id = user_id_param then true else false end,
      case when d.foe_id is not null then true else false end,
      d.dapaint_type
    into starts_at, is_host, has_foe, dapaint_type_param
    from dapaints d
    where (d.host_id = user_id_param or d.foe_id = user_id_param)
    and d.status in ('scheduled', 'pending_balance', 'live')
    limit 1;

    -- Calculate hours until start
    hours_until_start := extract(epoch from (starts_at - now())) / 3600;

    if dapaint_type_param = '1v1' then
      if is_host and has_foe and hours_until_start <= 48 then
        -- Host with foe within 48 hours - cannot join another
        return query select false, format('You''re in "%s" starting in %s. Leaving now = FORFEIT. You must complete or forfeit this DaPaint first.', 
          (select dapaint from dapaints where id = current_dapaint_id), 
          floor(hours_until_start) || 'h');
      elsif is_host and has_foe then
        -- Host with foe outside 48 hours - can leave
        return query select false, format('You''re hosting "%s". You can leave (DaPaint will be deleted) or wait for it to start.', 
          (select dapaint from dapaints where id = current_dapaint_id));
      elsif is_host then
        -- Host without foe - can leave
        return query select false, format('You''re hosting "%s" with no foe yet. You can delete it from the Create tab.', 
          (select dapaint from dapaints where id = current_dapaint_id));
      elsif hours_until_start <= 48 then
        -- Foe within 48 hours - cannot join another
        return query select false, format('You''re in "%s" starting in %s. Leaving now = FORFEIT. Complete this DaPaint first.', 
          (select dapaint from dapaints where id = current_dapaint_id), 
          floor(hours_until_start) || 'h');
      else
        -- Foe outside 48 hours - can leave
        return query select false, format('You''re in "%s". Leave or complete it first before joining another.', 
          (select dapaint from dapaints where id = current_dapaint_id));
      end if;
    else
      -- Team DaPaint
      return query select false, format('You''re in team DaPaint "%s". Leave or complete it first before joining another.', 
        (select dapaint from dapaints where id = current_dapaint_id));
    end if;
  end if;

  -- User can join
  return query select true, '';
end;
$$;

-- Function to join DaPaint with proper validation (replaces RPC)
create or replace function public.join_dapaint_safe(
  p_dapaint_id uuid,
  p_user_id uuid,
  p_display_name text
)
returns table(success boolean, message text)
language plpgsql
as $$
declare
  dapaint_type_param text;
  current_foe_id uuid;
  current_status text;
  user_active_count integer;
  starts_at timestamp with time zone;
  hours_until_start numeric;
begin
  -- Check if user can join (enforce exclusivity)
  select count(*) into user_active_count
  from (
    -- Count 1v1 DaPaints where user is host or foe
    select 1 from dapaints 
    where (host_id = p_user_id or foe_id = p_user_id)
    and status in ('scheduled', 'pending_balance', 'live')
    union all
    -- Count team DaPaints where user is participant
    select 1 from dapaint_participants dp
    join dapaints d on dp.dapaint_id = d.id
    where dp.user_id = p_user_id
    and d.status in ('scheduled', 'pending_balance', 'live')
  ) as active_dapaints;

  if user_active_count > 0 then
    return query select false, 'You''re already in an active DaPaint. Please complete or leave it first.';
  end if;

  -- Get DaPaint details
  select dapaint_type, foe_id, status, starts_at
  into dapaint_type_param, current_foe_id, current_status, starts_at
  from dapaints
  where id = p_dapaint_id;

  if dapaint_type_param = '1v1' then
    -- Check if 1v1 DaPaint already has a foe
    if current_foe_id is not null then
      return query select false, 'This 1v1 DaPaint already has a foe.';
    end if;

    -- Update the DaPaint to add the user as foe
    update dapaints
    set foe_id = p_user_id,
        foe_display_name = p_display_name
    where id = p_dapaint_id
    and foe_id is null; -- Prevent race condition

    if found then
      return query select true, 'Successfully joined 1v1 DaPaint';
    else
      return query select false, 'Failed to join DaPaint - may already have a foe';
    end if;
  else
    -- For team DaPaints, check if teams are balanced
    -- Get current team composition
    declare
      host_count integer;
      foe_count integer;
      max_participants integer;
      current_participants integer;
    begin
      select count(*) filter (where team = 'host'), 
             count(*) filter (where team = 'foe'),
             d.max_participants,
             count(*)
      into host_count, foe_count, max_participants, current_participants
      from dapaint_participants dp
      join dapaints d on dp.dapaint_id = d.id
      where dp.dapaint_id = p_dapaint_id
      group by d.max_participants;

      -- Check if DaPaint is full
      if current_participants >= max_participants then
        return query select false, 'Team DaPaint is full';
      end if;

      -- Check if teams are balanced (only allow joining if unbalanced or first join)
      if host_count > 0 and foe_count > 0 and host_count = foe_count then
        return query select false, 'Teams are currently balanced, cannot join';
      end if;

      -- Insert user into the team (prefer the smaller team or host if equal)
      declare
        team_to_join text := case 
          when host_count <= foe_count then 'host'
          else 'foe'
        end;
      begin
        insert into dapaint_participants (dapaint_id, user_id, team, display_name)
        values (p_dapaint_id, p_user_id, team_to_join, p_display_name);

        return query select true, 'Successfully joined team DaPaint';
      end;
    end;
  end if;
exception
  when others then
    return query select false, 'Error joining DaPaint: ' || sqlerrm;
end;
$$;

-- Create a trigger to enforce constraints on DaPaint updates
create or replace function public.enforce_user_exclusivity()
returns trigger
language plpgsql
as $$
declare
  user_id_param uuid;
  dapaint_type_param text;
  old_status text;
  new_status text;
begin
  -- Determine which user ID to check based on the operation
  if TG_OP = 'INSERT' then
    user_id_param := NEW.host_id;
    dapaint_type_param := NEW.dapaint_type;
    old_status := null;
    new_status := NEW.status;
  elsif TG_OP = 'UPDATE' then
    -- Check if the status changed to an active state or if a foe was added
    old_status := OLD.status;
    new_status := NEW.status;
    
    -- If a foe was added to a 1v1 DaPaint, check exclusivity for the foe
    if OLD.foe_id is null and NEW.foe_id is not null and NEW.dapaint_type = '1v1' then
      -- Check if the new foe is already in another active DaPaint
      if public.user_has_active_1v1_host_dapaint(NEW.foe_id) or 
         public.user_has_active_1v1_foe_dapaint(NEW.foe_id) or 
         public.user_has_active_team_dapaint(NEW.foe_id) then
        raise exception 'User % is already in an active DaPaint and cannot join this one', NEW.foe_id;
      end if;
    end if;
    
    -- Continue checking host exclusivity if status changed to active
    user_id_param := NEW.host_id;
    dapaint_type_param := NEW.dapaint_type;
  else
    return NEW;
  end if;

  -- Only enforce exclusivity when the DaPaint becomes active (scheduled, pending_balance, live)
  if (old_status not in ('scheduled', 'pending_balance', 'live') and 
      new_status in ('scheduled', 'pending_balance', 'live')) or
     (TG_OP = 'INSERT' and new_status in ('scheduled', 'pending_balance', 'live')) then
    
    -- Check if user is already in another active 1v1 DaPaint as host
    if public.user_has_active_1v1_host_dapaint(user_id_param) then
      raise exception 'User % is already hosting an active 1v1 DaPaint', user_id_param;
    end if;
    
    -- Check if user is already in another active 1v1 DaPaint as foe
    if public.user_has_active_1v1_foe_dapaint(user_id_param) then
      raise exception 'User % is already in an active 1v1 DaPaint as foe', user_id_param;
    end if;
    
    -- Check if user is already in another active team DaPaint
    if public.user_has_active_team_dapaint(user_id_param) then
      raise exception 'User % is already in an active team DaPaint', user_id_param;
    end if;
  end if;

  return NEW;
end;
$$;

-- Create the trigger on the dapaints table
drop trigger if exists enforce_user_exclusivity_trigger on dapaints;
create trigger enforce_user_exclusivity_trigger
  before insert or update on dapaints
  for each row
  execute function public.enforce_user_exclusivity();

-- Additional trigger for team DaPaint participants
create or replace function public.enforce_team_participant_exclusivity()
returns trigger
language plpgsql
as $$
declare
  user_id_param uuid;
begin
  user_id_param := NEW.user_id;
  
  -- Check if user is already in any active DaPaint
  if public.user_has_active_1v1_host_dapaint(user_id_param) or 
     public.user_has_active_1v1_foe_dapaint(user_id_param) or 
     public.user_has_active_team_dapaint(user_id_param) then
    raise exception 'User % is already in an active DaPaint and cannot join this team DaPaint', user_id_param;
  end if;

  return NEW;
end;
$$;

-- Create the trigger on the dapaint_participants table
drop trigger if exists enforce_team_participant_exclusivity_trigger on dapaint_participants;
create trigger enforce_team_participant_exclusivity_trigger
  before insert on dapaint_participants
  for each row
  execute function public.enforce_team_participant_exclusivity();
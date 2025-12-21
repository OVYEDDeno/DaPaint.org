-- database/functions.sql
-- Database functions to support data integrity checks and enforcement

-- Function to find users hosting multiple active 1v1 DaPaints
CREATE OR REPLACE FUNCTION find_multiple_active_dapaints_hosts()
RETURNS TABLE(host_id UUID, count BIGINT)
LANGUAGE sql
AS $$
  SELECT host_id, COUNT(*) as count
  FROM dapaints
  WHERE status IN ('scheduled', 'pending_balance', 'live')
    AND foe_id IS NOT NULL  -- Only 1v1 DaPaints (has a foe)
  GROUP BY host_id
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
$$;

-- Function to find users who are foes in multiple active 1v1 DaPaints
CREATE OR REPLACE FUNCTION find_multiple_active_dapaints_foes()
RETURNS TABLE(foe_id UUID, count BIGINT)
LANGUAGE sql
AS $$
  SELECT foe_id, COUNT(*) as count
  FROM dapaints
  WHERE status IN ('scheduled', 'pending_balance', 'live')
    AND foe_id IS NOT NULL  -- Only 1v1 DaPaints (has a foe)
  GROUP BY foe_id
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
$$;

-- Function to find users participating in multiple active team DaPaints
CREATE OR REPLACE FUNCTION find_multiple_active_team_dapaints()
RETURNS TABLE(user_id UUID, count BIGINT)
LANGUAGE sql
AS $$
  SELECT dp.user_id, COUNT(*) as count
  FROM dapaint_participants dp
  JOIN dapaints d ON dp.dapaint_id = d.id
  WHERE d.status IN ('scheduled', 'pending_balance', 'live')
    AND d.foe_id IS NULL  -- Only team DaPaints (no foe)
  GROUP BY dp.user_id
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
$$;

-- Trigger function to enforce user exclusivity constraint
-- Prevents a user from joining multiple active DaPaints
CREATE OR REPLACE FUNCTION enforce_user_exclusivity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Check if user is already in an active DaPaint as host
  SELECT COUNT(*) INTO active_count
  FROM dapaints
  WHERE (host_id = NEW.host_id OR foe_id = NEW.host_id)
    AND status IN ('scheduled', 'pending_balance', 'live')
    AND id != NEW.id;  -- Exclude the current DaPaint being inserted/updated
  
  IF active_count > 0 THEN
    RAISE EXCEPTION 'User % is already in an active DaPaint', NEW.host_id;
  END IF;
  
  -- Check if user is already in an active DaPaint as foe
  IF NEW.foe_id IS NOT NULL THEN
    SELECT COUNT(*) INTO active_count
    FROM dapaints
    WHERE (host_id = NEW.foe_id OR foe_id = NEW.foe_id)
      AND status IN ('scheduled', 'pending_balance', 'live')
      AND id != NEW.id;  -- Exclude the current DaPaint being inserted/updated
    
    IF active_count > 0 THEN
      RAISE EXCEPTION 'User % is already in an active DaPaint', NEW.foe_id;
    END IF;
  END IF;
  
  -- Check if user is already in an active team DaPaint
  -- This would need to be handled separately for team participants
  
  RETURN NEW;
END;
$$;

-- Trigger to enforce exclusivity on dapaints table
-- Note: This is a simplified version - full implementation would need more complex logic
CREATE OR REPLACE TRIGGER enforce_exclusivity_trigger
  BEFORE INSERT OR UPDATE ON dapaints
  FOR EACH ROW
  EXECUTE FUNCTION enforce_user_exclusivity();

-- Enhanced join_dapaint function with better error handling
CREATE OR REPLACE FUNCTION join_dapaint(p_dapaint_id UUID, p_user_id UUID, p_display_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_dapaint RECORD;
  v_existing_participant BOOLEAN;
  v_active_count INTEGER;
  v_result JSON;
BEGIN
  -- Get DaPaint details
  SELECT * INTO v_dapaint
  FROM dapaints
  WHERE id = p_dapaint_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'DaPaint not found');
  END IF;
  
  -- Check if DaPaint is still joinable
  IF v_dapaint.status != 'scheduled' THEN
    RETURN json_build_object('success', false, 'message', 'DaPaint is not available for joining');
  END IF;
  
  -- Check if user is already in this DaPaint
  IF v_dapaint.host_id = p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'You are already the host of this DaPaint');
  END IF;
  
  IF v_dapaint.foe_id = p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'You are already in this DaPaint');
  END IF;
  
  -- Check if user is already in ANY active DaPaint (enforce exclusivity)
  SELECT COUNT(*) INTO v_active_count
  FROM dapaints
  WHERE (host_id = p_user_id OR foe_id = p_user_id)
    AND status IN ('scheduled', 'pending_balance', 'live');
  
  IF v_active_count > 0 THEN
    RETURN json_build_object('success', false, 'message', 'User is already in an active DaPaint');
  END IF;
  
  -- Check if user is in any team DaPaint
  SELECT EXISTS(
    SELECT 1 
    FROM dapaint_participants dp
    JOIN dapaints d ON dp.dapaint_id = d.id
    WHERE dp.user_id = p_user_id
      AND d.status IN ('scheduled', 'pending_balance', 'live')
  ) INTO v_existing_participant;
  
  IF v_existing_participant THEN
    RETURN json_build_object('success', false, 'message', 'User is already in an active team DaPaint');
  END IF;
  
  -- Proceed with join based on DaPaint type
  IF v_dapaint.dapaint_type = '1v1' THEN
    -- Join as foe in 1v1
    UPDATE dapaints
    SET foe_id = p_user_id,
        foe_display_name = p_display_name
    WHERE id = p_dapaint_id;
    
    v_result := json_build_object('success', true, 'message', 'Successfully joined as foe');
  ELSE
    -- Join team DaPaint - add as participant on host team by default
    INSERT INTO dapaint_participants (dapaint_id, user_id, team)
    VALUES (p_dapaint_id, p_user_id, 'host');
    
    v_result := json_build_object('success', true, 'message', 'Successfully joined team');
  END IF;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error joining DaPaint: ' || SQLERRM);
END;
$$;

-- Function to handle automatic deletion of host DaPaints without foes when they reach start time
CREATE OR REPLACE FUNCTION cleanup_unmatched_dapaints()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete scheduled 1v1 DaPaints that have reached their start time and have no foe
  DELETE FROM dapaints
  WHERE status = 'scheduled'
    AND foe_id IS NULL
    AND starts_at <= NOW();
  
  -- Mark as draw DaPaints that have passed 24 hours since start time with no submissions
  UPDATE dapaints
  SET status = 'completed',
      submitted_winner_id = NULL,
      submitted_loser_id = NULL
  WHERE status = 'live'
    AND (
      -- 1v1 DaPaints with no submissions
      (dapaint_type = '1v1' AND submitted_winner_id IS NULL AND submitted_loser_id IS NULL AND starts_at <= NOW() - INTERVAL '24 hours')
      OR
      -- Team DaPaints with no submissions
      (dapaint_type = 'team' AND starts_at <= NOW() - INTERVAL '24 hours' AND NOT EXISTS (
        SELECT 1 FROM dapaint_participants WHERE dapaint_id = dapaints.id AND result_submitted = true
      ))
    );
  
  -- Decrease winstreak by 1 for both participants in drawn DaPaints
  -- For 1v1 DaPaints
  WITH drawn_1v1 AS (
    SELECT host_id, foe_id
    FROM dapaints
    WHERE status = 'completed'
      AND submitted_winner_id IS NULL
      AND submitted_loser_id IS NULL
      AND created_at >= NOW() - INTERVAL '1 minute'  -- Only recently updated
  )
  UPDATE users
  SET current_winstreak = GREATEST(0, current_winstreak - 1)
  WHERE id IN (
    SELECT host_id FROM drawn_1v1
    UNION
    SELECT foe_id FROM drawn_1v1 WHERE foe_id IS NOT NULL
  );
  
  -- For team DaPaints
  WITH drawn_teams AS (
    SELECT DISTINCT dp.user_id
    FROM dapaint_participants dp
    JOIN dapaints d ON dp.dapaint_id = d.id
    WHERE d.status = 'completed'
      AND d.submitted_winner_id IS NULL
      AND d.submitted_loser_id IS NULL
      AND d.created_at >= NOW() - INTERVAL '1 minute'  -- Only recently updated
  )
  UPDATE users
  SET current_winstreak = GREATEST(0, current_winstreak - 1)
  WHERE id IN (SELECT user_id FROM drawn_teams);
END;
$$;

-- Cron job function to be called periodically
CREATE OR REPLACE FUNCTION run_periodic_cleanup()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_unmatched_dapaints();
END;
$$;
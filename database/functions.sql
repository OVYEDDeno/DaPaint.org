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
  -- First, insert into done_dapaints table
  INSERT INTO done_dapaints (
    original_dapaint_id,
    host_display_name,
    foe_display_name,
    dapaint,
    host_id,
    winner_id,
    loser_id,
    was_draw,
    starts_at,
    completed_at,
    required_winstreak,
    host_winstreak_at_completion,
    winner_winstreak_at_completion,
    participants_snapshot,
    archived_at
  )
  SELECT 
    id as original_dapaint_id,
    host_display_name,
    foe_display_name,
    dapaint,
    host_id,
    NULL as winner_id,
    NULL as loser_id,
    TRUE as was_draw,
    starts_at,
    NOW() as completed_at,
    required_winstreak,
    (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
    NULL as winner_winstreak_at_completion,
    CASE 
      WHEN dapaint_type = 'team' THEN 
        (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
          (SELECT display_name FROM users WHERE id = dp.user_id))) 
         FROM dapaint_participants dp WHERE dp.dapaint_id = id)
      ELSE '[]'::jsonb
    END as participants_snapshot,
    NOW() as archived_at
  FROM dapaints
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
  
  -- Then update the original records
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

-- Function to process result submissions for DaPaints
CREATE OR REPLACE FUNCTION process_result_submission(
  p_dapaint_id UUID,
  p_user_id UUID,
  p_claimed_won BOOLEAN,
  p_proof_url TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_dapaint RECORD;
  v_host_submission INTEGER;
  v_foe_submission INTEGER;
  v_host_claimed_won INTEGER;
  v_foe_claimed_won INTEGER;
  v_winner_id UUID;
  v_conflict_type TEXT;
BEGIN
  -- Get DaPaint details
  SELECT * INTO v_dapaint
  FROM dapaints
  WHERE id = p_dapaint_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'DaPaint not found');
  END IF;
  
  -- Check if DaPaint is in the right state for submissions
  IF v_dapaint.status != 'live' THEN
    RETURN json_build_object('success', false, 'message', 'DaPaint is not in progress');
  END IF;
  
  -- Handle 1v1 DaPaints
  IF v_dapaint.dapaint_type = '1v1' THEN
    -- Update the DaPaint with the submission
    IF p_user_id = v_dapaint.host_id THEN
      -- Host submission
      UPDATE dapaints
      SET 
        submitted_winner_id = CASE WHEN p_claimed_won THEN v_dapaint.host_id ELSE NULL END,
        submitted_loser_id = CASE WHEN NOT p_claimed_won THEN v_dapaint.host_id ELSE NULL END
      WHERE id = p_dapaint_id;
    ELSIF p_user_id = v_dapaint.foe_id THEN
      -- Foe submission
      UPDATE dapaints
      SET 
        submitted_winner_id = CASE WHEN p_claimed_won THEN v_dapaint.foe_id ELSE NULL END,
        submitted_loser_id = CASE WHEN NOT p_claimed_won THEN v_dapaint.foe_id ELSE NULL END
      WHERE id = p_dapaint_id;
    ELSE
      RETURN json_build_object('success', false, 'message', 'User is not a participant in this DaPaint');
    END IF;
    
    -- Check if both participants have submitted
    SELECT 
      CASE WHEN submitted_winner_id IS NOT NULL OR submitted_loser_id IS NOT NULL THEN 1 ELSE 0 END
    INTO v_host_submission
    FROM dapaints
    WHERE id = p_dapaint_id AND (host_id = v_dapaint.host_id OR foe_id = v_dapaint.host_id);
    
    SELECT 
      CASE WHEN submitted_winner_id IS NOT NULL OR submitted_loser_id IS NOT NULL THEN 1 ELSE 0 END
    INTO v_foe_submission
    FROM dapaints
    WHERE id = p_dapaint_id AND (host_id = v_dapaint.foe_id OR foe_id = v_dapaint.foe_id);
    
    -- If both have submitted, resolve the outcome
    IF v_host_submission = 1 AND v_foe_submission = 1 THEN
      -- Get the actual claims
      SELECT 
        CASE WHEN submitted_winner_id = host_id THEN 1 ELSE 0 END
      INTO v_host_claimed_won
      FROM dapaints
      WHERE id = p_dapaint_id;
      
      SELECT 
        CASE WHEN submitted_winner_id = foe_id THEN 1 ELSE 0 END
      INTO v_foe_claimed_won
      FROM dapaints
      WHERE id = p_dapaint_id;
      
      -- Both claimed they won - create dispute
      IF v_host_claimed_won = 1 AND v_foe_claimed_won = 1 THEN
        v_conflict_type := 'both_won';
        INSERT INTO dapaint_disputes (dapaint_id, dispute_type, status)
        VALUES (p_dapaint_id, v_conflict_type, 'pending');
        
        RETURN json_build_object('success', true, 'message', 'Both players claimed victory. Dispute created for review.');
      
      -- Both claimed they lost - reset both winstreaks
      ELSIF v_host_claimed_won = 0 AND v_foe_claimed_won = 0 THEN
        -- Reset both winstreaks
        UPDATE users SET current_winstreak = GREATEST(0, current_winstreak - 1) WHERE id = v_dapaint.host_id;
        UPDATE users SET current_winstreak = GREATEST(0, current_winstreak - 1) WHERE id = v_dapaint.foe_id;
        
        -- Mark as draw and move to done_dapaints
        -- First, insert into done_dapaints table
        INSERT INTO done_dapaints (
          original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          winner_id,
          loser_id,
          was_draw,
          starts_at,
          completed_at,
          required_winstreak,
          host_winstreak_at_completion,
          winner_winstreak_at_completion,
          participants_snapshot,
          archived_at
        )
        SELECT 
          id as original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          submitted_winner_id as winner_id,
          submitted_loser_id as loser_id,
          (submitted_winner_id IS NULL AND submitted_loser_id IS NULL) as was_draw,
          starts_at,
          NOW() as completed_at,
          required_winstreak,
          (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
          (SELECT current_winstreak FROM users WHERE id = submitted_winner_id) as winner_winstreak_at_completion,
          CASE 
            WHEN dapaint_type = 'team' THEN 
              (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
                (SELECT display_name FROM users WHERE id = dp.user_id))) 
               FROM dapaint_participants dp WHERE dp.dapaint_id = id)
            ELSE '[]'::jsonb
          END as participants_snapshot,
          NOW() as archived_at
        FROM dapaints 
        WHERE id = p_dapaint_id;
        
        -- Then update the original record
        UPDATE dapaints 
        SET status = 'completed', submitted_winner_id = NULL, submitted_loser_id = NULL
        WHERE id = p_dapaint_id;
        
        RETURN json_build_object('success', true, 'message', 'Both players claimed loss. Winstreaks adjusted and match marked as draw.');
      
      -- Normal resolution - one claims win, other claims loss
      ELSE
        -- Determine winner and loser
        IF v_host_claimed_won = 1 AND v_foe_claimed_won = 0 THEN
          v_winner_id := v_dapaint.host_id;
        ELSIF v_foe_claimed_won = 1 AND v_host_claimed_won = 0 THEN
          v_winner_id := v_dapaint.foe_id;
        END IF;
        
        -- Update winstreaks
        UPDATE users SET current_winstreak = current_winstreak + 1 WHERE id = v_winner_id;
        UPDATE users SET current_winstreak = 0 WHERE id != v_winner_id AND id IN (v_dapaint.host_id, v_dapaint.foe_id);
        
        -- Mark as completed and move to done_dapaints
        -- First, insert into done_dapaints table
        INSERT INTO done_dapaints (
          original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          winner_id,
          loser_id,
          was_draw,
          starts_at,
          completed_at,
          required_winstreak,
          host_winstreak_at_completion,
          winner_winstreak_at_completion,
          participants_snapshot,
          archived_at
        )
        SELECT 
          id as original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          submitted_winner_id as winner_id,
          submitted_loser_id as loser_id,
          (submitted_winner_id IS NULL AND submitted_loser_id IS NULL) as was_draw,
          starts_at,
          NOW() as completed_at,
          required_winstreak,
          (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
          (SELECT current_winstreak FROM users WHERE id = submitted_winner_id) as winner_winstreak_at_completion,
          CASE 
            WHEN dapaint_type = 'team' THEN 
              (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
                (SELECT display_name FROM users WHERE id = dp.user_id))) 
               FROM dapaint_participants dp WHERE dp.dapaint_id = id)
            ELSE '[]'::jsonb
          END as participants_snapshot,
          NOW() as archived_at
        FROM dapaints 
        WHERE id = p_dapaint_id;
        
        -- Then update the original record
        UPDATE dapaints 
        SET status = 'completed', submitted_winner_id = v_winner_id
        WHERE id = p_dapaint_id;
        
        RETURN json_build_object('success', true, 'message', 'Match resolved successfully.');
      END IF;
    ELSE
      -- Not both submitted yet, just record the submission
      RETURN json_build_object('success', true, 'message', 'Result submitted. Waiting for opponent response.');
    END IF;
  
  -- Handle team DaPaints (same logic as 1v1 but for teams)
  ELSIF v_dapaint.dapaint_type = 'team' THEN
    -- Update participant record
    UPDATE dapaint_participants
    SET 
      result_submitted = true,
      submitted_winner_id = CASE WHEN p_claimed_won THEN p_user_id ELSE NULL END,
      proof_url = p_proof_url,
      submitted_at = NOW()
    WHERE dapaint_id = p_dapaint_id AND user_id = p_user_id;
    
    -- For team DaPaints, we need to check if we have submissions from both teams
    -- and apply the same logic as 1v1 DaPaints
    
    -- Check if we have submissions from both teams
    SELECT COUNT(*) INTO v_host_submission
    FROM dapaint_participants
    WHERE dapaint_id = p_dapaint_id AND team = 'host' AND result_submitted = true;
    
    SELECT COUNT(*) INTO v_foe_submission
    FROM dapaint_participants
    WHERE dapaint_id = p_dapaint_id AND team = 'foe' AND result_submitted = true;
    
    -- If both teams have submissions, resolve like 1v1
    IF v_host_submission > 0 AND v_foe_submission > 0 THEN
      -- Get the claims from both teams
      SELECT COUNT(*) INTO v_host_claimed_won
      FROM dapaint_participants
      WHERE dapaint_id = p_dapaint_id AND team = 'host' AND result_submitted = true AND submitted_winner_id IS NOT NULL;
      
      SELECT COUNT(*) INTO v_foe_claimed_won
      FROM dapaint_participants
      WHERE dapaint_id = p_dapaint_id AND team = 'foe' AND result_submitted = true AND submitted_winner_id IS NOT NULL;
      
      -- Both teams claim they won - create dispute
      IF v_host_claimed_won > 0 AND v_foe_claimed_won > 0 THEN
        v_conflict_type := 'both_won';
        INSERT INTO dapaint_disputes (dapaint_id, dispute_type, status)
        VALUES (p_dapaint_id, v_conflict_type, 'pending');
        
        RETURN json_build_object('success', true, 'message', 'Both teams claimed victory. Dispute created for review.');
      
      -- Both teams claim they lost - reset all winstreaks
      ELSIF v_host_claimed_won = 0 AND v_foe_claimed_won = 0 THEN
        -- Reset winstreaks for all participants
        UPDATE users 
        SET current_winstreak = GREATEST(0, current_winstreak - 1)
        WHERE id IN (
          SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id
        );
        
        -- Mark as draw and move to done_dapaints
        -- First, insert into done_dapaints table
        INSERT INTO done_dapaints (
          original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          winner_id,
          loser_id,
          was_draw,
          starts_at,
          completed_at,
          required_winstreak,
          host_winstreak_at_completion,
          winner_winstreak_at_completion,
          participants_snapshot,
          archived_at
        )
        SELECT 
          id as original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          submitted_winner_id as winner_id,
          submitted_loser_id as loser_id,
          (submitted_winner_id IS NULL AND submitted_loser_id IS NULL) as was_draw,
          starts_at,
          NOW() as completed_at,
          required_winstreak,
          (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
          (SELECT current_winstreak FROM users WHERE id = submitted_winner_id) as winner_winstreak_at_completion,
          CASE 
            WHEN dapaint_type = 'team' THEN 
              (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
                (SELECT display_name FROM users WHERE id = dp.user_id))) 
               FROM dapaint_participants dp WHERE dp.dapaint_id = id)
            ELSE '[]'::jsonb
          END as participants_snapshot,
          NOW() as archived_at
        FROM dapaints 
        WHERE id = p_dapaint_id;
        
        -- Then update the original record
        UPDATE dapaints 
        SET status = 'completed', submitted_winner_id = NULL, submitted_loser_id = NULL
        WHERE id = p_dapaint_id;
        
        RETURN json_build_object('success', true, 'message', 'Both teams claimed loss. All winstreaks adjusted and match marked as draw.');
      
      -- Normal resolution - one team claims win, other claims loss
      ELSE
        -- Determine winning team
        IF v_host_claimed_won > 0 AND v_foe_claimed_won = 0 THEN
          -- Host team wins - update winstreaks for host team (winners)
          UPDATE users 
          SET current_winstreak = current_winstreak + 1
          WHERE id IN (
            SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'host'
          );
          -- Reset winstreaks for foe team (losers)
          UPDATE users 
          SET current_winstreak = 0
          WHERE id IN (
            SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'foe'
          );
        ELSIF v_foe_claimed_won > 0 AND v_host_claimed_won = 0 THEN
          -- Foe team wins - update winstreaks for foe team (winners)
          UPDATE users 
          SET current_winstreak = current_winstreak + 1
          WHERE id IN (
            SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'foe'
          );
          -- Reset winstreaks for host team (losers)
          UPDATE users 
          SET current_winstreak = 0
          WHERE id IN (
            SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'host'
          );
        END IF;
        
        -- Mark as completed and move to done_dapaints
        -- First, insert into done_dapaints table
        INSERT INTO done_dapaints (
          original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          winner_id,
          loser_id,
          was_draw,
          starts_at,
          completed_at,
          required_winstreak,
          host_winstreak_at_completion,
          winner_winstreak_at_completion,
          participants_snapshot,
          archived_at
        )
        SELECT 
          id as original_dapaint_id,
          host_display_name,
          foe_display_name,
          dapaint,
          host_id,
          NULL as winner_id,
          NULL as loser_id,
          (submitted_winner_id IS NULL AND submitted_loser_id IS NULL) as was_draw,
          starts_at,
          NOW() as completed_at,
          required_winstreak,
          (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
          NULL as winner_winstreak_at_completion,
          CASE 
            WHEN dapaint_type = 'team' THEN 
              (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
                (SELECT display_name FROM users WHERE id = dp.user_id))) 
               FROM dapaint_participants dp WHERE dp.dapaint_id = id)
            ELSE '[]'::jsonb
          END as participants_snapshot,
          NOW() as archived_at
        FROM dapaints 
        WHERE id = p_dapaint_id;
        
        -- Then update the original record
        UPDATE dapaints 
        SET status = 'completed'
        WHERE id = p_dapaint_id;
        
        RETURN json_build_object('success', true, 'message', 'Team match resolved successfully.');
      END IF;
    ELSE
      -- Not both teams submitted yet, just record the submission
      RETURN json_build_object('success', true, 'message', 'Team result submitted. Waiting for other team response.');
    END IF;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Result processed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error processing result: ' || SQLERRM);
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

-- Function to resolve disputes and update DaPaint outcomes
CREATE OR REPLACE FUNCTION resolve_dapaint_dispute(
  p_dapaint_id UUID,
  p_winner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_dapaint RECORD;
  v_loser_id UUID;
BEGIN
  -- Get DaPaint details
  SELECT * INTO v_dapaint
  FROM dapaints
  WHERE id = p_dapaint_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'DaPaint not found');
  END IF;
  
  -- Check if DaPaint is in dispute
  IF v_dapaint.status != 'disputed' THEN
    RETURN json_build_object('success', false, 'message', 'DaPaint is not in dispute');
  END IF;
  
  -- Handle 1v1 DaPaints
  IF v_dapaint.dapaint_type = '1v1' THEN
    -- Determine loser
    IF p_winner_id = v_dapaint.host_id THEN
      v_loser_id := v_dapaint.foe_id;
    ELSIF p_winner_id = v_dapaint.foe_id THEN
      v_loser_id := v_dapaint.host_id;
    ELSE
      RETURN json_build_object('success', false, 'message', 'Winner is not a participant in this DaPaint');
    END IF;
    
    -- Update winstreaks
    UPDATE users SET current_winstreak = current_winstreak + 1 WHERE id = p_winner_id;
    UPDATE users SET current_winstreak = 0 WHERE id = v_loser_id;
    
    -- Move to done_dapaints and update
    INSERT INTO done_dapaints (
      original_dapaint_id,
      host_display_name,
      foe_display_name,
      dapaint,
      host_id,
      winner_id,
      loser_id,
      was_draw,
      starts_at,
      completed_at,
      required_winstreak,
      host_winstreak_at_completion,
      winner_winstreak_at_completion,
      participants_snapshot,
      archived_at
    )
    SELECT 
      id as original_dapaint_id,
      host_display_name,
      foe_display_name,
      dapaint,
      host_id,
      p_winner_id as winner_id,
      v_loser_id as loser_id,
      FALSE as was_draw,
      starts_at,
      NOW() as completed_at,
      required_winstreak,
      (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
      (SELECT current_winstreak FROM users WHERE id = p_winner_id) as winner_winstreak_at_completion,
      CASE 
        WHEN dapaint_type = 'team' THEN 
          (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
            (SELECT display_name FROM users WHERE id = dp.user_id))) 
           FROM dapaint_participants dp WHERE dp.dapaint_id = id)
        ELSE '[]'::jsonb
      END as participants_snapshot,
      NOW() as archived_at
    FROM dapaints 
    WHERE id = p_dapaint_id;
    
    UPDATE dapaints 
    SET status = 'completed', 
        submitted_winner_id = p_winner_id,
        submitted_loser_id = v_loser_id
    WHERE id = p_dapaint_id;
    
    -- Update dispute status
    UPDATE dapaint_disputes 
    SET status = 'resolved', resolved_at = NOW()
    WHERE dapaint_id = p_dapaint_id;
    
    RETURN json_build_object('success', true, 'message', '1v1 DaPaint dispute resolved successfully');
  
  -- Handle team DaPaints
  ELSIF v_dapaint.dapaint_type = 'team' THEN
    -- For team DaPaints, we need to update winstreaks for all team members
    -- Winner team members get +1, loser team members get reset to 0
    
    -- Determine which team won
    IF EXISTS (SELECT 1 FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND user_id = p_winner_id AND team = 'host') THEN
      -- Host team won
      -- Update winstreaks for host team (winners)
      UPDATE users 
      SET current_winstreak = current_winstreak + 1
      WHERE id IN (
        SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'host'
      );
      
      -- Reset winstreaks for foe team (losers)
      UPDATE users 
      SET current_winstreak = 0
      WHERE id IN (
        SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'foe'
      );
    ELSIF EXISTS (SELECT 1 FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND user_id = p_winner_id AND team = 'foe') THEN
      -- Foe team won
      -- Update winstreaks for foe team (winners)
      UPDATE users 
      SET current_winstreak = current_winstreak + 1
      WHERE id IN (
        SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'foe'
      );
      
      -- Reset winstreaks for host team (losers)
      UPDATE users 
      SET current_winstreak = 0
      WHERE id IN (
        SELECT user_id FROM dapaint_participants WHERE dapaint_id = p_dapaint_id AND team = 'host'
      );
    ELSE
      RETURN json_build_object('success', false, 'message', 'Winner is not a participant in this Team DaPaint');
    END IF;
    
    -- Move to done_dapaints and update
    INSERT INTO done_dapaints (
      original_dapaint_id,
      host_display_name,
      foe_display_name,
      dapaint,
      host_id,
      winner_id,
      loser_id,
      was_draw,
      starts_at,
      completed_at,
      required_winstreak,
      host_winstreak_at_completion,
      winner_winstreak_at_completion,
      participants_snapshot,
      archived_at
    )
    SELECT 
      id as original_dapaint_id,
      host_display_name,
      foe_display_name,
      dapaint,
      host_id,
      NULL as winner_id,
      NULL as loser_id,
      FALSE as was_draw,
      starts_at,
      NOW() as completed_at,
      required_winstreak,
      (SELECT current_winstreak FROM users WHERE id = host_id) as host_winstreak_at_completion,
      NULL as winner_winstreak_at_completion,
      CASE 
        WHEN dapaint_type = 'team' THEN 
          (SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'team', team, 'display_name', 
            (SELECT display_name FROM users WHERE id = dp.user_id))) 
           FROM dapaint_participants dp WHERE dp.dapaint_id = id)
        ELSE '[]'::jsonb
      END as participants_snapshot,
      NOW() as archived_at
    FROM dapaints 
    WHERE id = p_dapaint_id;
    
    UPDATE dapaints 
    SET status = 'completed'
    WHERE id = p_dapaint_id;
    
    -- Update dispute status
    UPDATE dapaint_disputes 
    SET status = 'resolved', resolved_at = NOW()
    WHERE dapaint_id = p_dapaint_id;
    
    RETURN json_build_object('success', true, 'message', 'Team DaPaint dispute resolved successfully');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Dispute resolved successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error resolving dispute: ' || SQLERRM);
END;
$$;
// lib/api/dapaints.ts
import { supabase } from "../supabase";
import logger from "../logger";

/**
 * Create a new DaPaint
 */
export async function createDaPaint(
  params: {
    dapaint: string;
    description: string | null;
    how_winner_is_determined: string;
    rules_of_dapaint: string | null;
    location: string;
    city: string;
    zipcode: string;
    starts_at: string;
    ticket_price: number;
    max_participants: number;
    dapaint_type: '1v1' | 'team';
  }
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get user's current winstreak
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("display_name, current_winstreak")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error("User not found");

    // Create the DaPaint
    const { error } = await supabase.from("dapaints").insert({
      host_id: user.id,
      host_display_name: userData.display_name,
      foe_id: null,
      foe_display_name: null,
      dapaint: params.dapaint,
      description: params.description,
      how_winner_is_determined: params.how_winner_is_determined,
      rules_of_dapaint: params.rules_of_dapaint,
      location: params.location,
      city: params.city,
      zipcode: params.zipcode.toUpperCase(),
      starts_at: params.starts_at,
      ticket_price: params.ticket_price.toString(),
      dapaint_type: params.dapaint_type,
      max_participants: params.max_participants,
      required_winstreak: userData.current_winstreak,
      status: "scheduled",
      host_claimed_winner_id: null,
      foe_claimed_winner_id: null,
    });

    if (error) throw error;

    logger.debug("Successfully created DaPaint");
  } catch (error: any) {
    logger.error("Error creating DaPaint:", error);
    throw error;
  }
}

export type DaPaint = {
  id: string;
  host_id: string;
  host_display_name: string;
  foe_id: string | null;
  foe_display_name: string | null;
  dapaint: string;
  description: string | null;
  how_winner_is_determined: string;
  rules_of_dapaint: string | null;
  location: string;
  city: string;
  zipcode: string;
  starts_at: string;
  image_url?: string | null;
  ticket_price: string; // keep as string (per DB), parse in UI
  host_image_url?: string | null;
  foe_image_url?: string | null;
  dapaint_type: "1v1" | "team";
  max_participants: number;
  required_winstreak: number;
  status: "scheduled" | "pending_balance" | "live" | "in_progress" | "completed";
  host_claimed_winner_id: string | null;
  foe_claimed_winner_id: string | null;
  created_at: string;
};

const normalizeZip = (zip?: string | null): string | null =>
  zip ? zip.trim().toUpperCase() : null;

/**
 * Join a DaPaint (either 1v1 or team)
 * Critical: Uses transactions to prevent race conditions
 * Enhanced: Adds additional validation to enforce user exclusivity
 */
export async function joinDaPaint(
  dapaintId: string,
  userId: string,
  displayName: string
): Promise<{ success: boolean; message: string; shouldRemoveFromCurrent?: boolean; currentDaPaint?: DaPaint }> {
  try {
    // First, check if user is already in an active DaPaint
    const activeDaPaint = await getActiveDaPaint(userId);
    if (activeDaPaint) {
      // User is already in an active DaPaint, check if they want to switch
      const startsAt = new Date(activeDaPaint.starts_at);
      const now = new Date();
      const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isWithin48Hours = hoursUntilStart <= 48;
      const hasFoe = !!activeDaPaint.foe_id;
      
      // Determine what happens if they leave their current DaPaint
      if (activeDaPaint.host_id === userId) {
        // User is host
        if (hasFoe && isWithin48Hours) {
          // Forfeit if within 48 hours
          return {
            success: false,
            message: `You're hosting "${activeDaPaint.dapaint}" starting in ${Math.max(0, Math.floor(hoursUntilStart))}h. Leaving now = FORFEIT. You must complete or forfeit this DaPaint first.`,
            shouldRemoveFromCurrent: false,
            currentDaPaint: activeDaPaint
          };
        } else if (hasFoe) {
          // Delete if outside 48 hours
          return {
            success: false,
            message: `You're hosting "${activeDaPaint.dapaint}". Leaving now will delete it. Continue?`,
            shouldRemoveFromCurrent: true,
            currentDaPaint: activeDaPaint
          };
        } else {
          // Delete unmatched host DaPaint
          return {
            success: false,
            message: `You're hosting "${activeDaPaint.dapaint}" with no foe yet. Leaving now will delete it. Continue?`,
            shouldRemoveFromCurrent: true,
            currentDaPaint: activeDaPaint
          };
        }
      } else if (activeDaPaint.foe_id === userId) {
        // User is foe
        if (isWithin48Hours) {
          // Forfeit if within 48 hours
          return {
            success: false,
            message: `You're in "${activeDaPaint.dapaint}" starting in ${Math.max(0, Math.floor(hoursUntilStart))}h. Leaving now = FORFEIT. Complete this DaPaint first.`,
            shouldRemoveFromCurrent: false,
            currentDaPaint: activeDaPaint
          };
        } else {
          // Just leave if outside 48 hours
          return {
            success: false,
            message: `You're in "${activeDaPaint.dapaint}". Leave or complete it first before joining another.`,
            shouldRemoveFromCurrent: true,
            currentDaPaint: activeDaPaint
          };
        }
      } else {
        // User is in team DaPaint
        return {
          success: false,
          message: `You're in team DaPaint "${activeDaPaint.dapaint}". Leave or complete it first before joining another.`,
          shouldRemoveFromCurrent: false, // Team members can leave freely
          currentDaPaint: activeDaPaint
        };
      }
    }

    // Use safe RPC function to prevent race conditions and enforce exclusivity
    const { data, error } = await supabase.rpc("join_dapaint_safe", {
      p_dapaint_id: dapaintId,
      p_user_id: userId,
      p_display_name: displayName,
    });

    if (error) {
      // Handle specific error cases
      if (error.message && error.message.includes("already in an active DaPaint")) {
        throw new Error("You're already in an active DaPaint. Please complete or leave it first.");
      }
      throw error;
    }

    // Check if join was successful
    if (!data || !data.success) {
      throw new Error(data?.message || "Failed to join DaPaint");
    }

    logger.debug("Successfully joined DaPaint:", data.message);
    return { success: true, message: data.message };
  } catch (error: any) {
    logger.error("Error joining DaPaint:", error);
    throw error;
  }
}

/**
 * Check if user can join a DaPaint based on their active status
 * Returns { canJoin: boolean, message: string }
 */
export async function canUserJoinDaPaint(
  userId: string
): Promise<{ canJoin: boolean; message: string }> {
  try {
    // Check if user already has an active DaPaint
    const activeDaPaint = await getActiveDaPaint(userId);

    if (!activeDaPaint) {
      return { canJoin: true, message: "" };
    }

    // User has an active DaPaint - determine the message
    const startsAt = new Date(activeDaPaint.starts_at);
    const now = new Date();
    const hoursUntilStart =
      (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithin48Hours = hoursUntilStart <= 48;
    const isHost = activeDaPaint.host_id === userId;
    const hasFoe = !!activeDaPaint.foe_id;

    let message = "";

    if (activeDaPaint.dapaint_type === "1v1") {
      if (isHost && hasFoe && isWithin48Hours) {
        message = `You're in "${
          activeDaPaint.dapaint
        }" starting in ${Math.floor(
          hoursUntilStart
        )}h. Leaving now = FORFEIT. You must complete or forfeit this DaPaint first.`;
      } else if (isHost && hasFoe) {
        message = `You're hosting "${activeDaPaint.dapaint}". You can leave (DaPaint will be deleted) or wait for it to start.`;
      } else if (isHost) {
        message = `You're hosting "${activeDaPaint.dapaint}" with no foe yet. You can delete it from the Create tab.`;
      } else if (isWithin48Hours) {
        message = `You're in "${
          activeDaPaint.dapaint
        }" starting in ${Math.floor(
          hoursUntilStart
        )}h. Leaving now = FORFEIT. Complete this DaPaint first.`;
      } else {
        message = `You're in "${activeDaPaint.dapaint}". Leave or complete it first before joining another.`;
      }
    } else {
      // Team DaPaint
      message = `You're in team DaPaint "${activeDaPaint.dapaint}". Leave or complete it first before joining another.`;
    }

    return { canJoin: false, message };
  } catch (error: any) {
    logger.error("Error checking if user can join:", error);
    return { canJoin: true, message: "" }; // Allow join on error
  }
}

/**
 * Leave a DaPaint
 * CORRECTED LOGIC:
 * - HOST with foe within 48 hours = FORFEIT (foe wins)
 * - HOST with foe outside 48 hours = DELETE DaPaint
 * - HOST without foe = DELETE DaPaint (always)
 * - FOE within 48 hours = FORFEIT (host wins)
 * - FOE outside 48 hours = LEAVE (just remove)
 */
export async function leaveDaPaint(
  dapaintId: string
): Promise<{ forfeit: boolean; deleted: boolean; winner?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get DaPaint details
    const { data: dapaint, error: fetchError } = await supabase
      .from("dapaints")
      .select("*")
      .eq("id", dapaintId)
      .single();

    if (fetchError) throw fetchError;
    if (!dapaint) throw new Error("DaPaint not found");

    const isHost = dapaint.host_id === user.id;
    const startsAt = new Date(dapaint.starts_at);
    const now = new Date();
    const hoursUntilStart =
      (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithin48Hours = hoursUntilStart <= 48;

    // HOST LOGIC
    if (isHost) {
      const hasFoe = !!dapaint.foe_id;

      // HOST WITH FOE WITHIN 48 HOURS = FORFEIT
      if (hasFoe && isWithin48Hours) {
        const winnerId = dapaint.foe_id!;
        const loserId = user.id;

        // Mark as completed with foe as winner
        const { error: updateError } = await supabase
          .from("dapaints")
          .update({
            status: "completed",
            host_claimed_winner_id: winnerId,
            foe_claimed_winner_id: loserId,
          })
          .eq("id", dapaintId);

        if (updateError) throw updateError;

        // Update winstreaks
        await updateWinstreaks(winnerId, loserId, false);

        return {
          forfeit: true,
          deleted: false,
          winner: dapaint.foe_display_name || "Foe",
        };
      }

      // HOST WITH FOE OUTSIDE 48 HOURS OR HOST WITHOUT FOE = DELETE
      // Delete all participants first (for team DaPaints)
      if (dapaint.dapaint_type === "team") {
        await supabase
          .from("dapaint_participants")
          .delete()
          .eq("dapaint_id", dapaintId);
      }

      // Delete the DaPaint
      const { error: deleteError } = await supabase
        .from("dapaints")
        .delete()
        .eq("id", dapaintId);

      if (deleteError) throw deleteError;

      return { forfeit: false, deleted: true };
    }

    // FOE LOGIC
    // Check if there's a foe
    let hasFoe: boolean;
    if (dapaint.dapaint_type === "1v1") {
      hasFoe = !!dapaint.foe_id;
    } else {
      hasFoe = await checkTeamHasFoes(dapaintId);
    }

    // FOE WITHIN 48 HOURS = FORFEIT (host wins)
    if (isWithin48Hours && hasFoe) {
      const winnerId = dapaint.host_id;
      const loserId = user.id;

      // Mark as completed
      const { error: updateError } = await supabase
        .from("dapaints")
        .update({
          status: "completed",
          host_claimed_winner_id: winnerId,
          foe_claimed_winner_id: loserId,
        })
        .eq("id", dapaintId);

      if (updateError) throw updateError;

      // Update winstreaks
      await updateWinstreaks(winnerId, loserId, false);

      return {
        forfeit: true,
        deleted: false,
        winner: dapaint.host_display_name,
      };
    }

    // FOE CAN LEAVE FREELY - Just remove from DaPaint
    if (dapaint.dapaint_type === "1v1") {
      // Clear foe fields
      const { error: updateError } = await supabase
        .from("dapaints")
        .update({
          foe_id: null,
          foe_display_name: null,
        })
        .eq("id", dapaintId);

      if (updateError) throw updateError;
    } else {
      // Remove from participants
      const { error: deleteError } = await supabase
        .from("dapaint_participants")
        .delete()
        .eq("dapaint_id", dapaintId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
    }

    return { forfeit: false, deleted: false };
  } catch (error: any) {
    logger.error("Error leaving DaPaint:", error);
    throw error;
  }
}

/**
 * Check if a team has foes (at least one member on each team)
 */
async function checkTeamHasFoes(dapaintId: string): Promise<boolean> {
  const { data: participants } = await supabase
    .from("dapaint_participants")
    .select("team")
    .eq("dapaint_id", dapaintId);

  if (!participants || participants.length < 2) return false;

  const hasHost = participants.some((p) => p.team === "host");
  const hasFoe = participants.some((p) => p.team === "foe");

  return hasHost && hasFoe;
}

/**
 * Get user's ONE active DaPaint (user can only be in ONE DaPaint at a time)
 * Enhanced to enforce data integrity and handle edge cases
 */
export async function getActiveDaPaint(
  userId: string
): Promise<DaPaint | null> {
  try {
    // NOTE: Temporarily disabling checkAndHandleExpiredDaPaints during active data fetch
    // to avoid transaction interference per project memory guidelines
    // This function was intentionally removed as it was unused
    // Check if user is host or foe in any 1v1 DaPaint
    const { data: as1v1, error: error1v1 } = await supabase
      .from("dapaints")
      .select("*")
      .or(`host_id.eq.${userId},foe_id.eq.${userId}`)
      .in("status", ["scheduled", "pending_balance", "live"])
      .order("created_at", { ascending: false });

    if (error1v1) throw error1v1;

    // Data integrity check - user should only be in one 1v1 DaPaint
    if (as1v1 && as1v1.length > 1) {
      logger.warn(`Data Integrity Violation: User ${userId} is in ${as1v1.length} active 1v1 DaPaints. This violates the exclusivity constraint.`);
      // Return the most recent one
      return as1v1[0];
    }

    if (as1v1 && as1v1.length > 0) {
      return as1v1[0];
    }

    // Check if user is in any team DaPaint
    const { data: teamParticipants, error: teamError } = await supabase
      .from("dapaint_participants")
      .select("dapaint_id")
      .eq("user_id", userId);

    if (teamError) throw teamError;

    if (teamParticipants && teamParticipants.length > 0) {
      const dapaintIds = teamParticipants.map((p) => p.dapaint_id);

      const { data: teamDaPaints, error: dapaintsError } = await supabase
        .from("dapaints")
        .select("*")
        .in("id", dapaintIds)
        .in("status", ["scheduled", "pending_balance", "live"])
        .order("created_at", { ascending: false });

      if (dapaintsError) throw dapaintsError;

      // Data integrity check - user should only be in one team DaPaint
      if (teamDaPaints && teamDaPaints.length > 1) {
        logger.warn(`Data Integrity Violation: User ${userId} is in ${teamDaPaints.length} active team DaPaints. This violates the exclusivity constraint.`);
        // Return the most recent one
        return teamDaPaints[0];
      }

      if (teamDaPaints && teamDaPaints.length > 0) {
        return teamDaPaints[0];
      }
    }

    return null;
  } catch (error: any) {
    logger.error("Error getting active DaPaint:", error);
    return null;
  }
}

/**
 * Get available DaPaints for feed
 * CRITICAL RULES:
 * 1. ONLY show DaPaints with EXACT same winstreak as user (not higher or lower)
 * 2. DON'T show user's own DaPaints (as host)
 * 3. DON'T show DaPaints user already joined
 * 4. DON'T show 1v1 DaPaints that already have both host AND foe
 * 5. DON'T show team DaPaints that are balanced/full
 * 6. STILL SHOW even if user has active DaPaint (they'll get message when trying to join)
 */
export async function getAvailableDaPaints(userId: string): Promise<DaPaint[]> {
  try {
    // Get user's EXACT winstreak
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_winstreak")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const userWinstreak = userData?.current_winstreak || 0;

    // Get all scheduled DaPaints with EXACT same winstreak (must be equal)
    const { data: dapaints, error } = await supabase
      .from("dapaints")
      .select("*")
      .eq("status", "scheduled")
      .eq("required_winstreak", userWinstreak)
      .order("created_at", { ascending: false });
  
    if (error) throw error;
  
    const rows = dapaints ?? [];

    const filtered: DaPaint[] = [];

    for (const dapaint of rows || []) {
      // Skip user's own DaPaints (as host)
      if (dapaint.host_id === userId) {
        continue;
      }

      // Skip if user is already the foe
      if (dapaint.foe_id === userId) {
        continue;
      }

      if (dapaint.dapaint_type === "1v1") {
        // Skip 1v1 that already has both host AND foe
        if (dapaint.foe_id) {
          continue;
        }
      } else {
        // Team DaPaint logic
        const { data: participants } = await supabase
          .from("dapaint_participants")
          .select("user_id, team")
          .eq("dapaint_id", dapaint.id);

        // Skip if user is already a participant
        const isParticipant = participants?.some((p) => p.user_id === userId);
        if (isParticipant) continue;

        // Skip if team is full (reached max_participants)
        if (participants && participants.length >= dapaint.max_participants) {
          continue;
        }

        // Skip if teams are balanced (equal number on both sides)
        if (participants && participants.length > 1) {
          const hostCount = participants.filter(
            (p) => p.team === "host"
          ).length;
          const foeCount = participants.filter((p) => p.team === "foe").length;

          // If balanced and at least 2 people, don't show
          if (hostCount === foeCount && hostCount > 0) {
            continue;
          }
        }
      }

      filtered.push(dapaint);
    }

    return filtered;
  } catch (error: any) {
    logger.error("Error getting available DaPaints:", error);
    throw error;
  }
}

/**
 * Get explore DaPaints (no zipcode filter, same winstreak)
 * Used for EXPLORE tab
 * Same rules as getAvailableDaPaints but WITHOUT zipcode filtering
 */
export async function getExploreDaPaints(userId: string): Promise<DaPaint[]> {
  try {
    // Get user's EXACT winstreak and zipcode
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_winstreak, zipcode")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const userWinstreak = userData?.current_winstreak || 0;
    const userZipcode = normalizeZip(userData?.zipcode);

    // Get all scheduled DaPaints with EXACT same winstreak (no zipcode filter)
    const { data: dapaints, error } = await supabase
      .from("dapaints")
      .select("*")
      .eq("status", "scheduled")
      .eq("required_winstreak", userWinstreak)
      .order("created_at", { ascending: false });
  
    if (error) throw error;
  
    const rows = dapaints ?? [];

    const filtered: DaPaint[] = [];

    for (const dapaint of rows || []) {
      // Skip user's own DaPaints (as host)
      if (dapaint.host_id === userId) {
        continue;
      }

      // Skip if user is already the foe
      if (dapaint.foe_id === userId) {
        continue;
      }

      // EXPLORE: Skip DaPaints that ARE in user's zipcode (show different zipcodes only)
      const dapaintZip = normalizeZip(dapaint.zipcode);
      if (userZipcode && dapaintZip === userZipcode) {
        continue;
      }

      if (dapaint.dapaint_type === "1v1") {
        // Skip 1v1 that already has both host AND foe
        if (dapaint.foe_id) {
          continue;
        }
      } else {
        // Team DaPaint logic
        const { data: participants } = await supabase
          .from("dapaint_participants")
          .select("user_id, team")
          .eq("dapaint_id", dapaint.id);

        // Skip if user is already a participant
        const isParticipant = participants?.some((p) => p.user_id === userId);
        if (isParticipant) continue;

        // Skip if team is full (reached max_participants)
        if (participants && participants.length >= dapaint.max_participants) {
          continue;
        }

        // Skip if teams are balanced (equal number on both sides)
        if (participants && participants.length > 1) {
          const hostCount = participants.filter(
            (p) => p.team === "host"
          ).length;
          const foeCount = participants.filter((p) => p.team === "foe").length;

          // If balanced and at least 2 people, don't show
          if (hostCount === foeCount && hostCount > 0) {
            continue;
          }
        }
      }

      filtered.push(dapaint);
    }

    return filtered;
  } catch (error: any) {
    logger.error("Error getting explore DaPaints:", error);
    throw error;
  }
}

export async function getLuckyDaPaints(userId: string): Promise<DaPaint[]> {
  try {
    // Get user's zipcode (but not winstreak, to show all winstreaks)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("zipcode")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const userZipcode = normalizeZip(userData?.zipcode);

    // Get all available DaPaints (ANY winstreak, different zipcode)
    // Include scheduled, pending_balance, and live DaPaints (not completed)
    const { data: dapaints, error } = await supabase
      .from("dapaints")
      .select("*")
      .in("status", ["scheduled", "pending_balance", "live"])
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    const rows = dapaints ?? [];

    const filtered: DaPaint[] = [];

    for (const dapaint of rows || []) {
      // Skip user's own DaPaints (as host)
      if (dapaint.host_id === userId) {
        continue;
      }

      // Skip if user is already the foe
      if (dapaint.foe_id === userId) {
        continue;
      }

      // LUCKY: Skip DaPaints that ARE in user's zipcode (show different zipcodes only)
      const dapaintZip = normalizeZip(dapaint.zipcode);
      if (userZipcode && dapaintZip === userZipcode) {
        continue;
      }

      if (dapaint.dapaint_type === "1v1") {
        // Skip 1v1 that already has both host AND foe
        if (dapaint.foe_id) {
          continue;
        }
      } else {
        // Team DaPaint logic
        const { data: participants } = await supabase
          .from("dapaint_participants")
          .select("user_id, team")
          .eq("dapaint_id", dapaint.id);

        // Skip if user is already a participant
        const isParticipant = participants?.some((p) => p.user_id === userId);
        if (isParticipant) continue;

        // Skip if team is full (reached max_participants)
        if (participants && participants.length >= dapaint.max_participants) {
          continue;
        }

        // Skip if teams are balanced (equal number on both sides)
        if (participants && participants.length > 1) {
          const hostCount = participants.filter(
            (p) => p.team === "host"
          ).length;
          const foeCount = participants.filter((p) => p.team === "foe").length;

          // If balanced and at least 2 people, don't show
          if (hostCount === foeCount && hostCount > 0) {
            continue;
          }
        }
      }

      filtered.push(dapaint);
    }

    return filtered;
  } catch (error: any) {
    logger.error("Error getting lucky DaPaints:", error);
    throw error;
  }
}

/**
 * Get team composition for a team DaPaint
 */
export async function getTeamComposition(dapaintId: string) {
  const { data: participants, error } = await supabase
    .from("dapaint_participants")
    .select(
      `
      *,
      user:users(display_name)
    `
    )
    .eq("dapaint_id", dapaintId);

  if (error) throw error;

  const hostTeam = participants?.filter((p) => p.team === "host") || [];
  const foeTeam = participants?.filter((p) => p.team === "foe") || [];

  return {
    hostTeam,
    foeTeam,
    isEven: hostTeam.length === foeTeam.length,
  };
}

/**
 * Switch teams in a team DaPaint
 */
export async function switchTeam(dapaintId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get current team
    const { data: participant, error: fetchError } = await supabase
      .from("dapaint_participants")
      .select("team")
      .eq("dapaint_id", dapaintId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!participant) throw new Error("You are not in this DaPaint");

    const newTeam = participant.team === "host" ? "foe" : "host";

    // Update team
    const { error: updateError } = await supabase
      .from("dapaint_participants")
      .update({ team: newTeam })
      .eq("dapaint_id", dapaintId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    logger.debug("Successfully switched teams");
  } catch (error: any) {
    logger.error("Error switching teams:", error);
    throw error;
  }
}

/**
 * Check if a DaPaint can still be edited (only if no one else joined)
 */
export async function canEditDaPaint(dapaintId: string): Promise<boolean> {
  try {
    const { data: dapaint } = await supabase
      .from("dapaints")
      .select("dapaint_type, foe_id")
      .eq("id", dapaintId)
      .single();

    if (!dapaint) return false;

    if (dapaint.dapaint_type === "1v1") {
      // Can edit if no one has joined as foe
      return !dapaint.foe_id;
    } else {
      // Can edit if only host is in participants
      const { data: participants } = await supabase
        .from("dapaint_participants")
        .select("id")
        .eq("dapaint_id", dapaintId);

      return (participants?.length || 0) <= 1;
    }
  } catch (error) {
    logger.error("Error checking if can edit:", error);
    return false;
  }
}

/**
 * Edit an existing DaPaint
 */
export async function editDaPaint(
  id: string,
  params: {
    dapaint: string;
    description: string | null;
    how_winner_is_determined: string;
    rules_of_dapaint: string | null;
    location: string;
    city: string;
    zipcode: string;
    starts_at: string;
    ticket_price: number;
    max_participants: number;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from("dapaints")
      .update({
        dapaint: params.dapaint,
        description: params.description,
        how_winner_is_determined: params.how_winner_is_determined,
        rules_of_dapaint: params.rules_of_dapaint,
        location: params.location,
        city: params.city,
        zipcode: params.zipcode.toUpperCase(),
        starts_at: params.starts_at,
        ticket_price: params.ticket_price.toString(),
        max_participants: params.max_participants,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    logger.debug("Successfully updated DaPaint");
  } catch (error: any) {
    logger.error("Error updating DaPaint:", error);
    throw error;
  }
}

/**
 * Update winstreaks after a DaPaint completes
 * Handles both regular completions (winner/loser) and draws (both lose 1)
 */
async function updateWinstreaks(
  winnerId: string | null,
  loserId: string | null,
  isDraw: boolean = false
): Promise<void> {
  try {
    if (isDraw && winnerId && loserId) {
      // Both users lose 1 winstreak in a draw
      await supabase
        .from("users")
        .update({
          current_winstreak: supabase.rpc("GREATEST(0, current_winstreak - 1)"),
        })
        .in("id", [winnerId, loserId]);
      
      logger.debug("Both users lost 1 winstreak in draw");
    } else if (winnerId && loserId) {
      // Regular completion - winner gains, loser resets
      // Get current winstreaks
      const { data: winnerData } = await supabase
        .from("users")
        .select("current_winstreak, longest_winstreak")
        .eq("id", winnerId)
        .single();

      // Update winner
      const newWinnerStreak = (winnerData?.current_winstreak || 0) + 1;
      const newWinnerLongest = Math.max(
        newWinnerStreak,
        winnerData?.longest_winstreak || 0
      );

      await supabase
        .from("users")
        .update({
          current_winstreak: newWinnerStreak,
          longest_winstreak: newWinnerLongest,
        })
        .eq("id", winnerId);

      // Update loser (reset winstreak)
      await supabase
        .from("users")
        .update({
          current_winstreak: 0,
        })
        .eq("id", loserId);
      
      logger.debug("Winstreaks updated for winner/loser");
    }

    logger.debug("Winstreaks updated successfully");
  } catch (error) {
    logger.error("Error updating winstreaks:", error);
    throw error;
  }
}

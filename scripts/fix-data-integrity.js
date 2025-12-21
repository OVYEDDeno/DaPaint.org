// scripts/fix-data-integrity.js
// Script to identify and fix data integrity violations in DaPaint database
// Run with: node scripts/fix-data-integrity.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for admin access
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function findMultipleActiveDaPaints() {
  log('\n🔍 Finding users with multiple active DaPaints...', 'blue');
  
  try {
    // Find users who are hosts in multiple active 1v1 DaPaints
    const { data: hostViolations, error: hostError } = await supabase
      .rpc('find_multiple_active_dapaints_hosts');
    
    if (hostError) {
      log(`⚠️  Could not check host violations: ${hostError.message}`, 'yellow');
    } else if (hostViolations && hostViolations.length > 0) {
      log(`\n🚨 Found ${hostViolations.length} users hosting multiple active 1v1 DaPaints:`, 'red');
      hostViolations.forEach(violation => {
        log(`   User ${violation.host_id}: ${violation.count} active DaPaints`, 'red');
      });
    } else {
      log('✅ No host violations found', 'green');
    }
    
    // Find users who are foes in multiple active 1v1 DaPaints
    const { data: foeViolations, error: foeError } = await supabase
      .rpc('find_multiple_active_dapaints_foes');
    
    if (foeError) {
      log(`⚠️  Could not check foe violations: ${foeError.message}`, 'yellow');
    } else if (foeViolations && foeViolations.length > 0) {
      log(`\n🚨 Found ${foeViolations.length} users as foes in multiple active 1v1 DaPaints:`, 'red');
      foeViolations.forEach(violation => {
        log(`   User ${violation.foe_id}: ${violation.count} active DaPaints`, 'red');
      });
    } else {
      log('✅ No foe violations found', 'green');
    }
    
    // Find users participating in multiple team DaPaints
    const { data: teamViolations, error: teamError } = await supabase
      .rpc('find_multiple_active_team_dapaints');
    
    if (teamError) {
      log(`⚠️  Could not check team violations: ${teamError.message}`, 'yellow');
    } else if (teamViolations && teamViolations.length > 0) {
      log(`\n🚨 Found ${teamViolations.length} users in multiple active team DaPaints:`, 'red');
      teamViolations.forEach(violation => {
        log(`   User ${violation.user_id}: ${violation.count} active team DaPaints`, 'red');
      });
    } else {
      log('✅ No team violations found', 'green');
    }
    
    return {
      hostViolations: hostViolations || [],
      foeViolations: foeViolations || [],
      teamViolations: teamViolations || []
    };
  } catch (error) {
    log(`\n💥 Error finding violations: ${error.message}`, 'red');
    return null;
  }
}

async function fixHostViolations(violations) {
  log('\n🔧 Fixing host violations...', 'blue');
  
  for (const violation of violations) {
    log(`\nProcessing user ${violation.host_id} with ${violation.count} active DaPaints...`, 'yellow');
    
    // Get all their active DaPaints ordered by creation date
    const { data: dapaints, error } = await supabase
      .from('dapaints')
      .select('*')
      .eq('host_id', violation.host_id)
      .in('status', ['scheduled', 'pending_balance', 'live'])
      .order('created_at', { ascending: false }); // Newest first
    
    if (error) {
      log(`❌ Error fetching DaPaints: ${error.message}`, 'red');
      continue;
    }
    
    if (dapaints && dapaints.length > 1) {
      // Keep the newest one, delete others if they have no foe, or apply 48-hour logic
      const keep = dapaints[0];
      const cancel = dapaints.slice(1);
      
      log(`   Keeping: ${keep.dapaint} (${keep.id})`, 'green');
      
      for (const dapaint of cancel) {
        const startsAt = new Date(dapaint.starts_at);
        const now = new Date();
        const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isWithin48Hours = hoursUntilStart <= 48;
        const hasFoe = !!dapaint.foe_id;
        
        log(`   Processing: ${dapaint.dapaint} (${dapaint.id})`, 'yellow');
        
        if (!hasFoe) {
          // Delete entirely if no foe
          const { error: deleteError } = await supabase
            .from('dapaints')
            .delete()
            .eq('id', dapaint.id);
          
          if (deleteError) {
            log(`   ❌ Failed to delete ${dapaint.id}: ${deleteError.message}`, 'red');
          } else {
            log(`   ✅ Deleted ${dapaint.id} (no foe)`, 'green');
          }
        } else {
          // For data integrity violations, mark as draw regardless of timing
          if (hasFoe) {
            // Remove the foe from the DaPaint
            const { error: removeFoeError } = await supabase
              .from('dapaints')
              .update({ 
                foe_id: null,
                foe_display_name: null
              })
              .eq('id', dapaint.id);
            
            if (removeFoeError) {
              log(`   ❌ Failed to remove foe from ${dapaint.id}: ${removeFoeError.message}`, 'red');
              continue;
            }
          }
          
          // Mark as completed with no winner/loser (draw)
          const { error: updateError } = await supabase
            .from('dapaints')
            .update({ 
              status: 'completed',
              submitted_winner_id: null,
              submitted_loser_id: null
            })
            .eq('id', dapaint.id);
          
          if (updateError) {
            log(`   ❌ Failed to mark as draw ${dapaint.id}: ${updateError.message}`, 'red');
          } else {
            log(`   ✅ Marked ${dapaint.id} as draw (data integrity fix)`, 'green');
            
            // Decrease winstreak by 1 for both participants
            try {
              // Decrease host winstreak
              await supabase
                .from('users')
                .update({ current_winstreak: supabase.rpc('GREATEST(0, current_winstreak - 1)') })
                .eq('id', dapaint.host_id);
              
              // Decrease foe winstreak if there was one
              if (dapaint.foe_id) {
                await supabase
                  .from('users')
                  .update({ current_winstreak: supabase.rpc('GREATEST(0, current_winstreak - 1)') })
                  .eq('id', dapaint.foe_id);
              }
              
              log(`   📈 Both participants winstreaks decreased by 1`, 'green');
            } catch (wsError) {
              log(`   ⚠️  Failed to update winstreaks: ${wsError.message}`, 'yellow');
            }
          }
        }
      }
    }
  }
}

async function fixFoeViolations(violations) {
  log('\n🔧 Fixing foe violations...', 'blue');
  
  for (const violation of violations) {
    log(`\nProcessing user ${violation.foe_id} in ${violation.count} active DaPaints...`, 'yellow');
    
    // Get all DaPaints where they are the foe, ordered by creation date
    const { data: dapaints, error } = await supabase
      .from('dapaints')
      .select('*')
      .eq('foe_id', violation.foe_id)
      .in('status', ['scheduled', 'pending_balance', 'live'])
      .order('created_at', { ascending: false }); // Newest first
    
    if (error) {
      log(`❌ Error fetching DaPaints: ${error.message}`, 'red');
      continue;
    }
    
    if (dapaints && dapaints.length > 1) {
      // Keep the newest one, apply 48-hour logic to others
      const keep = dapaints[0];
      const cancel = dapaints.slice(1);
      
      log(`   Keeping: ${keep.dapaint} (${keep.id})`, 'green');
      
      for (const dapaint of cancel) {
        const startsAt = new Date(dapaint.starts_at);
        const now = new Date();
        const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isWithin48Hours = hoursUntilStart <= 48;
        
        log(`   Processing: ${dapaint.dapaint} (${dapaint.id})`, 'yellow');
        
        // For data integrity violations, mark as draw regardless of timing
        // Remove the foe from the DaPaint
        const { error: removeFoeError } = await supabase
          .from('dapaints')
          .update({ 
            foe_id: null,
            foe_display_name: null
          })
          .eq('id', dapaint.id);
        
        if (removeFoeError) {
          log(`   ❌ Failed to remove foe from ${dapaint.id}: ${removeFoeError.message}`, 'red');
          continue;
        }
        
        // Mark as completed with no winner/loser (draw)
        const { error: updateError } = await supabase
          .from('dapaints')
          .update({ 
            status: 'completed',
            submitted_winner_id: null,
            submitted_loser_id: null
          })
          .eq('id', dapaint.id);
        
        if (updateError) {
          log(`   ❌ Failed to mark as draw ${dapaint.id}: ${updateError.message}`, 'red');
        } else {
          log(`   ✅ Marked ${dapaint.id} as draw (data integrity fix)`, 'green');
          
          // Decrease winstreak by 1 for both participants (host and former foe)
          try {
            // Decrease host winstreak
            await supabase
              .from('users')
              .update({ current_winstreak: supabase.rpc('GREATEST(0, current_winstreak - 1)') })
              .eq('id', dapaint.host_id);
            
            // Decrease former foe winstreak
            await supabase
              .from('users')
              .update({ current_winstreak: supabase.rpc('GREATEST(0, current_winstreak - 1)') })
              .eq('id', dapaint.foe_id);
            
            log(`   📈 Both participants winstreaks decreased by 1`, 'green');
          } catch (wsError) {
            log(`   ⚠️  Failed to update winstreaks: ${wsError.message}`, 'yellow');
          }
        }
      }
    }
  }
}

async function fixTeamViolations(violations) {
  log('\n🔧 Fixing team violations...', 'blue');
  
  for (const violation of violations) {
    log(`\nProcessing user ${violation.user_id} in ${violation.count} team DaPaints...`, 'yellow');
    
    // Get all their team participations ordered by creation date
    const { data: participations, error: partError } = await supabase
      .from('dapaint_participants')
      .select('*, dapaint:dapaints(status, created_at)')
      .eq('user_id', violation.user_id)
      .order('id', { ascending: false }); // Newest first
    
    if (partError) {
      log(`❌ Error fetching participations: ${partError.message}`, 'red');
      continue;
    }
    
    // Filter to only active DaPaints
    const activeParticipations = participations.filter(p => 
      p.dapaint && ['scheduled', 'pending_balance', 'live'].includes(p.dapaint.status)
    );
    
    if (activeParticipations && activeParticipations.length > 1) {
      // Keep the newest one, remove from others
      const keep = activeParticipations[0];
      const remove = activeParticipations.slice(1);
      
      log(`   Keeping participation in DaPaint ${keep.dapaint_id}`, 'green');
      
      for (const participation of remove) {
        log(`   Removing participation from DaPaint ${participation.dapaint_id}`, 'yellow');
        
        // Delete the participation
        const { error: deleteError } = await supabase
          .from('dapaint_participants')
          .delete()
          .eq('id', participation.id);
        
        if (deleteError) {
          log(`   ❌ Failed to remove participation ${participation.id}: ${deleteError.message}`, 'red');
        } else {
          log(`   ✅ Removed participation ${participation.id}`, 'green');
        }
      }
    }
  }
}

async function main() {
  log('🚀 Starting DaPaint Data Integrity Fix Script...', 'blue');
  
  // First run the automated cleanup function
  log('\n🧹 Running automated cleanup...', 'blue');
  try {
    await supabase.rpc('run_periodic_cleanup');
    log('✅ Automated cleanup completed', 'green');
  } catch (cleanupError) {
    log(`⚠️  Automated cleanup failed: ${cleanupError.message}`, 'yellow');
  }
  
  // Check for remaining violations
  const violations = await findMultipleActiveDaPaints();
  
  if (!violations) {
    log('\n❌ Could not check for violations. Exiting.', 'red');
    process.exit(1);
  }
  
  const totalViolations = 
    violations.hostViolations.length + 
    violations.foeViolations.length + 
    violations.teamViolations.length;
  
  if (totalViolations === 0) {
    log('\n🎉 No data integrity violations found! Database is clean.', 'green');
    process.exit(0);
  }
  
  log(`\n📊 Found ${totalViolations} total violations that need fixing.`, 'yellow');
  
  // Ask for confirmation before making changes
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question(`\n❓ Do you want to fix these violations? This will modify the database. (y/N): `, async (answer) => {
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log('\n👋 Exiting without making changes.', 'yellow');
      readline.close();
      process.exit(0);
    }
    
    log('\n🛠️  Starting fixes...', 'blue');
    
    // Fix each type of violation
    await fixHostViolations(violations.hostViolations);
    await fixFoeViolations(violations.foeViolations);
    await fixTeamViolations(violations.teamViolations);
    
    log('\n✅ All fixes completed!', 'green');
    readline.close();
  });
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { findMultipleActiveDaPaints };
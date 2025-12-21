# DaPaint Data Integrity Solution

This document describes the complete solution implemented to fix and prevent the data integrity issue where users were appearing in multiple active DaPaints simultaneously, violating the business rule that users can only be in one active DaPaint at a time.

## Problem Summary

The error `{"code": "PGRST116", "details": "Results contain 3 rows, application/vnd.pgrst.object+json requires 1 row", "message": "JSON object requested, multiple (or no) rows returned"}` indicated that a user was associated with 3 active DaPaints when the system expected at most 1.

## Solution Components

### 1. Application-Level Fixes

#### Enhanced Data Fetching
Modified `fetchActiveDaPaint()` in `lib/DaPaintDataManager.ts` to:
- Remove problematic `.limit(1)` and `.maybeSingle()` calls that caused the error
- Add data integrity violation logging when multiple active DaPaints are found
- Still return only the most recent active DaPaint to maintain functionality

#### Enhanced User Exclusivity Check
Updated `getActiveDaPaint()` in `lib/api/dapaints.ts` to:
- Add data integrity checks for all query paths
- Log warnings when violations are detected
- Return the most recent DaPaint when violations occur

#### Strengthened Join Validation
Enhanced `joinDaPaint()` in `lib/api/dapaints.ts` to:
- Add explicit check for existing active DaPaints before allowing joins
- Provide detailed error messages based on 48-hour logic
- Return appropriate actions based on user's current DaPaint status

#### Winstrack Management
Enhanced `updateWinstreaks()` in `lib/api/dapaints.ts` to:
- Handle both regular completions (winner/loser) and draws (both lose 1)
- Properly decrease winstreaks by 1 for both participants when no submissions are made within 24 hours

#### Automatic Cleanup
Added `checkAndHandleExpiredDaPaints()` in `lib/api/dapaints.ts` to:
- Automatically mark DaPaints as draws when no submissions are made within 24 hours
- Decrease both participants' winstreaks by 1

### 2. Database-Level Solutions

Created database functions in `database/functions.sql`:

#### Detection Functions
- `find_multiple_active_dapaints_hosts()`: Identifies users hosting multiple 1v1 DaPaints
- `find_multiple_active_dapaints_foes()`: Identifies users as foes in multiple 1v1 DaPaints
- `find_multiple_active_team_dapaints()`: Identifies users in multiple team DaPaints

#### Prevention Functions
- `enforce_user_exclusivity()`: Trigger function to prevent users from joining multiple DaPaints
- Enhanced `join_dapaint()`: RPC function with improved validation logic
- `cleanup_unmatched_dapaints()`: Function to automatically delete unmatched host DaPaints and handle 24-hour rule
- `run_periodic_cleanup()`: Cron job function to be called periodically

### 3. Data Cleanup Script

Enhanced `scripts/fix-data-integrity.js` to:
- Run automated cleanup functions first
- Identify all current data integrity violations
- Provide interactive fixing of violations with proper 48-hour logic
- Delete unmatched host DaPaints
- Apply forfeit logic when within 48 hours
- Log all actions taken for audit purposes

## How to Use

### Running the Cleanup Script
```bash
node scripts/fix-data-integrity.js
```

The script will:
1. Run automated cleanup functions
2. Scan for all data integrity violations
3. Display findings
4. Prompt for confirmation before making changes
5. Fix violations by applying proper 48-hour logic

### Applying Database Functions
Execute the SQL in `database/functions.sql` in your Supabase SQL editor to:
1. Create detection functions
2. Set up prevention triggers
3. Update the join RPC function
4. Set up automatic cleanup functions

### Setting up Periodic Cleanup
To ensure the 24-hour rule and unmatched DaPaint cleanup works automatically:

1. Go to your Supabase project dashboard
2. Navigate to "Database" → "SQL Editor"
3. Run this SQL to create a cron job:

```sql
-- Create a cron job that runs every hour
select
  cron.schedule(
    'dapaint-cleanup', -- name of the cron job
    '0 * * * *', -- every hour at minute 0
    $$ select run_periodic_cleanup(); $$ -- the function to call
  );
```

4. This will automatically handle:
   - Deletion of unmatched host DaPaints that reach start time
   - Marking DaPaints as draws when no submissions are made within 24 hours
   - Decreasing winstreaks for both participants in drawn DaPaints

## Prevention Strategy

1. **Application-Level**: The enhanced `joinDaPaint()` function prevents users from joining multiple DaPaints with proper messaging
2. **Database-Level**: Triggers and constraints prevent data integrity violations at the source
3. **Automatic Cleanup**: Periodic database functions handle time-based rules
4. **Monitoring**: Regular execution of the detection script can identify any new violations

## Future Maintenance

- Run the cleanup script periodically to ensure data integrity
- Set up cron jobs for periodic cleanup functions
- Monitor logs for data integrity violation warnings
- Review and update database functions as business rules evolve

This comprehensive solution addresses the immediate issue while preventing future occurrences through multiple layers of protection.
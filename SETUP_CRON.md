# Setting up Cron Jobs in Supabase

## Enabling pg_cron Extension

To enable the pg_cron extension in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to "Database" → "Extensions"
3. Find "pg_cron" in the list of extensions
4. Toggle it to enable it

If you don't see pg_cron in the list, you may need to contact Supabase support as it might not be available in your plan.

## Alternative: Manual Cleanup Execution

If you cannot enable pg_cron, you can manually run the cleanup function:

1. Go to your Supabase Dashboard
2. Navigate to "Database" → "SQL Editor"
3. Run this SQL command:
```sql
SELECT run_periodic_cleanup();
```

You can set up a reminder to run this periodically (daily or hourly depending on your needs).

## Setting up the Cron Job

Once pg_cron is enabled, you can set up the cron job by running this SQL in your Supabase SQL Editor:

```sql
-- Create a cron job that runs every hour
select
  cron.schedule(
    'dapaint-cleanup', -- name of the cron job
    '0 * * * *', -- every hour at minute 0
    $$ select run_periodic_cleanup(); $$ -- the function to call
  );
```

This will run the cleanup function every hour, which will:
- Automatically delete unmatched host DaPaints that reach their start time
- Mark DaPaints as draws when no submissions are made within 24 hours
- Decrease winstreaks for both participants in drawn DaPaints

## Verifying the Cron Job

To verify that your cron job is set up correctly, run:

```sql
SELECT * FROM cron.job;
```

This will show all scheduled cron jobs in your database.

## Removing the Cron Job

If you need to remove the cron job, run:

```sql
SELECT cron.unschedule('dapaint-cleanup');
```
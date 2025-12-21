# Script Usage Guide

## Test DaPaint Outcomes Script

This script tests the DaPaint outcome resolution and dispute handling functionality.

### Running the Test Script

```bash
node scripts/test-dapaint-outcomes.js
```

### What the Script Tests

1. **1v1 Normal Resolution** - Tests normal win/loss resolution for 1v1 DaPaints
2. **1v1 Dispute Creation** - Tests dispute creation when both players claim victory
3. **Team Normal Resolution** - Tests normal resolution for team DaPaints
4. **Timeout Scenario** - Tests the 24-hour timeout functionality

### Manual Testing

You can also manually test the functionality through the Supabase dashboard or by using the database functions directly:

1. **Process Result Submission**:
   ```sql
   SELECT process_result_submission(
     'your-dapaint-id'::uuid,
     'your-user-id'::uuid,
     true, -- claimed_won
     'https://example.com/proof.jpg' -- proof_url
   );
   ```

2. **Resolve Dispute**:
   ```sql
   SELECT resolve_dapaint_dispute(
     'your-dapaint-id'::uuid,
     'winner-user-id'::uuid
   );
   ```

3. **Run Cleanup**:
   ```sql
   SELECT cleanup_unmatched_dapaints();
   ```

## Data Integrity Fix Script

The existing `fix-data-integrity.js` script can be run with:

```bash
node scripts/fix-data-integrity.js
```

This script identifies and fixes data integrity violations in the DaPaint database.
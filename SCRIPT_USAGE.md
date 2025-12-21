# DaPaint Cleanup Script Usage

## Overview
The `scripts/fix-data-integrity.js` script is used to identify and fix data integrity violations in the DaPaint database. It ensures that users are only in one active DaPaint at a time and handles the 24-hour submission rule.

## Prerequisites
1. Node.js installed on your system
2. Properly configured `.env` file with Supabase credentials
3. Database functions from `database/functions.sql` already applied

## Running the Script

### Basic Usage
```bash
node scripts/fix-data-integrity.js
```

### What the Script Does
1. Runs automated cleanup functions to handle time-based rules
2. Scans for all data integrity violations:
   - Users hosting multiple 1v1 DaPaints
   - Users as foes in multiple 1v1 DaPaints
   - Users in multiple team DaPaints
3. Displays findings
4. Prompts for confirmation before making changes
5. Fixes violations by applying proper 48-hour logic

### Script Output
- **No violations found**: Script exits with success message
- **Violations found**: Script lists all violations and asks for confirmation to fix them

### Safety Features
- Interactive confirmation before making any database changes
- Detailed logging of all actions taken
- Graceful error handling
- No changes made without explicit user approval

## When to Run the Script
- After initial deployment to clean up any existing data integrity issues
- Periodically as a maintenance task
- When troubleshooting reported data issues
- After database migrations or schema changes

## Troubleshooting
If you encounter errors:
1. Check that your `.env` file contains the correct Supabase credentials
2. Verify that the database functions have been applied
3. Ensure you have network connectivity to your Supabase instance
4. Check the script output for specific error messages
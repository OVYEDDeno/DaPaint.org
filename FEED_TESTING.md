# Feed Functionality Testing

This project includes a dedicated test script for feed functionality.

## Running Feed Tests

To run the feed functionality tests:

```bash
npm run test:feed
```

This will test:

- ✅ Available DaPaints query (same winstreak, not hosted by user, not joined)
- ✅ Explore DaPaints query (same winstreak, different zipcode)
- ✅ Winstreak filtering logic
- ✅ Status filtering (only 'scheduled' DaPaints shown)
- ✅ Host filtering (not showing user's own DaPaints)

## Test Script Details

The test script `scripts/test-feed-functionality.js` performs the following:

1. **User Selection**: Finds an existing user in the database for testing
2. **Available DaPaints Test**: Queries DaPaints that match user's winstreak, aren't hosted by the user, and don't have a foe yet
3. **Explore DaPaints Test**: Queries DaPaints with same winstreak but different zipcodes
4. **Filtering Tests**: Verifies winstreak and status filtering works correctly
5. **Result Verification**: Ensures queries return expected data structures

## What Gets Tested

- **Available DaPaints**: DaPaints matching user's winstreak that they can join
- **Explore DaPaints**: DaPaints matching user's winstreak but in different locations
- **Winstreak Filtering**: Only DaPaints with exact same winstreak are shown
- **Status Filtering**: Only 'scheduled' DaPaints appear in feeds
- **Host Exclusion**: Users don't see their own DaPaints in feeds
- **Foe Exclusion**: DaPaints already with a foe don't appear in available feed

## Expected Results

The test will show the number of DaPaints found for each query. It's normal to see 0 results if there aren't matching DaPaints in the database. The important part is that the queries execute without errors and return proper data structures.

## Troubleshooting

If tests fail:

1. Verify your environment variables are correctly set
2. Check that your Supabase project is properly configured
3. Ensure you have the required database permissions
4. Make sure your database schema matches the expected structure
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJoinFunction() {
  try {
    console.log('Testing join_dapaint function...');
    
    // First, let's get a test user ID and DaPaint ID
    // This is just for testing - you'll need to replace with actual IDs
    const testUserId = '97b49bf7-0361-455f-bf73-e631d0e4cbae'; // Replace with actual user ID
    const testDaPaintId = 'bb60288b-c188-4c77-a4be-95f11279c222'; // Replace with actual DaPaint ID
    const testDisplayName = 'a';
    
    console.log('Calling join_dapaint RPC...');
    const { data, error } = await supabase.rpc('join_dapaint', {
      p_dapaint_id: testDaPaintId,
      p_user_id: testUserId,
      p_display_name: testDisplayName
    });
    
    if (error) {
      console.error('RPC Error:', error);
    } else {
      console.log('RPC Success:', data);
    }
    
    // Also test getting active DaPaint for a user
    console.log('\nTesting get_active_dapaint_for_user function...');
    const { data: activeData, error: activeError } = await supabase.rpc('get_active_dapaint_for_user', {
      p_user_id: testUserId
    });
    
    if (activeError) {
      console.error('Get Active DaPaint Error:', activeError);
    } else {
      console.log('Get Active DaPaint Success:', activeData);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testJoinFunction();
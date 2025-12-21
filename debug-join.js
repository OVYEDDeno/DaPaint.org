// Simple debug script to test join functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Using service role key to bypass RLS
);

async function debugJoin() {
  try {
    console.log('Debugging join functionality...');
    
    // Test direct database operations first
    console.log('\n1. Testing direct database update...');
    
    // Replace with actual test data
    const testUserId = '97b49bf7-0361-455f-bf73-e631d0e4cbae'; // Replace with actual user ID
    const testDaPaintId = 'bb60288b-c188-4c77-a4be-95f11279c222'; // Replace with actual DaPaint ID
    const testDisplayName = 'a';
    
    // Try direct update
    const { data: updateData, error: updateError } = await supabase
      .from('dapaints')
      .update({ 
        foe_id: testUserId,
        foe_display_name: testDisplayName
      })
      .eq('id', testDaPaintId);
    
    if (updateError) {
      console.error('Direct update error:', updateError);
    } else {
      console.log('Direct update success:', updateData);
    }
    
    // Check if the update actually happened
    console.log('\n2. Verifying update...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('dapaints')
      .select('foe_id, foe_display_name')
      .eq('id', testDaPaintId)
      .single();
    
    if (verifyError) {
      console.error('Verification error:', verifyError);
    } else {
      console.log('Verification result:', verifyData);
    }
    
    // Test the RPC function
    console.log('\n3. Testing RPC function...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('join_dapaint', {
      p_dapaint_id: testDaPaintId,
      p_user_id: testUserId,
      p_display_name: testDisplayName
    });
    
    if (rpcError) {
      console.error('RPC error:', rpcError);
    } else {
      console.log('RPC result:', rpcData);
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugJoin();
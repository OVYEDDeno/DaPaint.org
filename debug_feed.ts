// debug_feed.ts - Complete diagnostic script
// Run this to debug why DaPaints aren't showing

import { supabase } from './lib/supabase';

async function debugFeed() {
  console.log('='.repeat(60));
  console.log('🔍 DAPAINT FEED DEBUG REPORT');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ NOT LOGGED IN');
      console.error('   Error:', userError);
      return;
    }

    console.log('✅ LOGGED IN');
    console.log('   User ID:', user.id);
    console.log('');

    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ ERROR FETCHING USER PROFILE');
      console.error('   Error:', profileError);
      return;
    }

    console.log('👤 USER PROFILE:');
    console.log('   Display Name:', profile.display_name);
    console.log('   Username:', profile.username);
    console.log('   Winstreak:', profile.current_winstreak);
    console.log('   Lossstreak:', profile.current_lossstreak);
    console.log('   Zipcode:', profile.zipcode);
    console.log('');

    // 3. Check for active DaPaint
    console.log('🎯 CHECKING FOR ACTIVE DAPAINT...');
    
    const { data: hostedDaPaint } = await supabase
      .from('dapaints')
      .select('*')
      .eq('host_id', user.id)
      .in('status', ['scheduled', 'pending_balance', 'live'])
      .maybeSingle();

    const { data: foeDaPaint } = await supabase
      .from('dapaints')
      .select('*')
      .eq('foe_id', user.id)
      .in('status', ['scheduled', 'pending_balance', 'live'])
      .maybeSingle();

    const { data: teamParticipations } = await supabase
      .from('dapaint_participants')
      .select('dapaint_id')
      .eq('user_id', user.id);

    if (hostedDaPaint) {
      console.log('   ✅ You are HOSTING a DaPaint:', hostedDaPaint.id);
      console.log('      Title:', hostedDaPaint.dapaint);
      console.log('      Status:', hostedDaPaint.status);
    } else if (foeDaPaint) {
      console.log('   ✅ You are a FOE in a DaPaint:', foeDaPaint.id);
      console.log('      Title:', foeDaPaint.dapaint);
      console.log('      Status:', foeDaPaint.status);
    } else if (teamParticipations && teamParticipations.length > 0) {
      console.log('   ✅ You are in a TEAM DaPaint:', teamParticipations[0].dapaint_id);
    } else {
      console.log('   ℹ️  You have NO active DaPaint');
    }
    console.log('');

    // 4. Check ALL dapaints in database
    console.log('📊 ALL DAPAINTS IN DATABASE:');
    const { data: allDaPaints, error: allError } = await supabase
      .from('dapaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('   ❌ Error:', allError);
    } else if (!allDaPaints || allDaPaints.length === 0) {
      console.log('   ⚠️  NO DAPAINTS EXIST IN DATABASE');
      console.log('   → Create one first to test the feed!');
    } else {
      console.log(`   Total DaPaints: ${allDaPaints.length}`);
      console.log('');
      allDaPaints.forEach((dp, i) => {
        console.log(`   ${i + 1}. "${dp.dapaint}" (${dp.id})`);
        console.log(`      Status: ${dp.status}`);
        console.log(`      Type: ${dp.dapaint_type}`);
        console.log(`      Required Winstreak: ${dp.required_winstreak}`);
        console.log(`      Zipcode: ${dp.zipcode}`);
        console.log(`      Host ID: ${dp.host_id}`);
        console.log(`      Foe ID: ${dp.foe_id || 'none'}`);
        console.log('');
      });
    }

    // 5. Check scheduled DaPaints
    console.log('📋 SCHEDULED DAPAINTS:');
    const { data: scheduledDaPaints, error: scheduledError } = await supabase
      .from('dapaints')
      .select('*')
      .eq('status', 'scheduled');

    if (scheduledError) {
      console.error('   ❌ Error:', scheduledError);
    } else if (!scheduledDaPaints || scheduledDaPaints.length === 0) {
      console.log('   ⚠️  NO SCHEDULED DAPAINTS');
    } else {
      console.log(`   Total Scheduled: ${scheduledDaPaints.length}`);
    }
    console.log('');

    // 6. Check DaPaints matching user's criteria
    console.log('🎯 DAPAINTS MATCHING YOUR CRITERIA:');
    console.log(`   (status=scheduled, winstreak=${profile.current_winstreak}, zipcode=${profile.zipcode}, not host)`);
    
    const { data: matchingDaPaints, error: matchingError } = await supabase
      .from('dapaints')
      .select('*')
      .eq('status', 'scheduled')
      .eq('required_winstreak', profile.current_winstreak)
      .eq('zipcode', profile.zipcode)
      .neq('host_id', user.id);

    if (matchingError) {
      console.error('   ❌ Error:', matchingError);
    } else if (!matchingDaPaints || matchingDaPaints.length === 0) {
      console.log('   ⚠️  NO MATCHING DAPAINTS FOUND');
      console.log('');
      console.log('   Possible reasons:');
      console.log('   1. No DaPaints with winstreak', profile.current_winstreak);
      console.log('   2. No DaPaints in zipcode', profile.zipcode);
      console.log('   3. All DaPaints are hosted by you');
      console.log('   4. All DaPaints have status other than "scheduled"');
    } else {
      console.log(`   ✅ Found ${matchingDaPaints.length} matching DaPaint(s):`);
      matchingDaPaints.forEach((dp, i) => {
        console.log(`   ${i + 1}. "${dp.dapaint}" (${dp.id})`);
      });
    }
    console.log('');

    // 7. Check without zipcode filter (lucky mode)
    console.log('🎲 DAPAINTS IN LUCKY MODE:');
    console.log(`   (status=scheduled, winstreak=${profile.current_winstreak}, ANY zipcode, not host)`);
    
    const { data: luckyDaPaints, error: luckyError } = await supabase
      .from('dapaints')
      .select('*')
      .eq('status', 'scheduled')
      .eq('required_winstreak', profile.current_winstreak)
      .neq('host_id', user.id);

    if (luckyError) {
      console.error('   ❌ Error:', luckyError);
    } else if (!luckyDaPaints || luckyDaPaints.length === 0) {
      console.log('   ⚠️  NO LUCKY DAPAINTS FOUND');
    } else {
      console.log(`   ✅ Found ${luckyDaPaints.length} DaPaint(s) in lucky mode:`);
      luckyDaPaints.forEach((dp, i) => {
        console.log(`   ${i + 1}. "${dp.dapaint}" in zipcode ${dp.zipcode}`);
      });
    }
    console.log('');

    // 8. Summary
    console.log('='.repeat(60));
    console.log('📝 SUMMARY:');
    console.log('='.repeat(60));
    
    if (!allDaPaints || allDaPaints.length === 0) {
      console.log('❌ NO DAPAINTS IN DATABASE - Create one to test!');
    } else if (hostedDaPaint || foeDaPaint || (teamParticipations && teamParticipations.length > 0)) {
      console.log('✅ You have an active DaPaint - Feed should show ActiveFeed');
    } else if (matchingDaPaints && matchingDaPaints.length > 0) {
      console.log('✅ Feed should show', matchingDaPaints.length, 'DaPaint(s)');
    } else if (luckyDaPaints && luckyDaPaints.length > 0) {
      console.log('⚠️  No local matches, but', luckyDaPaints.length, 'available in lucky mode');
    } else {
      console.log('❌ NO DAPAINTS AVAILABLE - Try these:');
      console.log('   1. Create a DaPaint');
      console.log('   2. Check your winstreak matches existing DaPaints');
      console.log('   3. Try "I\'m Feeling Lucky" mode');
    }
    console.log('');

  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
  }
}

// Run the debug
debugFeed().then(() => {
  console.log('Debug complete!');
  process.exit(0);
}).catch((err) => {
  console.error('Debug failed:', err);
  process.exit(1);
});
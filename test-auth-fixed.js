// test-auth-fixed.js - Run with: node test-auth-fixed.js
// Tests authentication flow and database connectivity using the app's proper signup flow

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testProperAuthFlow() {
  log('\n🧪 Testing Proper Authentication Flow (using app signup method)...', 'blue');
  
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@test.com`;
  const testPassword = 'Test123456!';
  const testUsername = `testuser_${timestamp}`;
  const testName = 'Test User';
  
  try {
    // Test 1: Sign Up using the app's method
    log('\n1️⃣ Testing App Sign Up...', 'yellow');
    
    // First check if username is available
    const { data: usernameCheck, error: usernameError } = await supabase.rpc('check_username_available', {
      username_to_check: testUsername.toLowerCase(),
    });
    
    if (usernameError) {
      log(`❌ Username availability check failed: ${usernameError.message}`, 'red');
      return false;
    }
    
    if (!usernameCheck) {
      log(`❌ Username is not available`, 'red');
      return false;
    }
    
    log(`✅ Username is available`, 'green');
    
    // Now sign up using the same approach as the app
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError) {
      log(`❌ Sign Up Failed: ${signUpError.message}`, 'red');
      return false;
    }
    
    if (!signUpData.user) {
      log(`❌ Sign Up Failed: No user returned`, 'red');
      return false;
    }
    
    log(`✅ Auth Sign Up Successful: ${signUpData.user?.email}`, 'green');
    const userId = signUpData.user?.id;
    
    // Create user profile in database (this is what the app does)
    log('\n2️⃣ Creating User Profile in Database...', 'yellow');
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      username: testUsername.toLowerCase(),
      display_name: testName,
      email: testEmail,
      phone: null,
      city: null,
      zipcode: null,
      birthday: null,
      gender: null,
      how_did_you_hear: null,
      current_winstreak: 0,
      highest_winstreak: 0,
      current_lossstreak: 0,
      highest_lossstreak: 0,
      wins: 0,
      losses: 0,
      disqualifications: 0,
      dapaint_10x_unlocked: false,
      dapaint_ads_unlocked: false,
      times_10x_unlocked: 0,
    });
    
    if (profileError) {
      log(`❌ User Profile Creation Failed: ${profileError.message}`, 'red');
      return false;
    }
    
    log(`✅ User Profile Created Successfully`, 'green');
    
    // Test 2: Check User Created in Database
    log('\n3️⃣ Testing User Database Entry...', 'yellow');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      log(`❌ User Not Found in Database: ${userError.message}`, 'red');
      return false;
    }
    
    log(`✅ User Found in Database: ${userData.display_name}`, 'green');
    
    // Test 3: Sign Out
    log('\n4️⃣ Testing Sign Out...', 'yellow');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      log(`❌ Sign Out Failed: ${signOutError.message}`, 'red');
      return false;
    }
    
    log('✅ Sign Out Successful', 'green');
    
    // Test 4: Sign In
    log('\n5️⃣ Testing Sign In...', 'yellow');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      log(`❌ Sign In Failed: ${signInError.message}`, 'red');
      return false;
    }
    
    log(`✅ Sign In Successful: ${signInData.user?.email}`, 'green');
    
    // Test 5: Check Session
    log('\n6️⃣ Testing Session...', 'yellow');
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      log('❌ No Active Session', 'red');
      return false;
    }
    
    log('✅ Active Session Found', 'green');
    
    // Cleanup
    log('\n🧹 Cleaning Up Test User...', 'yellow');
    await supabase.auth.signOut();
    
    log('\n🎉 All Authentication Tests Passed!', 'green');
    return true;
    
  } catch (error) {
    log(`\n💥 Unexpected Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkDatabaseSetup() {
  log('\n🔍 Checking Database Setup...', 'blue');
  
  try {
    // Check users table
    log('\n1️⃣ Checking users table...', 'yellow');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      log(`❌ Users table error: ${usersError.message}`, 'red');
      log('   Hint: Check if users table exists and RLS is configured', 'yellow');
      return false;
    }
    
    log('✅ Users table accessible', 'green');
    
    // Check dapaints table
    log('\n2️⃣ Checking dapaints table...', 'yellow');
    const { data: dapaints, error: dapaintsError } = await supabase
      .from('dapaints')
      .select('*')
      .limit(1);
    
    if (dapaintsError) {
      log(`❌ DaPaints table error: ${dapaintsError.message}`, 'red');
      return false;
    }
    
    log('✅ DaPaints table accessible', 'green');
    
    // Check RPC function
    log('\n3️⃣ Checking join_dapaint RPC function...', 'yellow');
    const { error: rpcError } = await supabase.rpc('join_dapaint', {
      p_dapaint_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_display_name: 'test'
    });
    
    if (rpcError && !rpcError.message.includes('not found')) {
      log(`⚠️ RPC function may not exist: ${rpcError.message}`, 'yellow');
      log('   Run sample_data.sql to create it', 'yellow');
    } else {
      log('✅ RPC function exists', 'green');
    }
    
    log('\n🎉 Database Setup Looks Good!', 'green');
    return true;
    
  } catch (error) {
    log(`\n💥 Database Check Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('═══════════════════════════════════════', 'blue');
  log('   DAPAINT AUTOMATED TEST SUITE (FIXED)', 'blue');
  log('═══════════════════════════════════════', 'blue');
  
  const dbCheck = await checkDatabaseSetup();
  if (!dbCheck) {
    log('\n⚠️ Database setup incomplete. Fix these issues first.', 'red');
    process.exit(1);
  }
  
  const authTest = await testProperAuthFlow();
  if (!authTest) {
    log('\n⚠️ Authentication tests failed.', 'red');
    process.exit(1);
  }
  
  log('\n═══════════════════════════════════════', 'green');
  log('   ✅ ALL TESTS PASSED!', 'green');
  log('═══════════════════════════════════════', 'green');
}

runAllTests();
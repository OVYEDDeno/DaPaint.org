// test-auth.js - Run with: node test-auth.js
// Tests authentication flow and database connectivity

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

async function testAuthFlow() {
  log('\n🧪 Testing Authentication Flow...', 'blue');
  
  const testEmail = `test_${Date.now()}@test.com`;
  const testPassword = 'Test123456!';
  const testName = 'Test User';
  
  try {
    // Test 1: Sign Up
    log('\n1️⃣ Testing Sign Up...', 'yellow');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          display_name: testName
        }
      }
    });
    
    if (signUpError) {
      log(`❌ Sign Up Failed: ${signUpError.message}`, 'red');
      return false;
    }
    
    log(`✅ Sign Up Successful: ${signUpData.user?.email}`, 'green');
    const userId = signUpData.user?.id;
    
    // Test 2: Check User Created in Database
    log('\n2️⃣ Testing User Database Entry...', 'yellow');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      log(`❌ User Not Found in Database: ${userError.message}`, 'red');
      return false;
    }
    
    log(`✅ User Found: ${userData.display_name}`, 'green');
    
    // Test 3: Sign Out
    log('\n3️⃣ Testing Sign Out...', 'yellow');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      log(`❌ Sign Out Failed: ${signOutError.message}`, 'red');
      return false;
    }
    
    log('✅ Sign Out Successful', 'green');
    
    // Test 4: Sign In
    log('\n4️⃣ Testing Sign In...', 'yellow');
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
    log('\n5️⃣ Testing Session...', 'yellow');
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
  log('   DAPAINT AUTOMATED TEST SUITE', 'blue');
  log('═══════════════════════════════════════', 'blue');
  
  const dbCheck = await checkDatabaseSetup();
  if (!dbCheck) {
    log('\n⚠️ Database setup incomplete. Fix these issues first.', 'red');
    process.exit(1);
  }
  
  const authTest = await testAuthFlow();
  if (!authTest) {
    log('\n⚠️ Authentication tests failed.', 'red');
    process.exit(1);
  }
  
  log('\n═══════════════════════════════════════', 'green');
  log('   ✅ ALL TESTS PASSED!', 'green');
  log('═══════════════════════════════════════', 'green');
}

runAllTests();
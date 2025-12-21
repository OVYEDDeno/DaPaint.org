// simple-auth-test.js - Run with: node simple-auth-test.js
// Simple authentication test without RPC functions

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

async function testSimpleAuthFlow() {
  log('\n🧪 Testing Simple Authentication Flow...', 'blue');
  
  const timestamp = Date.now();
  const testEmail = `simple_test_${timestamp}@test.com`;
  const testPassword = 'Test123456!';
  const testUsername = `simpleuser_${timestamp}`;
  const testName = 'Simple Test User';
  
  try {
    // Test 1: Sign Up
    log('\n1️⃣ Testing Sign Up...', 'yellow');
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
    
    // Create user profile in database directly
    log('\n2️⃣ Creating User Profile in Database...', 'yellow');
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      username: testUsername.toLowerCase(),
      display_name: testName,
      email: testEmail,
    });
    
    if (profileError) {
      log(`❌ User Profile Creation Failed: ${profileError.message}`, 'red');
      // Try to continue anyway
    } else {
      log(`✅ User Profile Created Successfully`, 'green');
    }
    
    // Test 2: Sign Out
    log('\n3️⃣ Testing Sign Out...', 'yellow');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      log(`❌ Sign Out Failed: ${signOutError.message}`, 'red');
      return false;
    }
    
    log('✅ Sign Out Successful', 'green');
    
    // Test 3: Sign In
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
    
    // Test 4: Check Session
    log('\n5️⃣ Testing Session...', 'yellow');
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      log('❌ No Active Session', 'red');
      return false;
    }
    
    log('✅ Active Session Found', 'green');
    
    // Test 5: Check User in Database
    log('\n6️⃣ Checking User in Database...', 'yellow');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      log(`⚠️ User Not Found in Database: ${userError.message}`, 'yellow');
    } else {
      log(`✅ User Found in Database: ${userData.display_name}`, 'green');
    }
    
    // Cleanup
    log('\n🧹 Cleaning Up Test User...', 'yellow');
    await supabase.auth.signOut();
    
    log('\n🎉 Authentication Flow Test Completed!', 'green');
    return true;
    
  } catch (error) {
    log(`\n💥 Unexpected Error: ${error.message}`, 'red');
    return false;
  }
}

async function runTest() {
  log('═══════════════════════════════════════', 'blue');
  log('   SIMPLE DAPAINT AUTH TEST', 'blue');
  log('═══════════════════════════════════════', 'blue');
  
  const authTest = await testSimpleAuthFlow();
  if (!authTest) {
    log('\n⚠️ Authentication test failed.', 'red');
    process.exit(1);
  }
  
  log('\n═══════════════════════════════════════', 'green');
  log('   ✅ AUTH TEST COMPLETED!', 'green');
  log('═══════════════════════════════════════', 'green');
}

runTest();
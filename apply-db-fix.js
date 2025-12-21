const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyDbFunctions() {
  try {
    // Read the SQL file
    const fs = require('fs');
    const sql = fs.readFileSync('./database/functions.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
    
    console.log(`Found ${statements.length} statements to execute`);
    
    // Execute each statement individually using the Supabase SQL interface
    // We'll need to execute this manually in the Supabase dashboard
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      if (statement.length > 10) { // Skip very short statements
        console.log(`\n--- Statement ${i + 1}/${statements.length} ---`);
        console.log(statement);
        console.log('------------------------\n');
      }
    }
    
    console.log('\nPlease copy each statement above and execute them in your Supabase SQL Editor.');
    console.log('Go to your Supabase project dashboard -> SQL Editor -> Run each statement individually.');
  } catch (error) {
    console.error('Error reading database functions:', error);
  }
}

applyDbFunctions();
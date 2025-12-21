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
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      if (statement.length > 10) { // Skip very short statements
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          // For function creation, we need to use raw SQL
          const { data, error } = await supabase.rpc('execute_sql', { sql: statement });
          if (error) {
            console.error(`Error executing statement ${i + 1}:`, error);
          } else {
            console.log(`Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`Exception executing statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('All database functions applied successfully!');
  } catch (error) {
    console.error('Error applying database functions:', error);
  }
}

applyDbFunctions();
import pg from 'pg';

// You need to get the connection string from Supabase Dashboard
// Go to Project Settings > Database > Connection string (Direct connection)
// For now, let's just output what needs to be run

console.log('Please run the following SQL in your Supabase SQL Editor:');
console.log('(Dashboard > SQL Editor > New Query)');
console.log('\n---SQL START---\n');
console.log('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;');
console.log('\n---SQL END---\n');
console.log('\nOr use this command if you have Supabase CLI installed:');
console.log('supabase db execute --file add-description.sql');

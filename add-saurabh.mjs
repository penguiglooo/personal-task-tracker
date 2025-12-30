import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSaurabh() {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', 'saurabh@foan.ai')
      .single();

    if (existingUser) {
      console.log('User saurabh@foan.ai already exists');
      return;
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash('qwerty123', 10);

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: 'saurabh@foan.ai',
        name: 'Saurabh',
        password: hashedPassword,
        role: 'viewer',
        must_change_password: true,
      })
      .select();

    if (error) {
      console.error('Error adding user:', error);
      process.exit(1);
    }

    console.log('✅ Successfully added user: saurabh@foan.ai');
    console.log('   Name: Saurabh');
    console.log('   Role: viewer (can only see own tasks)');
    console.log('   Default password: qwerty123');
    console.log('   Must change password on first login: Yes');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSaurabh();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/disparo-node/saas-admin-dashboard/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching contacts...');
  const { data: contacts, error: cErr } = await supabase.from('contacts').select('*');
  console.log('Contacts count:', contacts?.length || 0);
  if (cErr) console.error(cErr);

  console.log('Fetching messages...');
  const { data: messages, error: mErr } = await supabase.from('messages').select('*').limit(5);
  console.log('Messages count:', messages?.length || 0);
  if (mErr) console.error(mErr);
  
  if (contacts?.length > 0) {
    console.log('Sample contact:', contacts[0]);
  }
}

run();

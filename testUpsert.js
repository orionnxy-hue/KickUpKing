import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jarrgsiswvgpmpkxerqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BWSrYGhg9yKyegSKimcWug_MavRNLfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    const { data, error } = await supabase.from('profiles').upsert([{
        user_id: 'Orion#123',
        username: 'Orion',
        pin: '1234',
        high_score: 10,
        tokens: 10,
        inventory: [],
        friends: {}
    }], { onConflict: 'user_id' });

    if (error) {
        console.error("UPSERT ERROR:", error);
    } else {
        console.log("SUCCESS");
    }
}
test();

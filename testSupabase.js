import fetch from 'node-fetch';

const SUPABASE_URL = 'https://jarrgsiswvgpmpkxerqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BWSrYGhg9yKyegSKimcWug_MavRNLfA';

async function testSupabase() {
    console.log("Testing Supabase Insert...");
    const url = `${SUPABASE_URL}/rest/v1/profiles`;

    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const payload = {
        user_id: 'TestPlayer#0001',
        username: 'TestPlayer',
        pin: '1234',
        high_score: 100,
        tokens: 50,
        inventory: ['player_default'],
        friends: {}
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ SUCCESS! Data written to profiles table:");
            console.log(data);
        } else {
            console.error("❌ FAILED!");
            console.error(data);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

testSupabase();

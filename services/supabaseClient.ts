import { createClient } from '@supabase/supabase-js';

// --- NEW DATABASE CONFIGURATION ---
const supabaseUrl = 'https://uvorqtmcvoganyuudeat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2b3JxdG1jdm9nYW55dXVkZWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzE1ODUsImV4cCI6MjA4MjYwNzU4NX0.zssKIUwroMBDKZinoAHamH17qkzYKNH2k-z99viQASk';

export const supabase = createClient(supabaseUrl, supabaseKey);
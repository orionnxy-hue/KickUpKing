import { createClient } from '@supabase/supabase-js';

// These are your keys to talk to the "Cloud Whiteboard"
const supabaseUrl = 'https://vjyotivssodzctofmopb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeW90aXZzc29kemN0b2Ztb3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjE0NDAsImV4cCI6MjA4MjU5NzQ0MH0.ZDEAD2DLfWirzx0XMEUjHJWeo05SlfvOgub4gMbwhfI';

export const supabase = createClient(supabaseUrl, supabaseKey);
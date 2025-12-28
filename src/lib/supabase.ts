import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://izyxtguioeraikefrkdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eXh0Z3Vpb2VyYWlrZWZya2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDM0NDMsImV4cCI6MjA4MjQxOTQ0M30.VlBx7oJLnsAkgWEzhqmeOT1SeJ03YQfDeOC4TPxAeS4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


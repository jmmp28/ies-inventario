import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lhwfuwmbdtsaoudsocwj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2Z1d21iZHRzYW91ZHNvY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjk1NzgsImV4cCI6MjA5NjcwNTU3OH0.rInxGwebKbmw_yc69Z-32RqMe6l3QPl8KAGdvCg3W2k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

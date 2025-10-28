import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or ANON KEY is not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

export default supabase

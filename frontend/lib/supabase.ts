// frontend/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szokzragvslbodgobxzt.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_ZjlX3Bnhvav5n8lUUhSN_A_m_Wttn6g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwtbfxxyofnqtxgisueu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dEEPV-7RYv1IZF30TtUjMw_zMlI5AUl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

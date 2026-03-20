import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hwtbfxxyofnqtxgisueu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dGJmeHh5b2ZucXR4Z2lzdWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjI1ODIsImV4cCI6MjA4NTAzODU4Mn0.H3btTi__zREls47FNGd0iVF7vV1oXLI21qTkIRw5mA4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

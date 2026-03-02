import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Lazy proxy for backward compat with `import { supabase } from ...`
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export type Session = {
  id: string;
  slug: string;
  topic: string;
  session_type: 'decide' | 'resolve' | 'plan' | 'debate';
  creator_name: string;
  partner_name: string | null;
  status: 'waiting' | 'active' | 'both_locked' | 'analyzing' | 'complete';
  created_at: string;
  updated_at: string;
};

export type Input = {
  id: string;
  session_id: string;
  role: 'creator' | 'partner';
  content: string;
  locked_at: string;
  created_at: string;
};

export type Analysis = {
  id: string;
  session_id: string;
  content: {
    headline: string;
    common_ground: string;
    divergence: string;
    recommendation: string;
    reasoning: string;
    what_each_gives_up: string;
  };
  raw_text: string;
  created_at: string;
};

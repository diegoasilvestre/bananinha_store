import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get(_, prop) {
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: async () => {}
          };
        }
        return () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('Supabase not initialized') }),
              order: () => ({
                then: (cb: any) => cb({ data: [], error: new Error('Supabase not initialized') })
              }),
              then: (cb: any) => cb({ data: [], error: new Error('Supabase not initialized') })
            }),
            order: () => ({
              then: (cb: any) => cb({ data: [], error: new Error('Supabase not initialized') })
            }),
            then: (cb: any) => cb({ data: [], error: new Error('Supabase not initialized') })
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('Supabase not initialized') })
            })
          }),
          update: () => ({
            eq: async () => ({ data: null, error: new Error('Supabase not initialized') })
          })
        });
      }
    }) as unknown as SupabaseClient;

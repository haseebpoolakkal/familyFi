'use client';

import { createBrowserClient } from '@supabase/ssr';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
    );
}

/**
 * Creates a Supabase client for use in Client Components.
 * This client automatically handles cookie-based authentication.
 * 
 * @returns A configured Supabase browser client
 * 
 * @example
 * ```tsx
 * 'use client';
 * 
 * import { createClient } from '@/lib/supabase/client';
 * 
 * export default function MyComponent() {
 *   const supabase = createClient();
 *   // Use supabase client...
 * }
 * ```
 */
export function createClient() {
    return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}


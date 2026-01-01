import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
    );
}

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * This client properly handles cookie-based authentication with full cookie management.
 * 
 * @returns A configured Supabase server client
 * 
 * @example
 * ```tsx
 * import { createClient } from '@/lib/supabase/server';
 * 
 * export default async function ServerComponent() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('table').select();
 *   // Use data...
 * }
 * ```
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl!, supabaseAnonKey!, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing user sessions.
                }
            },
        },
    });
}


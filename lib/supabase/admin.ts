import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Use only in trusted server code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_RECONCILE_SUPABASE_URL!,
    process.env.RECONCILE_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

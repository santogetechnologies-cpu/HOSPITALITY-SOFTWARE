import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://znxeifvdrjkgqyrrnaxu.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rEkA1iNEbIjSaixi7n8eIg_BUcZLMFV";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Checks if the current Supabase session is expired or expiring soon, and refreshes it if needed.
 * If the session is invalid or cannot be refreshed, cleans up stale tokens to prevent PostgREST 401 JWT Expired errors.
 */
export async function ensureFreshSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      if (
        error.message?.toLowerCase().includes("jwt") ||
        error.message?.toLowerCase().includes("refresh") ||
        error.message?.toLowerCase().includes("expired")
      ) {
        console.warn("Stale or expired session encountered. Clearing local session:", error.message);
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
      return false;
    }

    if (!session) {
      return false;
    }

    // If session expires within 2 minutes (120 seconds), refresh it proactively
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (expiresAt && Date.now() >= expiresAt - 120000) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) {
        console.warn("Auto session refresh failed, clearing stale auth token:", refreshErr.message);
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn("ensureFreshSession error:", err);
    return false;
  }
}

/**
 * Helper to check if an error is a JWT expiration or invalid auth error
 */
export function isJwtExpiredError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.error_description || err.msg || "").toLowerCase();
  const code = (err.code || "").toString();
  return (
    msg.includes("jwt expired") ||
    msg.includes("token is expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("jwt") ||
    code === "PGRST301" ||
    err.status === 401
  );
}

/**
 * Runs a database operation. If a JWT expired error is encountered,
 * it attempts to refresh the session (or clear stale tokens) and retries the operation once.
 */
export async function withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    await ensureFreshSession();
    const result: any = await operation();
    if (result && result.error && isJwtExpiredError(result.error)) {
      console.warn("JWT expired error detected in query result. Attempting token refresh and retry...");
      const { data, error: refErr } = await supabase.auth.refreshSession();
      if (refErr || !data?.session) {
        console.warn("Could not refresh token. Resetting local auth state to allow anon access:", refErr);
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
      return await operation();
    }
    return result;
  } catch (err: any) {
    if (isJwtExpiredError(err)) {
      console.warn("JWT expired exception caught. Attempting token refresh and retry...");
      const { data, error: refErr } = await supabase.auth.refreshSession();
      if (refErr || !data?.session) {
        console.warn("Could not refresh token. Resetting local auth state to allow anon access:", refErr);
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
      return await operation();
    }
    throw err;
  }
}

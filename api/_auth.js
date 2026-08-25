// Shared auth gate for the image-proxy functions (/api/logo, /api/favicon).
// The client appends its Supabase access token as ?t= because <img> tags
// cannot send an Authorization header.
// ponytail: token rides in the URL (browser history / request logs); safe
// while Supabase access tokens stay short-lived (~1h). If that changes,
// switch to client-side blob fetching with a real header.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default async function authorized(req) {
  if (!SUPABASE_URL || !ANON_KEY) return false; // misconfigured — deny
  const token = req.query.t;
  if (typeof token !== "string" || token.length === 0 || token.length > 4096) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

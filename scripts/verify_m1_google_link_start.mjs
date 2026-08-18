import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
if (authError || !authData.user) throw authError || new Error("Anonymous session was not created.");

const { data: linkData, error: linkError } = await supabase.auth.linkIdentity({
  provider: "google",
  options: {
    redirectTo: "http://127.0.0.1:3100",
    skipBrowserRedirect: true,
  },
});
if (linkError) throw linkError;
if (!linkData.url) throw new Error("Google identity linking did not return an authorization URL.");

const authorizationUrl = new URL(linkData.url);
console.log(JSON.stringify({
  projectRef: actualProjectRef,
  testUserId: authData.user.id,
  authorizationHost: authorizationUrl.hostname,
  provider: authorizationUrl.searchParams.get("provider"),
  redirectConfigured: authorizationUrl.searchParams.has("redirect_to"),
}, null, 2));

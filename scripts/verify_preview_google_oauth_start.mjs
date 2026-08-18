if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.preview.local");

const projectRef = "sufvuqdnqohpfzkwxohq";
const expectedClientId = "908587971636-uje37rninm0ta5942860uuim01qgeg84.apps.googleusercontent.com";
const expectedCallback = `https://${projectRef}.supabase.co/auth/v1/callback`;
const appCallback = "https://tribe-neon-mobile-preview.vercel.app/auth/callback?invite=OAUTH-VERIFY";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!anonKey) throw new Error("Preview anon key is required.");

const base = `https://${projectRef}.supabase.co/auth/v1`;
const headers = { apikey: anonKey };
const settingsResponse = await fetch(`${base}/settings`, { headers });
if (!settingsResponse.ok) throw new Error(`Auth settings failed: ${settingsResponse.status}`);
const settings = await settingsResponse.json();
if (!settings.external?.google) throw new Error("Google is not enabled in public Auth settings.");

const authorize = new URL(`${base}/authorize`);
authorize.searchParams.set("provider", "google");
authorize.searchParams.set("redirect_to", appCallback);
const authorizeResponse = await fetch(authorize, { headers, redirect: "manual" });
const location = authorizeResponse.headers.get("location");
if (!location || authorizeResponse.status < 300 || authorizeResponse.status >= 400) {
  throw new Error(`Google authorize did not redirect: ${authorizeResponse.status}`);
}

const googleUrl = new URL(location);
if (!/(^|\.)google\.com$/.test(googleUrl.hostname)) throw new Error("Authorize target is not Google.");
if (googleUrl.searchParams.get("client_id") !== expectedClientId) throw new Error("Unexpected Google client ID.");
if (googleUrl.searchParams.get("redirect_uri") !== expectedCallback) throw new Error("Unexpected Google callback URI.");

console.log(JSON.stringify({
  googlePubliclyEnabled: true,
  authorizeRedirectsToGoogle: true,
  clientIdMatches: true,
  supabaseCallbackMatches: true,
  appReturnUrlAccepted: appCallback,
}));

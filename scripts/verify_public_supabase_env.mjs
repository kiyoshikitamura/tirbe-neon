const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ref = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/)?.[1] || null;

console.log(JSON.stringify({
  appEnvironment: process.env.NEXT_PUBLIC_APP_ENV || null,
  projectRef: ref,
  anonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
}));

if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.preview.local");

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required.");

const projects = {
  development: "vosbyukxmskvisbgleug",
  preview: "sufvuqdnqohpfzkwxohq",
};
const headers = { Authorization: `Bearer ${token}` };
const output = {};
const fixedPreviewUrl = "https://tribe-neon-mobile-preview.vercel.app";
const productionUrl = "https://tirbe-neon.vercel.app";

for (const [environment, ref] of Object.entries(projects)) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { headers });
  if (!response.ok) throw new Error(`${environment}: ${response.status} ${await response.text()}`);
  const auth = await response.json();
  const secret = String(auth.external_google_secret || "");
  const allowedRedirects = String(auth.uri_allow_list || "").split(",").map((value) => value.trim());
  output[environment] = {
    projectRef: ref,
    enabled: Boolean(auth.external_google_enabled),
    clientId: auth.external_google_client_id || null,
    secretAvailableToManagementApi: Boolean(secret) && !/^\*+$/.test(secret),
    siteUrl: auth.site_url || null,
    callbackUrl: `https://${ref}.supabase.co/auth/v1/callback`,
    fixedPreviewRedirectAllowed: allowedRedirects.includes(`${fixedPreviewUrl}/**`),
    productionRedirectAllowed: allowedRedirects.includes(`${productionUrl}/**`),
  };
}

console.log(JSON.stringify(output, null, 2));

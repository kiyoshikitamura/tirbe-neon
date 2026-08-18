if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.preview.local");

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required.");

const projects = {
  development: "vosbyukxmskvisbgleug",
  preview: "sufvuqdnqohpfzkwxohq",
};
const headers = { Authorization: `Bearer ${token}` };
const output = {};

for (const [environment, ref] of Object.entries(projects)) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { headers });
  if (!response.ok) throw new Error(`${environment}: ${response.status} ${await response.text()}`);
  const auth = await response.json();
  const secret = String(auth.external_google_secret || "");
  output[environment] = {
    projectRef: ref,
    enabled: Boolean(auth.external_google_enabled),
    clientId: auth.external_google_client_id || null,
    secretAvailableToManagementApi: Boolean(secret) && !/^\*+$/.test(secret),
    siteUrl: auth.site_url || null,
    callbackUrl: `https://${ref}.supabase.co/auth/v1/callback`,
  };
}

console.log(JSON.stringify(output, null, 2));

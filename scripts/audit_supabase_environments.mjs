const envFile = process.argv[2] || ".env.preview.local";
if (typeof process.loadEnvFile === "function") process.loadEnvFile(envFile);
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required.");

const refs = {
  production: "ktpolnkyyfkowxdmijww",
  preview: "sufvuqdnqohpfzkwxohq",
  development: "vosbyukxmskvisbgleug",
  legacyDevelopment: "hggzvgdrgrboxmeywebw",
};
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function get(path) {
  const response = await fetch(`https://api.supabase.com/v1${path}`, { headers });
  if (!response.ok) return { unavailable: `${response.status} ${response.statusText}` };
  return response.json();
}

async function query(ref, sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers, body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) return { unavailable: `${response.status} ${response.statusText}`, detail: (await response.text()).slice(0, 500) };
  return response.json();
}

const projects = await get("/projects");
const output = {};
for (const [environment, ref] of Object.entries(refs)) {
  const project = Array.isArray(projects) ? projects.find((item) => item.ref === ref) : null;
  const auth = await get(`/projects/${ref}/config/auth`);
  const functions = await get(`/projects/${ref}/functions`);
  const secrets = await get(`/projects/${ref}/secrets`);
  const db = await query(ref, `
    with schema_objects as (
      select 'column:'||table_name||':'||ordinal_position||':'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') value
        from information_schema.columns where table_schema='public'
      union all select 'index:'||indexname||':'||indexdef from pg_indexes where schemaname='public'
      union all select 'policy:'||tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') from pg_policies where schemaname='public'
      union all select 'function:'||p.oid::regprocedure::text||':'||pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      union all select 'constraint:'||c.conrelid::regclass::text||':'||c.conname||':'||pg_get_constraintdef(c.oid) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'
    )
    select jsonb_build_object(
      'migrationTableExists',to_regclass('supabase_migrations.schema_migrations') is not null,
      'schemaFingerprint',(select md5(string_agg(value,E'\\n' order by value)) from schema_objects),
      'authUserCount',(select count(*) from auth.users),
      'realtimeTables',(select coalesce(jsonb_agg(schemaname||'.'||tablename order by schemaname,tablename),'[]'::jsonb) from pg_publication_tables where pubname='supabase_realtime'),
      'storageBuckets',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public) order by id),'[]'::jsonb) from storage.buckets),
      'cronInstalled',exists(select 1 from pg_extension where extname='pg_cron'),
      'netInstalled',exists(select 1 from pg_extension where extname='pg_net')
    ) result;
  `);
  const migration = db?.[0]?.result?.migrationTableExists
    ? await query(ref, "select max(version) migration_max,count(*) migration_count from supabase_migrations.schema_migrations")
    : [];
  output[environment] = {
    project: project ? { name: project.name, ref: project.ref, region: project.region, status: project.status } : { ref },
    auth: auth.unavailable ? auth : {
      siteUrl: auth.site_url,
      uriAllowList: auth.uri_allow_list,
      anonymousEnabled: auth.external_anonymous_users_enabled,
      manualLinkingEnabled: auth.security_manual_linking_enabled,
      emailEnabled: auth.external_email_enabled,
      emailAutoconfirm: auth.mailer_autoconfirm,
      googleEnabled: auth.external_google_enabled,
      googleClientConfigured: Boolean(auth.external_google_client_id),
    },
    edgeFunctions: Array.isArray(functions) ? functions.map(({ name, slug, status, verify_jwt }) => ({ name, slug, status, verifyJwt: verify_jwt })) : functions,
    edgeSecretNames: Array.isArray(secrets) ? secrets.map(({ name }) => name).sort() : secrets,
    database: Array.isArray(db) ? { ...db[0]?.result, migration: migration[0] || null } : db,
  };
}
console.log(JSON.stringify(output, null, 2));

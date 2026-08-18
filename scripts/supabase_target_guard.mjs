import { readFile } from "node:fs/promises";

const VALID_ENVIRONMENTS = new Set(["development", "preview", "production"]);
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

function parseArgs(argv) {
  let environment = "";
  let mutation = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--environment") environment = argv[index + 1] || "";
    if (argv[index] === "--mutation") mutation = true;
  }
  return { environment: environment.toLowerCase(), mutation };
}

async function readTrimmed(path) {
  return (await readFile(path, "utf8")).trim();
}

export async function verifySupabaseTarget({ environment, mutation = false }) {
  if (!VALID_ENVIRONMENTS.has(environment)) {
    throw new Error("--environment must be development, preview, or production.");
  }

  const configuredTargets = JSON.parse(await readTrimmed("config/supabase-targets.json"));
  const configuredRef = configuredTargets[environment];
  const previewRef = process.env.SUPABASE_PREVIEW_PROJECT_REF?.trim();
  const explicitRef = process.env.SUPABASE_EXPECTED_PROJECT_REF?.trim();
  const linkedRef = await readTrimmed("supabase/.temp/project-ref");

  if (!configuredRef || !PROJECT_REF_PATTERN.test(configuredRef)) {
    throw new Error(`${environment} project ref is not configured in config/supabase-targets.json.`);
  }
  if (!explicitRef || !PROJECT_REF_PATTERN.test(explicitRef)) {
    throw new Error("SUPABASE_EXPECTED_PROJECT_REF must be explicitly set for every guarded DB operation.");
  }
  if (new Set(Object.values(configuredTargets)).size !== Object.values(configuredTargets).length) {
    throw new Error("Development, Preview, and Production project refs must all be different.");
  }
  if (environment === "preview" && previewRef !== configuredRef) {
    throw new Error(`Preview ref mismatch: configured=${configuredRef}, environment=${previewRef || "missing"}.`);
  }
  if (explicitRef !== configuredRef) {
    throw new Error(`Explicit target mismatch: environment=${environment}, expected=${configuredRef}, explicit=${explicitRef}.`);
  }
  if (linkedRef !== configuredRef) {
    throw new Error(`Linked target mismatch: environment=${environment}, expected=${configuredRef}, linked=${linkedRef}.`);
  }
  if (mutation && environment === "production") {
    const required = `TRIBE_NEON_PRODUCTION_${configuredRef}`;
    if (process.env.SUPABASE_PRODUCTION_CHANGE_CONFIRMATION !== required) {
      throw new Error(`Production mutation requires SUPABASE_PRODUCTION_CHANGE_CONFIRMATION=${required}.`);
    }
  }

  return { environment, projectRef: configuredRef, mutation };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const options = parseArgs(process.argv.slice(2));
  verifySupabaseTarget(options)
    .then(({ environment, projectRef, mutation }) => {
      console.log(`Supabase target verified: environment=${environment}, projectRef=${projectRef}, mutation=${mutation}.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}

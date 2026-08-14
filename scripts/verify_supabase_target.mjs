import { verifySupabaseTarget } from "./supabase_target_guard.mjs";

const environmentIndex = process.argv.indexOf("--environment");
const environment = environmentIndex >= 0 ? process.argv[environmentIndex + 1] : "";
const mutation = process.argv.includes("--mutation");

if (environment && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(`.env.${environment}.local`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

verifySupabaseTarget({ environment: environment?.toLowerCase() || "", mutation })
  .then(({ environment: verifiedEnvironment, projectRef }) => {
    console.log(`Supabase target verified: environment=${verifiedEnvironment}, projectRef=${projectRef}, mutation=${mutation}.`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

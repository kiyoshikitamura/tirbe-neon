import { readFile } from "node:fs/promises";

function getProjectRefFromUrl(contents) {
  const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  const match = line?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || null;
}

try {
  const [productionEnv, linkedProject] = await Promise.all([
    readFile(".env.production", "utf8"),
    readFile("supabase/.temp/project-ref", "utf8"),
  ]);
  const productionRef = getProjectRefFromUrl(productionEnv);
  const linkedRef = linkedProject.trim();
  if (!productionRef || !linkedRef) throw new Error("Supabase project reference could not be resolved.");
  if (productionRef !== linkedRef) {
    throw new Error(`Supabase target mismatch: production=${productionRef}, linked=${linkedRef}`);
  }
  console.log(`Supabase production target verified: ${productionRef}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

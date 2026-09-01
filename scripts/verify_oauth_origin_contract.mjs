import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getOAuthCallbackUrl, getOAuthReturnUrl } from "../src/utils/browserDetection.ts";

const previewOrigin = "https://tribe-neon-mobile-preview.vercel.app";
const productionOrigin = "https://tirbe-neon.vercel.app";
const productionSupabaseRef = "ktpolnkyyfkowxdmijww";
const branchPreviewOrigin = "https://tribe-neon-git-codex-human-ng-remediati-49702c-kiyoshi-kitamura.vercel.app";

for (const origin of [previewOrigin, branchPreviewOrigin, productionOrigin, "http://localhost:3000"]) {
  const callback = getOAuthCallbackUrl(`${origin}/?invite=ORIGIN-GATE`);
  assert.equal(callback, `${origin}/auth/callback?invite=ORIGIN-GATE`);
  assert.equal(getOAuthReturnUrl(`${callback}&code=redacted`), `${origin}/?invite=ORIGIN-GATE`);
}

const previewConfigSource = await readFile("scripts/configure_mobile_preview_auth.mjs", "utf8");
assert.match(previewConfigSource, /https:\/\/tribe-neon-\*-kiyoshi-kitamura\.vercel\.app\/\*\*/);

const sourceFiles = [
  "src/app/context/hooks/useAuth.ts",
  "src/app/components/TutorialAuthentication.tsx",
  "src/app/auth/callback/page.tsx",
];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  assert.doesNotMatch(source, /tirbe-neon\.vercel\.app/);
  assert.doesNotMatch(source, /VERCEL_PROJECT_PRODUCTION_URL|NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_APP_URL/);
}

const bundleDirectory = process.env.OAUTH_BUNDLE_DIR?.trim();
if (bundleDirectory) {
  const files = [];
  const visit = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (/\.(?:js|html|json)$/.test(entry.name)) files.push(fullPath);
    }
  };
  await visit(bundleDirectory);
  const bundle = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  if (process.env.NEXT_PUBLIC_APP_ENV === "preview") {
    assert.doesNotMatch(bundle, new RegExp(productionSupabaseRef));
    assert.doesNotMatch(bundle, /https:\/\/tirbe-neon\.vercel\.app\/auth\/callback/);
  }
}

console.log(JSON.stringify({
  previewCallback: `${previewOrigin}/auth/callback`,
  productionCallback: `${productionOrigin}/auth/callback`,
  runtimeOriginPreserved: true,
  hardcodedProductionOAuthOrigin: false,
}));

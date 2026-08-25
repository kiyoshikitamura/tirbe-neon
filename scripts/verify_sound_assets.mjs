import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = await readFile(path.join(root, "src/audio/audioContract.ts"), "utf8");
const paths = [...new Set([...contract.matchAll(/"(\/sounds\/(?:bgm|se)\/[^"\s]+\.mp3)"/g)].map((match) => match[1]))];
if (paths.length === 0) throw new Error("No production sound paths found in audioContract");
const hashes = new Map();
for (const publicPath of paths) {
  const filename = path.join(root, "public", publicPath.replace(/^\//, ""));
  const info = await stat(filename);
  if (!info.isFile() || info.size < 1024) throw new Error(`Broken sound asset: ${publicPath}`);
  const bytes = await readFile(filename);
  if (!bytes.subarray(0, 3).equals(Buffer.from("ID3")) && !bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xfb]))) {
    throw new Error(`Unsupported MP3 header: ${publicPath}`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  hashes.set(hash, [...(hashes.get(hash) || []), publicPath]);
}
const duplicates = [...hashes.values()].filter((files) => files.length > 1);
console.log(JSON.stringify({ semanticPaths: paths.length, missing: 0, broken: 0, duplicateGroups: duplicates }, null, 2));

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const guild = read("src/app/components/GuildTab.tsx");
const detail = read("src/app/components/CommonModals.tsx");
const chat = read("src/app/components/TribeChatModal.tsx");
const chatHook = read("src/app/context/hooks/useChat.ts");
const migration = read("supabase/migrations/20260827000203_guild_activation_identity_projection.sql");

const checks = [
  [!guild.includes("guild-lobby-hero\""), "temporary Guild hero is absent"],
  [guild.includes("現在ギルドに所属していません"), "unaffiliated status is explicit"],
  [guild.includes("おすすめギルド"), "recommendations are the primary discovery path"],
  [guild.includes("<details className={`guild-lobby-create"), "creation remains secondary"],
  [guild.includes("const createUnlocked = userLevel >= 8") && guild.includes("userLevel < 8 ? \"Lv.8で解放\""), "Lv8 client creation gate remains authoritative"],
  [detail.includes("<CanonicalDialog") && detail.includes("<UserIdentityRow"), "Guild detail reuses canonical dialog and identity"],
  [detail.includes("7日間活動") && detail.includes("レイド貢献") && detail.includes("総合力"), "Guild detail is Japanese-first"],
  [chat.includes("<UserIdentityRow") && chat.includes("leaderCharacterId={leaderCharacterId}"), "Guild Chat uses canonical identity"],
  [!chatHook.includes("CHARACTERS_MASTER[0]") && !chatHook.includes("selectedLeader"), "Guild Chat has no fabricated leader fallback"],
  [migration.includes("'leader_user_id', leader.id") && migration.includes("'leader_favorite_character_id', leader.favorite_character_id"), "public Guild projection exposes canonical leader identity"],
  [migration.includes("grant execute on function public.get_public_guild_detail(uuid) to authenticated"), "public Guild projection remains authenticated"],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`Guild Activation contract failed: ${label}`);
}

console.log(JSON.stringify({ status: "PASS", checks: checks.map(([, label]) => label) }, null, 2));

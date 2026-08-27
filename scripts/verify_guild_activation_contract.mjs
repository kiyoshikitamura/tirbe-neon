import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const guild = read("src/app/components/GuildTab.tsx");
const detail = read("src/app/components/CommonModals.tsx");
const chat = read("src/app/components/TribeChatModal.tsx");
const chatHook = read("src/app/context/hooks/useChat.ts");
const migration = read("supabase/migrations/20260827000203_guild_activation_identity_projection.sql");
const remediationMigration = read("supabase/migrations/20260828000204_guild_human_acceptance_projection.sql");

const checks = [
  [!guild.includes("guild-lobby-hero\""), "temporary Guild hero is absent"],
  [guild.includes("現在ギルドに所属していません"), "unaffiliated status is explicit"],
  [guild.includes("おすすめギルド"), "recommendations are the primary discovery path"],
  [guild.includes("<details className={`guild-lobby-create"), "creation remains secondary"],
  [guild.includes("const createUnlocked = userLevel >= 8") && guild.includes("userLevel < 8 ? \"Lv.8で解放\""), "Lv8 client creation gate remains authoritative"],
  [guild.includes('guildSubTab === "home"') && guild.includes("guild-visual-identity") && guild.includes("guild-action-grid"), "joined users land on the compact Guild My Page"],
  [guild.includes("直近7日アクティブ") && guild.includes("COMING SOON"), "Guild My Page status and unavailable actions are explicit"],
  [guild.includes("<UserIdentityRow") && guild.includes("guild-member-role"), "joined member list uses shared identity and canonical role labels"],
  [guild.includes("ギルドを脱退") && !guild.includes("解散 / 脱退"), "ordinary membership leave is an explicit secondary action"],
  [detail.includes("<CanonicalDialog") && detail.includes("<UserIdentityRow"), "Guild detail reuses canonical dialog and identity"],
  [detail.includes("直近7日アクティブ") && detail.includes("レイド貢献") && detail.includes("総合力"), "Guild detail is Japanese-first"],
  [detail.includes("メイン属性") && detail.includes("サブ属性") && !detail.includes("主属性:"), "Guild attributes use canonical Japanese labels"],
  [detail.includes("guild-public-member-list") && detail.includes("guildRoleLabel"), "Guild detail exposes the compact canonical member list"],
  [chat.includes("<UserIdentityRow") && chat.includes("leaderCharacterId={leaderCharacterId}"), "Guild Chat uses canonical identity"],
  [!chatHook.includes("CHARACTERS_MASTER[0]") && !chatHook.includes("selectedLeader"), "Guild Chat has no fabricated leader fallback"],
  [migration.includes("'leader_user_id', leader.id") && migration.includes("'leader_favorite_character_id', leader.favorite_character_id"), "public Guild projection exposes canonical leader identity"],
  [migration.includes("grant execute on function public.get_public_guild_detail(uuid) to authenticated"), "public Guild projection remains authenticated"],
  [remediationMigration.includes("'members'") && remediationMigration.includes("member_profile.favorite_character_id"), "member identity projection is canonical"],
  [remediationMigration.includes("grant execute on function public.search_guilds(text) to authenticated"), "search projection remains authenticated"],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`Guild Activation contract failed: ${label}`);
}

console.log(JSON.stringify({ status: "PASS", checks: checks.map(([, label]) => label) }, null, 2));

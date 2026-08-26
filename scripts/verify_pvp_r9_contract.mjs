import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const dialog = read("src/app/components/ui/CanonicalDialog.tsx");
const dialogCss = read("src/app/components/ui/CanonicalDialog.css");
const profile = read("src/app/components/profile/PublicUserProfile.tsx");
const common = read("src/app/components/CommonModals.tsx");
const pvp = read("src/app/components/PvpTab.tsx");
const gameContext = read("src/app/context/GameContext.tsx");
const settings = read("src/app/components/SettingsPanel.tsx");
const bio = read("src/domain/presentation/userBio.ts");
const profileSql = read("supabase/migrations/20260817000154_ranking_power_p0_foundation.sql");
const bioMigration = read("supabase/migrations/20260826000198_profile_bio_identity_default.sql");

const checks = [
  [dialog.includes('size?: "standard" | "large"'), "dialog variants"],
  [dialog.includes('aria-label="閉じる"'), "canonical close"],
  [dialogCss.includes("position:fixed") && dialogCss.includes("place-items:center"), "centered overlay"],
  [dialogCss.includes("overflow-y:auto"), "body scroll"],
  [common.includes("<CanonicalDialog title=\"エラー\""), "error migration"],
  [common.includes("<PublicUserProfile"), "public profile migration"],
  [pvp.includes('bpDialog === "shortage"') && pvp.includes('semantic: "secondary"') && pvp.includes('semantic: "primary"'), "BP dialogs"],
  [!pvp.includes("pvp-hero-title") && !pvp.includes("FIGHT / SOLO COMPETITION") && !pvp.includes("description=\"相手を選び"), "PvP duplicate visual title removal"],
  [profile.includes("leaderCharacterId") && profile.includes("MY DECK") && profile.includes("DMを送る"), "profile hierarchy"],
  [profile.includes("frameKind=\"character\"") && !profile.includes("ユーザー経験値"), "character frame and privacy"],
  [profile.includes("public-profile-character-detail") && profile.includes("SkillIconGrid") && gameContext.includes('supabase.rpc("get_public_battle_roster"'), "public character detail projection"],
  [bio.includes("USER_BIO_MAX_LENGTH = 200") && bio.includes("歌舞伎町の覇権"), "bio authority"],
  [settings.includes("handleUpdateBio") && settings.includes("USER_BIO_MAX_LENGTH") && settings.includes("自己紹介を入力"), "bio edit"],
  [profileSql.includes("'bio',player.bio") && profileSql.includes("main_formation"), "public projection"],
  [bioMigration.includes("alter column bio set default ''::text") && !bioMigration.includes("update public.users"), "empty bio default"],
];
const failures = checks.filter(([pass]) => !pass).map(([, name]) => name);
if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", failures }));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", checks: checks.length, bioMax: 200, dialogVariants: ["standard", "large"] }));

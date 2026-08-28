import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const requireText = (file, text, label) => {
  if (!read(file).includes(text)) failures.push(`${label}: ${file} is missing ${text}`);
};
const forbidText = (file, text, label) => {
  if (read(file).includes(text)) failures.push(`${label}: ${file} still contains ${text}`);
};

requireText("src/app/components/ui/OutlawButton.tsx", "aria-busy={busy}", "shared async state");
requireText("src/app/components/ui/OutlawButton.tsx", "outlaw-button-spinner", "shared pending indicator");
requireText("src/app/components/ui/ConfirmDialog.tsx", "kind === \"reward\"", "shared reward dialog");
requireText("src/app/components/MissionPanel.tsx", "loadingLabel=\"一括受取中…\"", "mission claim-all feedback");
requireText("src/app/components/MissionPanel.tsx", "loadingLabel=\"受取中…\"", "mission claim feedback");
requireText("src/app/components/InboxPanel.tsx", "isLoading={presentClaimLoading}", "present claim-all feedback");
requireText("src/app/components/TribeChatModal.tsx", "loadingLabel=\"送信中…\"", "guild chat feedback");
requireText("src/app/components/HomeTab.tsx", "tutorialStep === \"AUTO_FORMATION\" ? \"character\" : \"patrol\"", "tutorial formation to first quest CTA");
requireText("src/app/components/HomeTab.tsx", "title: \"ミッションを進めよう\"", "one-line final Mission handoff CTA");
requireText("src/app/components/HomeTab.tsx", "return null;", "completed joined Home omits the large CTA");
forbidText("src/app/components/HomeTab.tsx", "key: \"mission_reward\"", "mission reward must remain a compact badge rather than a large Home CTA");
requireText("src/app/components/GuildTab.tsx", "おすすめギルド", "guild recommendation section");
requireText("src/app/components/MissionPanel.css", "@media (max-width: 412px)", "mission mobile layout");
requireText("src/app/components/ui/ConfirmDialog.css", "env(safe-area-inset-bottom)", "modal safe area");

const forbidden = ["FRIEND_HELPER", "friend helper slot", "AP Gameplay", "random_options Gameplay"];
const changedRuntime = [
  "src/app/components/HomeTab.tsx",
  "src/app/components/MissionPanel.tsx",
  "src/app/components/InboxPanel.tsx",
  "src/app/components/GuildTab.tsx",
  "src/app/components/TribeChatModal.tsx",
].map(read).join("\n");
for (const text of forbidden) {
  if (changedRuntime.includes(text)) failures.push(`closed/legacy surface reintroduced: ${text}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Pre-open Home / Activation / Common UX verification: PASS");

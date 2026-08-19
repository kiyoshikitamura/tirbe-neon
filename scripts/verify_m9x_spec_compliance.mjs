import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const uiFiles = [
  "src/app/components/SetupView.tsx",
  "src/app/components/TitleView.tsx",
  "src/app/components/AuthView.tsx",
  "src/app/components/TutorialWorldIntro.tsx",
  "src/app/components/GachaTab.tsx",
  "src/app/components/CommonModals.tsx",
  "src/app/components/CharacterTab.tsx",
  "src/app/components/PatrolTab.tsx",
  "src/app/components/TutorialBattlePrompt.tsx",
  "src/app/components/CardBattleView.tsx",
  "src/app/components/TutorialRuleGuide.tsx",
  "src/app/components/HomeTab.tsx",
  "src/app/components/GuildTab.tsx",
  "src/app/components/TribeChatModal.tsx",
  "src/app/legal/LegalPage.tsx",
];

const sources = Object.fromEntries(uiFiles.map((file) => [file, readFileSync(resolve(file), "utf8")]));
const combined = Object.values(sources).join("\n");
const forbidden = [
  "NEON TOKYO",
  "ネオン東京",
  "WORLD INFORMATION",
  "PLAYER REGISTRATION",
  "WELCOME TO NEON TOKYO",
  "FIRST NEON DRAW",
  "TUTORIAL FREE 10 PULL",
  "SSR SIGNAL",
  "最高レアリティ反応",
  "おすすめ編成で決定",
  "チュートリアルバトル開始",
  "暗号メッセージ『トライブ』",
  "MISSION HUB",
  "TRIBE: NEON REIGN",
];

const violations = forbidden.filter((value) => combined.includes(value));
if (violations.length > 0) {
  throw new Error(`M9-X forbidden UI copy detected: ${violations.join(", ")}`);
}

const gameContext = readFileSync(resolve("src/app/context/GameContext.tsx"), "utf8");
const characterTab = sources["src/app/components/CharacterTab.tsx"];
for (const retiredClientPath of [
  "prepare_current_tutorial_growth",
  "advance_current_tutorial_after_growth",
  "tribe_tutorial_growth_ready",
  "isTutorialGrowth",
]) {
  if (`${gameContext}\n${characterTab}`.includes(retiredClientPath)) {
    throw new Error(`Retired tutorial Growth client path detected: ${retiredClientPath}`);
  }
}

const requiredFragments = [
  "ここは、誰のルールも",
  "力を持つ奴が、",
  "ここで生き残るために、",
  "どこまで上へ行くか。",
  "この街で生きる覚悟はあるか。",
  "はじめまして。アゲハだよ。",
  "ここでは、ガチャで仲間を増やせるよ。",
  "いいじゃん。じゃ、この中から一緒に動くメンバーを決めよ。",
  "バトルに出るメンバーはここで決めるよ。",
  "次はクエストね。まずはこの子を新宿に行かせてみよ。",
  "本当なら、あとは帰ってくるまで待つんだけど――",
  "こんな感じ。クエストを進めながら、少しずつ強くなってくよ。",
  "あ、バトルになったみたい。",
  "これで基本は大丈夫。",
  "いろんな奴が、この街で生きてる。",
  "仲間を集めて、もっと強くなる。",
  "気の合う奴らと、TRIBEへ。",
];
const missing = requiredFragments.filter((value) => !combined.includes(value));
if (missing.length > 0) {
  throw new Error(`M9-X required Package copy missing: ${missing.join(" / ")}`);
}

const gachaReveal = sources["src/app/components/CommonModals.tsx"];
for (const fragment of [
  "tutorial-gacha-reveal-parameters",
  "<dt>HP</dt>",
  "<dt>ATK</dt>",
  "<dt>DEF</dt>",
]) {
  if (!gachaReveal.includes(fragment)) throw new Error(`Tutorial Gacha parameter contract missing: ${fragment}`);
}
for (const forbiddenParameter of ["<dt>SPD</dt>", "<dt>LUK</dt>", "primaryStat", "primary_parameter"]) {
  if (gachaReveal.includes(forbiddenParameter)) throw new Error(`Forbidden Tutorial Gacha parameter contract detected: ${forbiddenParameter}`);
}

console.log(`M9-X specification source gate PASS (${uiFiles.length} UI files, ${requiredFragments.length} required fragments)`);

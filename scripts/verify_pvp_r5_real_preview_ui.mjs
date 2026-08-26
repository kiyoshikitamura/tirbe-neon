import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

if (typeof process.loadEnvFile === "function") process.loadEnvFile(process.env.PREVIEW_ENV_FILE || ".env.preview.local");

const PREVIEW_REF = "sufvuqdnqohpfzkwxohq";
const FIXED_PREVIEW = process.env.PVP_R5_BASE_URL || "https://tribe-neon-mobile-preview.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, PREVIEW_REF);
assert.equal(new URL(url).hostname, `${PREVIEW_REF}.supabase.co`);
assert.ok(anonKey && serviceKey);

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const created = [];
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const password = `R5!${stamp}Qa`;

async function createPlayer(prefix, characterIds) {
  const email = `${prefix.toLowerCase()}-${stamp}@preview-qa.invalid`;
  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !createdAuth.user) throw authError || new Error("Preview QA Auth user creation failed");
  const userId = createdAuth.user.id;
  created.push(userId);
  const username = `${prefix}${stamp.slice(-5)}`.slice(0, 8);
  const { error: profileError } = await admin.from("users").insert({ id: userId, username, current_base_id: "shinjuku", pvp_points: 5 });
  if (profileError) throw profileError;
  const { error: stateError } = await admin.from("tutorial_progress").insert({ user_id: userId, step_id: "AUTHENTICATION", completed_at: new Date().toISOString() });
  if (stateError) throw stateError;
  const { error: methodError } = await admin.from("user_account_auth_methods").insert({ user_id: userId, auth_method: "EMAIL" });
  if (methodError) throw methodError;
  const { data: owned, error: ownedError } = await admin.from("user_characters")
    .insert(characterIds.map((character_id) => ({ user_id: userId, character_id, level: 7, awakening_level: 0 })))
    .select("id,character_id,level");
  if (ownedError || owned?.length !== characterIds.length) throw ownedError || new Error("Character fixture creation failed");
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) throw signInError || new Error("Preview QA sign in failed");
  const { error: formationError } = await client.rpc("save_main_formation", { p_character_ids: characterIds });
  if (formationError) throw formationError;
  console.error(`R5 ${prefix} main formation saved`);
  const { error: defenseError } = await client.rpc("save_pvp_defense_deck", { p_character_ids: characterIds, p_tactic: "ATTACK_PRIORITY" });
  if (defenseError) throw defenseError;
  console.error(`R5 ${prefix} defense deck saved`);
  const skillRows = owned.map((entry) => ({ user_id: userId, skill_card_id: "SKILL_001", equipped_character_id: entry.id, slot_index: 0, plus_val: 0 }));
  const { error: skillsError } = await admin.from("user_skills").insert(skillRows);
  if (skillsError) throw skillsError;
  console.error(`R5 ${prefix} skills equipped`);
  const { error: rankError } = await admin.from("pvp_ranks").upsert({ user_id: userId, rank_points: 1000 });
  if (rankError) throw rankError;
  console.error(`R5 ${prefix} rank ready`);
  return { client, session: signedIn.session, userId, username, characterIds, owned };
}

async function runViewport(viewport) {
  const attacker = await createPlayer(`A${viewport.width}`, ["char_kengo_01", "char_ageha_01", "char_gou_01", "char_mio_01", "char_kaede_01"]);
  const defender = await createPlayer(`D${viewport.width}`, ["char_kengo_01", "char_reiji_01", "char_karen_01", "char_koharu_01", "char_leo_01"]);
  const directOpponents = await attacker.client.rpc("get_pvp_opponents", { p_user_id: attacker.userId, p_my_points: 1000 });
  if (directOpponents.error) throw directOpponents.error;
  if (!Array.isArray(directOpponents.data) || directOpponents.data.length === 0) throw new Error("Preview QA opponent projection is empty");
  console.error(`R5 direct Preview opponents=${directOpponents.data.length} first=${directOpponents.data[0].opponent_username}`);
  const { data: rankingRows, error: rankingError } = await attacker.client.rpc("get_public_pvp_rankings", { p_daily: false, p_limit: 100, p_offset: 0 });
  if (rankingError) throw rankingError;
  const ownRanking = rankingRows.find((row) => row.user_id === attacker.userId);
  if (!ownRanking) throw new Error("Preview QA user is missing from public PvP ranking");
  const { count: candidatePopulation, error: populationError } = await admin.from("pvp_defense_decks").select("user_id", { count: "exact", head: true }).not("character_1_id", "is", null).neq("user_id", attacker.userId);
  if (populationError) throw populationError;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
  const page = await context.newPage();
  let opponentRpcRequestCount = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/rest/v1/rpc/get_pvp_opponents")) opponentRpcRequestCount += 1;
  });
  page.on("console", (message) => { if (message.type() === "error") console.error(`BROWSER ${message.text()}`); });
  const storageKey = `sb-${PREVIEW_REF}-auth-token`;
  await page.addInitScript(({ storageKey, session }) => {
    localStorage.setItem(storageKey, JSON.stringify(session));
  }, { storageKey, session: attacker.session });
  await page.addInitScript(() => {
    window.__R5_DOM_TRACE__ = { hp: [], skills: [], rarityText: [] };
    document.addEventListener("DOMContentLoaded", () => {
      const observer = new MutationObserver(() => {
        const at = performance.now();
        document.querySelectorAll(".battle-unit").forEach((unit) => {
          const fill = unit.querySelector("[data-hp-fill]");
          const record = {
            at,
            id: unit.getAttribute("data-participant-id"),
            hp: Number(unit.getAttribute("data-hp")),
            maxHp: Number(unit.getAttribute("data-max-hp")),
            percent: Number(unit.getAttribute("data-hp-percent")),
            fillPx: fill?.getBoundingClientRect().width ?? null,
            text: unit.textContent?.replace(/\s+/g, " ").trim() || "",
          };
          const previous = window.__R5_DOM_TRACE__.hp.at(-1);
          if (!previous || previous.id !== record.id || previous.hp !== record.hp || previous.fillPx !== record.fillPx) window.__R5_DOM_TRACE__.hp.push(record);
        });
        document.querySelectorAll(".battle-skill-cutin").forEach((node) => {
          const text = node.textContent?.replace(/\s+/g, " ").trim() || "";
          if (text && window.__R5_DOM_TRACE__.skills.at(-1)?.text !== text) window.__R5_DOM_TRACE__.skills.push({ at, text });
        });
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-hp", "data-hp-percent", "style"] });
    });
  });

  try {
    await page.goto(FIXED_PREVIEW, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const tap = page.getByRole("button", { name: /TAP TO START/ });
    if (await tap.isVisible({ timeout: 20_000 }).catch(() => false)) await tap.click();
    await page.getByText("マイページ", { exact: true }).first().waitFor({ timeout: 30_000 });
    const pvpEntry = page.getByRole("button", { name: "喧嘩", exact: true });
    await pvpEntry.click();
    const firstOpponentCard = page.locator(".pvp-opponent-card").first();
    if (!await firstOpponentCard.isVisible({ timeout: 12_000 }).catch(() => false)) {
      const refresh = page.getByRole("button", { name: "更新", exact: true });
      if (await refresh.isVisible().catch(() => false)) await refresh.click();
    }
    await firstOpponentCard.waitFor({ timeout: 30_000 });

    await page.waitForFunction(() => document.querySelector(".pvp-self-summary > div strong")?.textContent?.trim() !== "—");
    const beforeOpponentIds = await page.locator(".pvp-opponent-card").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-opponent-user-id")));
    const pvpTopRank = (await page.locator(".pvp-self-summary > div").first().locator("strong").textContent())?.trim() || "";
    const requestsBeforeRefresh = opponentRpcRequestCount;
    const refreshResponsePromise = page.waitForResponse((response) => response.url().includes("/rest/v1/rpc/get_pvp_opponents") && response.request().method() === "POST", { timeout: 20_000 });
    await page.getByRole("button", { name: "更新", exact: true }).click();
    const refreshResponse = await refreshResponsePromise;
    const refreshPayload = await refreshResponse.json();
    await page.getByRole("button", { name: "更新", exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "更新" && button.getAttribute("aria-busy") === "false"));
    const afterOpponentIds = await page.locator(".pvp-opponent-card").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-opponent-user-id")));
    const refreshTrace = {
      candidatePopulation,
      requestCount: opponentRpcRequestCount - requestsBeforeRefresh,
      beforeOpponentIds,
      responseOpponentIds: Array.isArray(refreshPayload) ? refreshPayload.map((entry) => entry.opponent_user_id) : [],
      afterOpponentIds,
    };

    if (process.env.PVP_R7_TOP_ONLY === "true") {
      await page.getByRole("button", { name: "ランキング", exact: true }).click();
      await page.locator(".ranking-tab-view").waitFor({ timeout: 20_000 });
      await page.waitForFunction((expected) => document.querySelector(".ranking-hero-copy strong")?.textContent?.trim() === expected, `${Number(ownRanking.rank_position)}位`, { timeout: 20_000 });
      const rankingDisplay = (await page.locator(".ranking-hero-copy strong").textContent())?.trim() || "";
      await page.screenshot({ path: `test-results/pvp-r7-top-${viewport.width}x${viewport.height}.png`, fullPage: true });
      return {
        viewport,
        users: { attacker: attacker.userId, defender: defender.userId },
        rank: { server: Number(ownRanking.rank_position), pvpTop: pvpTopRank, ranking: rankingDisplay },
        refresh: refreshTrace,
      };
    }

    await page.waitForFunction(() => document.querySelectorAll(".pvp-my-deck .pvp-deck-member").length === 5, null, { timeout: 20_000 });
    const topDeck = await page.locator(".pvp-my-deck .pvp-deck-member").evaluateAll((nodes) => nodes.map((node) => ({
      id: node.getAttribute("data-character-id"),
      text: node.textContent?.trim() || "",
      frameSrc: node.querySelector(".character-presentation-frame.is-character")?.getAttribute("src") || null,
      skillOverlaps: (() => {
        const portrait = node.querySelector(".character-presentation")?.getBoundingClientRect();
        const skill = node.querySelector(".pvp-deck-skill-slot")?.getBoundingClientRect();
        return Boolean(portrait && skill && !(skill.right <= portrait.left || skill.left >= portrait.right || skill.bottom <= portrait.top || skill.top >= portrait.bottom));
      })(),
    })));
    const opponentCard = firstOpponentCard;
    const renderedOpponentName = (await opponentCard.locator(".pvp-opponent-name").textContent())?.trim() || "";
    await opponentCard.getByRole("button", { name: "対戦する" }).click();
    await page.locator(".setup-container").waitFor({ timeout: 20_000 });
    const preBattle = await page.evaluate(() => {
      const describeDeck = (selector) => [...document.querySelectorAll(selector)].map((node) => ({
        id: node.getAttribute("data-character-id"),
        text: node.textContent?.replace(/\s+/g, " ").trim() || "",
        frameSrc: node.querySelector(".character-presentation-frame.is-character")?.getAttribute("src") || null,
      }));
      const tactic = document.querySelector(".setup-tactic-wrapper")?.getBoundingClientRect();
      const cta = document.querySelector(".setup-cta-area")?.getBoundingClientRect();
      const opponent = document.querySelector(".setup-enemy-wrapper")?.getBoundingClientRect();
      const enemySkill = document.querySelector(".setup-enemy-skill-grid .pvp-deck-skill-slot")?.getBoundingClientRect();
      const playerSkill = document.querySelector(".setup-player-wrapper .pvp-deck-skill-slot")?.getBoundingClientRect();
      const ctaButtons = [...document.querySelectorAll(".setup-cta-area button")].map((button) => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, disabled: button.disabled };
      });
      return {
        playerDeck: describeDeck(".setup-player-wrapper .pvp-deck-member"),
        enemyDeck: describeDeck(".setup-enemy-wrapper .pvp-deck-member"),
        text: document.querySelector(".setup-container")?.textContent?.replace(/\s+/g, " ").trim() || "",
        order: [...document.querySelectorAll(".setup-scroll-area > *, .setup-container > .setup-cta-area")].map((node) => node.className),
        rarityTextCount: [...document.querySelectorAll(".setup-container .pvp-deck-member")].filter((node) => /^(?:SSR|SR|R|N)$/m.test(node.textContent?.trim() || "")).length,
        frameCount: document.querySelectorAll(".setup-container .character-presentation-frame.is-character").length,
        tacticCtaOverlap: Boolean(tactic && cta && !(cta.top >= tactic.bottom || cta.bottom <= tactic.top)),
        ctaBeforeOpponent: Boolean(cta && opponent && cta.bottom <= opponent.top),
        ctaButtons,
        skillGeometry: enemySkill && playerSkill ? {
          enemy: { width: enemySkill.width, height: enemySkill.height },
          player: { width: playerSkill.width, height: playerSkill.height },
          widthDelta: Math.abs(enemySkill.width - playerSkill.width),
          heightDelta: Math.abs(enemySkill.height - playerSkill.height),
        } : null,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    if (process.env.PVP_R6_PREBATTLE_ONLY === "true") {
      await page.screenshot({ path: `test-results/pvp-r6-prebattle-${viewport.width}x${viewport.height}.png`, fullPage: true });
      return {
        viewport,
        users: { attacker: attacker.userId, defender: defender.userId },
        renderedOpponentName,
        topDeck,
        preBattle: {
          ...preBattle,
          playerIds: preBattle.playerDeck.map((entry) => entry.id),
          enemyIds: preBattle.enemyDeck.map((entry) => entry.id),
        },
      };
    }
    await page.getByRole("button", { name: "対戦開始" }).click();
    try {
      await page.locator(".quest-battle-viewer").waitFor({ timeout: 45_000 });
    } catch (error) {
      console.error(`R5 battle surface missing: ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1200)}`);
      throw error;
    }
    const speed = page.locator(".speed-toggle-btn");
    if ((await speed.textContent())?.trim() === "1x") await speed.click();
    if (process.env.PVP_R5_FAST_TRACE === "true") {
      await page.waitForFunction(() => {
        const trace = window.__TRIBE_BATTLE_HP_TRACE__ || [];
        return trace.some((entry) => entry.side === "player" && entry.stateBefore > entry.stateAfter)
          && trace.some((entry) => entry.side === "enemy" && entry.stateBefore > entry.stateAfter);
      }, null, { timeout: 60_000 });
      const skip = page.getByRole("button", { name: /スキップ/ });
      if (await skip.isVisible().catch(() => false)) await skip.click();
    }
    await page.locator(".battle-screen.is-result").waitFor({ timeout: 180_000 });

    const telemetry = await page.evaluate(() => ({
      dom: window.__R5_DOM_TRACE__,
      projected: window.__TRIBE_BATTLE_HP_TRACE__ || [],
      presentation: window.__TRIBE_BATTLE_PRESENTATION__ || null,
      rawSkillIdCount: (document.body.innerText.match(/(?:SKILL_\d+|skill_\d+|[0-9a-f]{8}-[0-9a-f-]{27,})/gi) || []).length,
    }));
    const { data: replay } = await admin.from("battle_replay_sessions")
      .select("id,player_snapshot,enemy_snapshot,result,created_at")
      .eq("requester_user_id", attacker.userId).eq("battle_mode", "PVP").order("created_at", { ascending: false }).limit(1).single();
    const { data: events } = await admin.from("battle_replay_events")
      .select("event_index,round_number,event_type,payload").eq("battle_replay_session_id", replay.id).order("event_index");
    await page.screenshot({ path: `test-results/pvp-r5-real-${viewport.width}x${viewport.height}.png`, fullPage: true });
    const hpSample = (side) => {
      const projected = telemetry.projected.find((entry) => entry.side === side && entry.stateBefore > entry.stateAfter);
      if (!projected) return null;
      const rendered = telemetry.dom.hp.filter((entry) => entry.id === projected.targetId && entry.hp === projected.remainingHp).at(-1);
      return { ...projected, observedDom: rendered || null };
    };
    const playerHp = hpSample("player");
    const enemyHp = hpSample("enemy");
    const playerSkill = telemetry.dom.skills.find((entry) => /ケンゴ|アゲハ|ゴウ|ミオ|カエデ/.test(entry.text));
    const enemySkill = telemetry.dom.skills.find((entry) => /レイジ|カレン|コハル|レオ/.test(entry.text)) || telemetry.dom.skills.find((entry) => entry !== playerSkill);
    return {
      viewport,
      users: { attacker: attacker.userId, defender: defender.userId },
      renderedOpponentName,
      topDeck,
      preBattle: {
        ...preBattle,
        playerIds: preBattle.playerDeck.map((entry) => entry.id),
        enemyIds: preBattle.enemyDeck.map((entry) => entry.id),
      },
      replay: { id: replay.id, playerIds: replay.player_snapshot.map((entry) => entry.characterId), enemyIds: replay.enemy_snapshot.map((entry) => entry.characterId) },
      hp: { player: playerHp, enemy: enemyHp },
      skills: { player: playerSkill, enemy: enemySkill, rawSkillIdCount: telemetry.rawSkillIdCount, observed: telemetry.dom.skills.slice(0, 8) },
      defeatCount: events.filter((entry) => entry.event_type === "DEFEAT").length,
      renderedDefeatCount: new Set(telemetry.dom.hp.filter((entry) => entry.hp === 0 && /戦闘不能/.test(entry.text)).map((entry) => entry.id)).size,
    };
  } finally {
    await browser.close();
  }
}

try {
  const requested = process.argv.includes("--both") ? [{ width: 390, height: 844 }, { width: 412, height: 915 }] : [{ width: 390, height: 844 }];
  const results = [];
  for (const viewport of requested) results.push(await runViewport(viewport));
  for (const result of results) {
    if (result.rank) {
      assert.equal(result.rank.pvpTop, `#${result.rank.server}`, `${result.viewport.width}: PvP Top rank authority`);
      assert.equal(result.rank.ranking, `${result.rank.server}位`, `${result.viewport.width}: Ranking rank authority`);
      assert.equal(result.refresh.requestCount, 1, `${result.viewport.width}: refresh RPC request count`);
      assert.deepEqual(result.refresh.afterOpponentIds, result.refresh.responseOpponentIds, `${result.viewport.width}: refresh response/DOM parity`);
      continue;
    }
    assert.equal(result.topDeck.length, 5, `${result.viewport.width}: MY DECK count`);
    assert.ok(result.topDeck.every((entry) => entry.skillOverlaps === false), `${result.viewport.width}: skill overlaps portrait`);
    assert.deepEqual(result.topDeck.map((entry) => entry.id), result.preBattle.playerIds, `${result.viewport.width}: Top/Pre-Battle deck parity`);
    if (result.replay) assert.deepEqual(result.preBattle.playerIds, result.replay.playerIds, `${result.viewport.width}: Pre-Battle/Replay deck parity`);
    assert.equal(result.preBattle.rarityTextCount, 0, `${result.viewport.width}: rarity text exposed`);
    assert.equal(result.preBattle.frameCount, 10, `${result.viewport.width}: canonical frame count`);
    assert.ok(result.topDeck.find((entry) => entry.id === "char_kengo_01")?.frameSrc?.includes("character-card-ssr"), `${result.viewport.width}: Kengo is not SSR framed`);
    assert.equal(result.preBattle.tacticCtaOverlap, false, `${result.viewport.width}: tactic/CTA overlap`);
    assert.equal(result.preBattle.ctaBeforeOpponent, true, `${result.viewport.width}: CTA is not before opponent content`);
    assert.equal(result.preBattle.ctaButtons.length, 2, `${result.viewport.width}: CTA count`);
    assert.ok(result.preBattle.ctaButtons.every((button) => !button.disabled), `${result.viewport.width}: CTA is not tappable`);
    assert.ok(Math.abs(result.preBattle.ctaButtons[0].left - result.preBattle.ctaButtons[1].left) <= 1 && Math.abs(result.preBattle.ctaButtons[0].width - result.preBattle.ctaButtons[1].width) <= 1, `${result.viewport.width}: CTA geometry mismatch`);
    assert.ok(result.preBattle.skillGeometry && result.preBattle.skillGeometry.widthDelta <= 1 && result.preBattle.skillGeometry.heightDelta <= 1, `${result.viewport.width}: enemy/player skill geometry mismatch`);
    assert.equal(result.preBattle.horizontalOverflow, false, `${result.viewport.width}: horizontal overflow`);
    if (result.hp) assert.ok(result.hp.player?.stateBefore > result.hp.player?.stateAfter && result.hp.player?.observedDom?.hp === result.hp.player?.remainingHp, `${result.viewport.width}: player HP projection`);
    if (result.hp) assert.ok(result.hp.enemy?.stateBefore > result.hp.enemy?.stateAfter && result.hp.enemy?.observedDom?.hp === result.hp.enemy?.remainingHp, `${result.viewport.width}: enemy HP projection`);
    if (result.skills) assert.ok(result.skills.player && result.skills.enemy, `${result.viewport.width}: player/enemy skill presentation`);
    if (result.skills) assert.equal(result.skills.rawSkillIdCount, 0, `${result.viewport.width}: internal skill id exposed`);
    if (result.replay && process.env.PVP_R5_FAST_TRACE !== "true") {
      assert.ok(result.defeatCount > 0 && result.renderedDefeatCount > 0, `${result.viewport.width}: defeat projection`);
    }
  }
  console.log(JSON.stringify({ status: "TRACE_COMPLETE", projectRef: PREVIEW_REF, fixedPreview: FIXED_PREVIEW, results }, null, 2));
} finally {
  const cleanupIds = [...created].reverse();
  const { data: replayRows } = await admin.from("battle_replay_sessions").select("id").or(`requester_user_id.in.(${cleanupIds.join(",")}),source_reference_id.in.(${cleanupIds.join(",")})`);
  const replayIds = (replayRows || []).map((entry) => entry.id);
  if (replayIds.length) await admin.from("battle_replay_events").delete().in("battle_replay_session_id", replayIds);
  if (replayIds.length) await admin.from("battle_replay_sessions").delete().in("id", replayIds);
  for (const table of ["user_main_formations", "user_skills", "pvp_defense_decks", "user_power_rankings", "pvp_ranks", "tutorial_progress", "user_account_auth_methods", "user_characters"]) {
    const { error } = await admin.from(table).delete().in("user_id", cleanupIds);
    if (error) console.warn(`Preview QA cleanup failed for ${table}: ${error.message}`);
  }
  const { error: profileCleanupError } = await admin.from("users").delete().in("id", cleanupIds);
  if (profileCleanupError) console.warn(`Preview QA profile cleanup failed: ${profileCleanupError.message}`);
  for (const userId of cleanupIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) console.warn(`Preview QA Auth cleanup failed for ${userId}: ${error.message}`);
  }
}

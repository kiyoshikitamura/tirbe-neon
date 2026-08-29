"use client";

import React, { useRef, useState } from "react";
import { useGame } from "@/app/context/GameContext";
import { CHARACTERS_MASTER } from "@/utils/game_constants";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";
import { getCharacterLocationBackground } from "@/utils/characterVisualAssets";
import CharacterPresentation from "../character/CharacterPresentation";
import HubPage from "../ui/HubPage";
import OutlawButton from "../ui/OutlawButton";
import CanonicalDialog from "../ui/CanonicalDialog";
import "./QuestPresentationV2.css";

const TOWNS = [
  ["shinjuku", "新宿"], ["shibuya", "渋谷"], ["ikebukuro", "池袋"], ["roppongi", "六本木"], ["akihabara", "秋葉原"], ["kawasaki", "川崎"], ["yokohama", "横浜"],
] as const;

function difficulty(value: string) {
  return value === "EASY" ? "初級" : value === "NORMAL" ? "中級" : value === "HARD" ? "上級" : value;
}

function clock(seconds: unknown) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}

export default function QuestPresentationV2() {
  const game = useGame() as any;
  const actionRef = useRef(false);
  const battleRef = useRef(false);
  const [battleStartingId, setBattleStartingId] = useState<string | null>(null);
  const activeCourse = (game.patrolCourses || []).find((course: any) => course.id === game.selectedCourse);
  const townName = TOWNS.find(([id]) => id === game.selectedTown)?.[1] || "街";
  const bgImage = `/bg/bg_street_${game.selectedTown}.png`;
  const selectedCharacter = CHARACTERS_MASTER.find((entry: any) => entry.id === game.selectedPatrolMember);
  const formatItems = (items: any[] = []) => items.map((item) => `${canonicalItemName(String(item.item_id || ""))} ×${item.quantity}`).join(" / ") || "なし";

  const guarded = async (operation: () => Promise<any>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    game.setGlobalInteractionBlocking(true);
    try { return await operation(); }
    finally { actionRef.current = false; game.setGlobalInteractionBlocking(false); }
  };

  const startBattle = async (patrol: any, npc: any) => {
    if (!npc || battleRef.current || game.battleEncounterLocked || patrol.id === game.settledPatrolEncounterId) return;
    battleRef.current = true;
    setBattleStartingId(patrol.id);
    game.setGlobalInteractionBlocking(true);
    try {
      await game.startCardBattle(
        "PATROL", npc.npc_name || "敵NPC", npc.id,
        undefined, undefined, undefined, undefined, undefined, undefined,
        npc, patrol.id,
        { encounterLabel: patrol.courseName || npc.npc_name || "クエスト", opponentLabel: npc.npc_name || "敵NPC" }
      );
    } finally {
      battleRef.current = false;
      setBattleStartingId(null);
      game.setGlobalInteractionBlocking(false);
    }
  };

  return <HubPage className="patrol-container quest-v2-shell" eyebrow="クエスト" title="クエスト" description={`${townName}・${activeCourse ? difficulty(activeCourse.level_type) : "クエスト選択"}`}>
    <div className="quest-v2-content">
      <section className="quest-v2-identity" style={{ backgroundImage: `linear-gradient(180deg,rgba(2,3,12,.16),rgba(2,2,10,.9)),url(${bgImage})` }}>
        <div><span>クエスト選択</span><strong>{townName}</strong><small>派遣中 {Number(game.activePatrols?.length || 0)} / 5</small></div>
      </section>

      <nav className="quest-v2-town-tabs" aria-label="街選択">{TOWNS.map(([id, label]) => <button key={id} className={game.selectedTown === id ? "active" : ""} onClick={() => { game.setSelectedTown(id); const first = (game.patrolCourses || []).find((course: any) => course.town_id === id && course.is_unlocked !== false); game.setSelectedCourse(first?.id || ""); game.playCyberSe("click"); }}>{label}</button>)}</nav>

      <section className="quest-v2-courses" aria-label="クエスト選択">{(game.patrolCourses || []).filter((course: any) => course.town_id === game.selectedTown).map((course: any) => <button key={course.id} className={`${game.selectedCourse === course.id ? "active" : ""} ${course.is_unlocked === false ? "locked" : ""}`} disabled={course.is_unlocked === false} onClick={() => { game.setSelectedCourse(course.id); game.playCyberSe("click"); }}><span>{difficulty(course.level_type)}</span><strong>{course.name}</strong><small>{course.is_first_cleared ? "クリア済" : `所要時間 ${clock(course.duration_seconds)}`}</small></button>)}</section>

      {activeCourse && <section className="quest-v2-brief">
        <header><div><span>{townName}</span><strong>{activeCourse.name}</strong></div><b>{difficulty(activeCourse.level_type)}</b></header>
        <div className="quest-v2-metrics"><span><small>所要時間</small><strong>{clock(activeCourse.duration_seconds)}</strong></span><span><small>スタミナ</small><strong>{activeCourse.cost_vitality}</strong></span><span><small>推奨総合力</small><strong>{Number(activeCourse.recommended_power || 0).toLocaleString()}</strong></span></div>
        <section className="quest-v2-enemies"><h3>出現する敵</h3><div>{(activeCourse.enemy_members || []).map((member: any, index: number) => { const master = CHARACTERS_MASTER.find((entry: any) => entry.id === member.characterId); return master ? <article key={`${member.characterId}-${index}`}><CharacterPresentation src={master.img?.startsWith("/characters/") ? master.img : `/characters/${String(master.img || "").replace(/^\//, "")}`} alt={master.jpName} variant="card" rarity={master.rarity} backgroundSrc={getCharacterLocationBackground(master.homeTown)} frameKind="character" metadata={false} /><strong>{master.jpName}</strong><span>{master.rarity} / {difficulty(activeCourse.level_type)}</span></article> : null; })}</div></section>
        <div className="tutorial-wire-rewards quest-v2-rewards" aria-label="獲得可能報酬"><span>PLAYER XP<br />+{Number(activeCourse.reward_xp || 0).toLocaleString()}</span><span>CASH<br />+{Number(activeCourse.reward_cash || 0).toLocaleString()}</span><span>アイテム<br />{formatItems(activeCourse.reward_items)}</span></div>
        {!activeCourse.is_first_cleared && <p className="quest-v2-first-clear">初回クリア：PLAYER XP +{Number(activeCourse.first_clear_user_exp || 0).toLocaleString()} / {formatItems(activeCourse.first_clear_items)}</p>}
        <h3 className="quest-v2-section-title">派遣する仲間 <span>1名</span></h3>
        <div className="quest-v2-character-grid">{(game.userCharactersDbList || []).map((record: any) => { const master = CHARACTERS_MASTER.find((entry: any) => entry.id === record.character_id); if (!master) return null; const deployed = (game.activePatrols || []).some((patrol: any) => patrol.characterId === record.character_id && patrol.status !== "COMPLETED"); return <button key={record.id} className={`${game.selectedPatrolMember === record.character_id ? "selected" : ""} ${deployed ? "deployed" : ""}`} disabled={deployed} onClick={() => game.togglePatrolMemberSelection(record.character_id)}><CharacterPresentation src={master.img?.startsWith("/characters/") ? master.img : `/characters/${String(master.img || "").replace(/^\//, "")}`} alt={master.jpName} variant="thumbnail" rarity={master.rarity} backgroundSrc={getCharacterLocationBackground(master.homeTown)} frameKind="character" metadata={false} /><strong>{master.jpName}</strong><span>{deployed ? "派遣中" : `Lv.${Number(record.level || 1)}`}</span></button>; })}</div>
        <OutlawButton variant="primary" fullWidth disabled={game.dispatchLoading || !game.selectedCourse || !game.selectedPatrolMember || Number(game.activePatrols?.length || 0) >= 5} isLoading={game.dispatchLoading} loadingLabel="派遣準備中…" onClick={() => void guarded(() => game.handleStartPatrol())}>{townName}へ派遣する</OutlawButton>
      </section>}

      <h2 className="quest-v2-progress-heading">進行中クエスト</h2>
      <div className="quest-v2-progress-list">{(game.activePatrols || []).length === 0 ? <p className="quest-v2-none">現在進行中のクエストはありません。</p> : (game.activePatrols || []).map((patrol: any) => {
        const course = (game.patrolCourses || []).find((entry: any) => entry.id === patrol.courseId);
        const character = CHARACTERS_MASTER.find((entry: any) => entry.id === patrol.characterId);
        const npc = (game.patrolNpcs || []).find((entry: any) => entry.quest_id === patrol.courseId);
        const complete = Number(patrol.secondsLeft || 0) <= 0;
        const unresolvedBattle = complete && patrol.has_battle_event && !patrol.battle_resolved && npc;
        const progress = Math.max(4, Math.min(100, ((Number(patrol.secondsTotal || 1) - Number(patrol.secondsLeft || 0)) / Number(patrol.secondsTotal || 1)) * 100));
        return <article className={`quest-v2-progress-card ${complete ? "is-complete" : ""}`} key={patrol.id}>
          <header><div><span>{complete ? "クエスト完了" : `${townName}へ派遣中`}</span><strong>{course?.name || "クエスト"}</strong></div><small>{difficulty(course?.level_type || "")}</small></header>
          <div className="quest-v2-progress-main">{character && <CharacterPresentation src={character.img?.startsWith("/characters/") ? character.img : `/characters/${String(character.img || "").replace(/^\//, "")}`} alt={character.jpName} variant="quest" rarity={character.rarity} backgroundSrc={getCharacterLocationBackground(character.homeTown)} frameKind="character" metadata={false} />}<div><strong>{character?.jpName || "派遣メンバー"}</strong><span>{complete ? "帰還しました" : `残り時間 ${clock(patrol.secondsLeft)}`}</span><div className="tutorial-wire-progress"><i style={{ width: `${progress}%` }} /></div></div></div>
          {unresolvedBattle ? <div className="quest-v2-encounter"><strong>バトル発生</strong><span>{npc.npc_name || "敵NPC"}</span><OutlawButton variant="primary" fullWidth disabled={battleStartingId === patrol.id || game.battleEncounterLocked} isLoading={battleStartingId === patrol.id} loadingLabel="バトル準備中…" onClick={() => void startBattle(patrol, npc)}>バトルへ</OutlawButton></div> : complete ? <OutlawButton variant="primary" fullWidth disabled={game.dispatchLoading} onClick={() => void guarded(() => game.handleClaimRewards(patrol.id))}>報酬を受け取る</OutlawButton> : <div className="quest-v2-speed-actions"><OutlawButton disabled={game.dispatchLoading} onClick={() => void guarded(() => game.handleInstantComplete("FREE_PREOPEN", patrol.id))}>無料時短</OutlawButton><OutlawButton variant="primary" disabled={game.dispatchLoading} onClick={() => void guarded(() => game.handleInstantComplete("DIAMOND", patrol.id))}>DIA時短</OutlawButton></div>}
        </article>;
      })}</div>
    </div>

    {game.showPatrolRewardModal && game.lastPatrolRewards && game.battleState === null && <CanonicalDialog title="クエスト結果" onClose={() => { game.setShowPatrolRewardModal(false); game.setLastPatrolRewards(null); }} actions={[{ label: "閉じる", semantic: "primary", onClick: () => { game.setShowPatrolRewardModal(false); game.setLastPatrolRewards(null); } }]}><div className="quest-v2-result"><span>{game.lastPatrolRewards.battleVictory ? "勝利" : "帰還完了"}</span><strong>{game.lastPatrolRewards.courseName}</strong><div className="tutorial-wire-rewards"><span>CASH<br />+{Number(game.lastPatrolRewards.totalCash || 0).toLocaleString()}</span><span>PLAYER XP<br />+{Number(game.lastPatrolRewards.totalXp || 0).toLocaleString()}</span>{game.lastPatrolRewards.dropItemName && <span>ITEM<br />{game.lastPatrolRewards.dropItemName} ×{game.lastPatrolRewards.dropItemQty}</span>}</div>{game.lastPatrolRewards.levelUpMessage && <p>{game.lastPatrolRewards.levelUpMessage}</p>}</div></CanonicalDialog>}
  </HubPage>;
}

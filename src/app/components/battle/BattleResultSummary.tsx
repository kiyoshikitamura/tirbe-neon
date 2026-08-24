"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAudio } from "@/audio/AudioProvider";
import { analyzeBattleResult, type BattleResultParticipant, type BattleResultReplayEvent } from "@/domain/presentation/battleResultScoring";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import type { BattleModeResultDetail, BattlePresentationContext } from "@/hooks/useBattle";

import OutlawButton from "../ui/OutlawButton";
import CharacterPresentation from "../character/CharacterPresentation";
import "./BattleResultSummary.css";

type Props = {
  victory: boolean;
  tutorial?: boolean;
  rewards?: any | null;
  replayEvents?: readonly BattleResultReplayEvent[];
  playerParticipants?: readonly any[];
  enemyParticipants?: readonly any[];
  presentationContext?: BattlePresentationContext | null;
  modeResult?: BattleModeResultDetail | null;
  onContinue: () => void | Promise<void>;
};

const toParticipant = (entry: any, isEnemy: boolean): BattleResultParticipant => ({
  id: String(entry.id),
  characterId: String(entry.characterId ?? entry.id),
  name: String(entry.name ?? entry.characterId ?? entry.id),
  isEnemy,
});

export default function BattleResultSummary({ victory, tutorial = false, rewards, replayEvents = [], playerParticipants = [], enemyParticipants = [], presentationContext, modeResult, onContinue }: Props) {
  const { playSe } = useAudio();
  const announcedRef = useRef(false);
  const analysis = useMemo(() => analyzeBattleResult(
    replayEvents,
    [...playerParticipants.map((entry) => toParticipant(entry, false)), ...enemyParticipants.map((entry) => toParticipant(entry, true))],
  ), [enemyParticipants, playerParticipants, replayEvents]);
  const mvp = analysis.mvp;
  const mvpMaster = CHARACTERS_MASTER.find((entry: any) => entry.id === mvp?.participant.characterId);
  const mvpImage = mvpMaster ? getCharacterTransparentImg(mvpMaster.name) : undefined;
  const opponentLeader = enemyParticipants.find((entry: any) => String(entry.characterId ?? entry.id) === presentationContext?.opponentLeaderCharacterId) || enemyParticipants[0];
  const opponentLabel = presentationContext?.encounterLabel || presentationContext?.opponentLabel || opponentLeader?.name || "OPPONENT";
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    playSe(victory ? "VICTORY" : "DEFEAT");
  }, [playSe, victory]);
  return (
    <section className={`battle-result-summary ${victory ? "is-victory" : "is-defeat"}`} aria-label={victory ? "バトル勝利" : "バトル敗北"}>
      <header className="battle-result-opponent">
        <small>{tutorial ? "QUEST COMPLETE · VS OPPONENT" : "VS OPPONENT"}</small>
        <strong>{opponentLabel}</strong>
        {presentationContext?.opponentLeaderName && <span>OPPONENT LEADER　{presentationContext.opponentLeaderName}</span>}
        {presentationContext?.opponentTotalPower ? <b>POWER {presentationContext.opponentTotalPower.toLocaleString()}</b> : presentationContext?.opponentProfile ? <b>{presentationContext.opponentProfile}</b> : null}
      </header>
      <div className="battle-result-outcome-label">{victory ? "WIN" : "LOSE"}</div>
      {modeResult?.resultLabel && <strong className="battle-result-mode-label">{modeResult.resultLabel}</strong>}
      {mvp && (
        <section className="battle-result-mvp" aria-label={`MVP ${mvp.participant.name} ${mvp.score.total}ポイント`}>
          <div className="battle-result-mvp-hero">
            {mvpImage && <CharacterPresentation src={mvpImage} alt={mvp.participant.name} variant="battle" />}
            <div className="battle-result-mvp-copy"><small>MVP</small><strong>{mvp.participant.name}</strong><b>{mvp.score.total}<i>PT</i></b></div>
          </div>
          <dl className="battle-result-score-grid" aria-label="MVPスコア内訳">
            <div><dt>与ダメージ</dt><dd><b>{mvp.score.damage}</b> / 40<small>{mvp.raw.damage.toLocaleString()}</small></dd></div>
            <div><dt>撃破</dt><dd><b>{mvp.score.kills}</b> / 20<small>{mvp.raw.kills}体</small></dd></div>
            <div><dt>回復</dt><dd><b>{mvp.score.heal}</b> / 20<small>{mvp.raw.heal.toLocaleString()}</small></dd></div>
            <div><dt>シールド</dt><dd><b>{mvp.score.shield}</b> / 15<small>{mvp.raw.shield.toLocaleString()}</small></dd></div>
            <div><dt>生存</dt><dd><b>{mvp.score.survival}</b> / 5<small>{mvp.raw.survived ? "生存" : "戦闘不能"}</small></dd></div>
          </dl>
        </section>
      )}
      {modeResult?.stats?.length ? <section className="battle-result-mode-stats" aria-label="モード戦績">
        {modeResult.stats.map((stat) => <div key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong></div>)}
      </section> : null}
      {mvp && (
        <section className="battle-result-comparison" aria-label="チーム戦果比較">
          <header><span>TEAM</span><b>戦果比較</b><span>ENEMY</span></header>
          <div><b>{analysis.player.damage.toLocaleString()}</b><span>総ダメージ</span><b>{analysis.enemy.damage.toLocaleString()}</b></div>
          <div><b>{analysis.player.kills}</b><span>撃破数</span><b>{analysis.enemy.kills}</b></div>
          <div><b>{analysis.player.survivors}</b><span>生存人数</span><b>{analysis.enemy.survivors}</b></div>
        </section>
      )}
      {victory && (tutorial || presentationContext?.mode === "PATROL") ? (
        rewards ? (
          <div className="battle-result-rewards" aria-label="獲得報酬">
            <span><small>CASH</small><b>+{Number(rewards.totalCash || 0).toLocaleString()}</b></span>
            <span><small>XP</small><b>+{Number(rewards.totalXp || 0).toLocaleString()}</b></span>
            {rewards.dropItemName && <span><small>ITEM</small><b>{rewards.dropItemName} ×{Number(rewards.dropItemQty || 0)}</b></span>}
          </div>
        ) : <div className="battle-result-settling" role="status"><span>報酬データを準備中</span><i aria-hidden="true" /></div>
      ) : (
        <div className="battle-result-mode-reward"><strong>{modeResult?.reward || (victory ? "勝利" : "敗北")}</strong>{modeResult?.note && <p>{modeResult.note}</p>}</div>
      )}
      <OutlawButton variant={victory ? "primary" : "secondary"} onClick={onContinue} className="battle-result-continue" disabled={victory && (tutorial || presentationContext?.mode === "PATROL") && !rewards}>
        {victory && (tutorial || presentationContext?.mode === "PATROL") ? (rewards ? "次へ" : "報酬確定中…") : modeResult?.continueLabel || "次へ"}
      </OutlawButton>
    </section>
  );
}

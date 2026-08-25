"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  continueControl?: ReactNode;
};

const toParticipant = (entry: any, isEnemy: boolean): BattleResultParticipant => ({
  id: String(entry.id),
  characterId: String(entry.characterId ?? entry.id),
  name: String(entry.name ?? entry.characterId ?? entry.id),
  isEnemy,
});

export default function BattleResultSummary({ victory, tutorial = false, rewards, replayEvents = [], playerParticipants = [], enemyParticipants = [], presentationContext, modeResult, onContinue, continueControl }: Props) {
  const { playSe } = useAudio();
  const announcedRef = useRef(false);
  const analysis = useMemo(() => analyzeBattleResult(
    replayEvents,
    [...playerParticipants.map((entry) => toParticipant(entry, false)), ...enemyParticipants.map((entry) => toParticipant(entry, true))],
  ), [enemyParticipants, playerParticipants, replayEvents]);
  const mvp = analysis.mvp;
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [displayedBreakdown, setDisplayedBreakdown] = useState({ damage: 0, kills: 0, heal: 0, shield: 0, survival: 0 });
  const mvpMaster = CHARACTERS_MASTER.find((entry: any) => entry.id === mvp?.participant.characterId);
  const mvpImage = mvpMaster ? getCharacterTransparentImg(mvpMaster.name) : undefined;
  const opponentLeader = enemyParticipants.find((entry: any) => String(entry.characterId ?? entry.id) === presentationContext?.opponentLeaderCharacterId) || enemyParticipants[0];
  const rawOpponentLabel = presentationContext?.encounterLabel || presentationContext?.opponentLabel || opponentLeader?.name || "対戦相手";
  const opponentLabel = rawOpponentLabel === "Canonical NPC Party" ? "新宿・初級" : rawOpponentLabel;
  const localizedResultLabel = tutorial
    ? (victory ? "クエストクリア" : "クエスト失敗")
    : modeResult?.resultLabel;
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    playSe(victory ? "VICTORY" : "DEFEAT");
  }, [playSe, victory]);
  useEffect(() => {
    if (!victory || (!rewards && !modeResult?.reward)) return;
    const timer = window.setTimeout(() => playSe("REWARD"), 1280);
    return () => window.clearTimeout(timer);
  }, [modeResult?.reward, playSe, rewards, victory]);
  useEffect(() => {
    const target = mvp?.score.total ?? 0;
    setDisplayedTotal(0);
    if (target <= 0) return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 420);
      setDisplayedTotal(Math.round(target * progress));
      if (progress >= 1) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [mvp?.participant.id, mvp?.score.total]);
  useEffect(() => {
    const target = mvp?.score;
    setDisplayedBreakdown({ damage: 0, kills: 0, heal: 0, shield: 0, survival: 0 });
    if (!target) return;
    const keys = ["damage", "kills", "heal", "shield", "survival"] as const;
    const startedAt = performance.now() + 520;
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      const next = { damage: 0, kills: 0, heal: 0, shield: 0, survival: 0 };
      keys.forEach((key, index) => {
        const progress = Math.max(0, Math.min(1, (now - startedAt - index * 90) / 180));
        next[key] = Math.round(target[key] * progress);
      });
      setDisplayedBreakdown(next);
      if (now < startedAt + (keys.length - 1) * 90 + 180) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [mvp?.participant.id, mvp?.score.damage, mvp?.score.heal, mvp?.score.kills, mvp?.score.shield, mvp?.score.survival]);
  return (
    <section className={`battle-result-summary ${victory ? "is-victory" : "is-defeat"}`} aria-label={victory ? "バトル勝利" : "バトル敗北"}>
      <header className="battle-result-opponent">
        <small>{tutorial ? "VS" : "VS 対戦相手"}</small>
        <strong>{opponentLabel}</strong>
        {presentationContext?.opponentLeaderName && <span>敵リーダー　{presentationContext.opponentLeaderName}</span>}
        {presentationContext?.opponentTotalPower ? <b>POWER {presentationContext.opponentTotalPower.toLocaleString()}</b> : presentationContext?.opponentProfile ? <b>{presentationContext.opponentProfile}</b> : null}
      </header>
      {!tutorial && <div className="battle-result-outcome-label">{victory ? "WIN" : "LOSE"}</div>}
      {localizedResultLabel && <strong className="battle-result-mode-label">{localizedResultLabel}</strong>}
      {mvp && (
        <section className="battle-result-mvp" aria-label={`MVP ${mvp.participant.name} ${mvp.score.total}ポイント`}>
          <div className="battle-result-mvp-hero">
            {mvpImage && <CharacterPresentation src={mvpImage} alt={mvp.participant.name} variant="dialogue-bust" className="battle-result-mvp-character" />}
            <div className="battle-result-mvp-copy"><small>MVP</small><div><strong>{mvp.participant.name}</strong><b>{displayedTotal}<i>PT</i></b></div></div>
          </div>
          <dl className="battle-result-score-grid" aria-label="MVPスコア内訳">
            <div><dt>与ダメージ</dt><dd><b>{displayedBreakdown.damage}</b> / 40<small>{mvp.raw.damage.toLocaleString()}</small></dd></div>
            <div><dt>撃破</dt><dd><b>{displayedBreakdown.kills}</b> / 20<small>{mvp.raw.kills}体</small></dd></div>
            <div><dt>回復</dt><dd><b>{displayedBreakdown.heal}</b> / 20<small>{mvp.raw.heal.toLocaleString()}</small></dd></div>
            <div><dt>シールド</dt><dd><b>{displayedBreakdown.shield}</b> / 15<small>{mvp.raw.shield.toLocaleString()}</small></dd></div>
            <div><dt>生存</dt><dd><b>{displayedBreakdown.survival}</b> / 5<small>{mvp.raw.survived ? "生存" : "戦闘不能"}</small></dd></div>
          </dl>
        </section>
      )}
      {modeResult?.stats?.length ? <section className="battle-result-mode-stats" aria-label="モード戦績">
        {modeResult.stats.map((stat) => <div key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong></div>)}
      </section> : null}
      {mvp && (
        <section className="battle-result-comparison" aria-label="チーム戦果比較">
          <header><span>味方</span><b>戦果比較</b><span>敵</span></header>
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
      {continueControl ?? <OutlawButton variant={victory ? "primary" : "secondary"} onClick={onContinue} className="battle-result-continue" disabled={victory && (tutorial || presentationContext?.mode === "PATROL") && !rewards}>
        {victory && (tutorial || presentationContext?.mode === "PATROL") ? (rewards ? "次へ" : "報酬確定中…") : modeResult?.continueLabel || "次へ"}
      </OutlawButton>}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAudio } from "@/audio/AudioProvider";
import { analyzeBattleResult, type BattleResultParticipant, type BattleResultReplayEvent } from "@/domain/presentation/battleResultScoring";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";

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
  onContinue: () => void | Promise<void>;
};

const toParticipant = (entry: any, isEnemy: boolean): BattleResultParticipant => ({
  id: String(entry.id),
  characterId: String(entry.characterId ?? entry.id),
  name: String(entry.name ?? entry.characterId ?? entry.id),
  isEnemy,
});

export default function BattleResultSummary({ victory, tutorial = false, rewards, replayEvents = [], playerParticipants = [], enemyParticipants = [], onContinue }: Props) {
  const { playSe } = useAudio();
  const announcedRef = useRef(false);
  const analysis = useMemo(() => analyzeBattleResult(
    replayEvents,
    [...playerParticipants.map((entry) => toParticipant(entry, false)), ...enemyParticipants.map((entry) => toParticipant(entry, true))],
  ), [enemyParticipants, playerParticipants, replayEvents]);
  const mvp = analysis.mvp;
  const mvpMaster = CHARACTERS_MASTER.find((entry: any) => entry.id === mvp?.participant.characterId);
  const mvpImage = mvpMaster ? getCharacterTransparentImg(mvpMaster.name) : undefined;
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    playSe(victory ? "VICTORY" : "DEFEAT");
  }, [playSe, victory]);
  return (
    <section className={`battle-result-summary ${victory ? "is-victory" : "is-defeat"}`} aria-label={victory ? "バトル勝利" : "バトル敗北"}>
      <small>{tutorial ? "QUEST COMPLETE" : "BATTLE COMPLETE"}</small>
      <strong>{tutorial ? "クエスト結果" : "バトル結果"}</strong>
      <div className="battle-result-outcome-label">{victory ? "WIN" : "LOSE"}</div>
      <span>{tutorial ? rewards?.courseName || "新宿・初級" : victory ? "勝利" : "敗北"}</span>
      {mvp && (
        <section className="battle-result-mvp" aria-label={`MVP ${mvp.participant.name} ${mvp.score.total}ポイント`}>
          <div className="battle-result-mvp-hero">
            {mvpImage && <CharacterPresentation src={mvpImage} alt={mvp.participant.name} variant="battle" />}
            <div><small>MVP</small><strong>{mvp.participant.name}</strong><b>{mvp.score.total}<i>pt</i></b></div>
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
      {mvp && (
        <section className="battle-result-comparison" aria-label="チーム戦果比較">
          <header><span>TEAM</span><b>戦果比較</b><span>ENEMY</span></header>
          <div><b>{analysis.player.damage.toLocaleString()}</b><span>総ダメージ</span><b>{analysis.enemy.damage.toLocaleString()}</b></div>
          <div><b>{analysis.player.kills}</b><span>撃破数</span><b>{analysis.enemy.kills}</b></div>
          <div><b>{analysis.player.survivors}</b><span>生存人数</span><b>{analysis.enemy.survivors}</b></div>
        </section>
      )}
      {tutorial && victory ? (
        rewards ? (
          <div className="battle-result-rewards" aria-label="獲得報酬">
            <span><small>CASH</small><b>+{Number(rewards.totalCash || 0).toLocaleString()}</b></span>
            <span><small>XP</small><b>+{Number(rewards.totalXp || 0).toLocaleString()}</b></span>
            {rewards.dropItemName && <span><small>ITEM</small><b>{rewards.dropItemName} ×{Number(rewards.dropItemQty || 0)}</b></span>}
          </div>
        ) : <div className="battle-result-settling" role="status"><span>報酬データを準備中</span><i aria-hidden="true" /></div>
      ) : (
        <p>{victory ? "バトルに勝利しました。" : "バトルに敗北しました。編成と強化を見直しましょう。"}</p>
      )}
      <OutlawButton variant={victory ? "primary" : "secondary"} onClick={onContinue} className="battle-result-continue" disabled={tutorial && victory && !rewards}>
        {tutorial && victory ? (rewards ? "次へ" : "報酬確定中…") : "次へ"}
      </OutlawButton>
    </section>
  );
}

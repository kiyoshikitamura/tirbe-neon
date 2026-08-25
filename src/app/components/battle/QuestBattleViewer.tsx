"use client";

import { useEffect, useRef, useState } from "react";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import BattleUnitPortrait, { BattleDamagePopup, BattleParticipantView } from "./BattleUnitPortrait";
import {
  BattleImpactEffect,
  BattleSkillCutIn,
  BattleSkillResolutionVfx,
  resolveBattleSkillPresentation,
  type BattleImpactKind,
} from "./BattleEffectPresentation";
import "./QuestBattleViewer.css";
import { useAudio } from "@/audio/AudioProvider";
import type { BattlePresentationPhase } from "@/hooks/useBattle";

type Participant = BattleParticipantView & {
  characterId?: string;
  isEnemy?: boolean;
};

type TimelineNode = { id: string; name: string; isEnemy?: boolean };

type Props = {
  battleMode: string;
  opponentName: string;
  playerParty: Participant[];
  enemyParty: Participant[];
  timeline: TimelineNode[];
  timelineIndex: number;
  authoritativeTimeline?: TimelineNode[];
  presentationPhase?: BattlePresentationPhase;
  round: number;
  skillCutIn: { charName: string; skillName: string } | null;
  targetLine: { fromId: string; toId: string } | null;
  shakingId: string | null;
  damagePopup: (BattleDamagePopup & { charId: string }) | null;
  tactic: string;
  speed: number;
  monthlyPassActive: boolean;
  paused: boolean;
  tutorial: boolean;
  onSpeedChange: (speed: number) => void;
  onPauseChange: (paused: boolean) => void;
  canSkip: boolean;
  skipPending: boolean;
  onSkip: () => void;
  onRetreat: () => void;
  onSound: () => void;
};

const advantageMap: Record<string, string> = {
  JUSTICE: "EVIL",
  EVIL: "ORDER",
  ORDER: "CHAOS",
  CHAOS: "JUSTICE",
};

const tacticLabel: Record<string, string> = {
  ATTACK_PRIORITY: "攻撃優先",
  HEAL_PRIORITY: "回復優先",
  SKILL_PRIORITY: "スキル優先",
  WEAKNESS_FOCUS: "弱点集中",
  BALANCED: "バランス",
};

export default function QuestBattleViewer(props: Props) {
  const { playSe } = useAudio();
  const allParticipants = [...props.playerParty, ...props.enemyParty];
  const activeTimelineNode = props.authoritativeTimeline?.[0] || props.timeline[props.timelineIndex] || props.timeline[0];
  const explicitActiveParticipant = allParticipants.find((entry) => entry.id === activeTimelineNode?.id);
  const activeParticipant = explicitActiveParticipant
    || (props.presentationPhase === "IDLE" ? props.playerParty[0] || props.enemyParty[0] : undefined);
  const targetId = props.damagePopup?.charId || props.targetLine?.toId;
  const targetParticipant = targetId ? allParticipants.find((entry) => entry.id === targetId) : undefined;

  const livingTimeline = props.timeline.filter((node) => !allParticipants.find((entry) => entry.id === node.id)?.isDead);
  const rawStart = livingTimeline.findIndex((node) => node.id === activeTimelineNode?.id);
  const start = rawStart < 0 ? 0 : rawStart;
  const timelinePreview = props.authoritativeTimeline?.length
    ? props.authoritativeTimeline.slice(0, props.tutorial ? 3 : 4)
    : livingTimeline.length === 0
      ? []
      : Array.from({ length: props.tutorial ? 3 : 4 }, (_, offset) => livingTimeline[(start + offset) % livingTimeline.length]);

  const sideOf = (participant?: Participant): "player" | "enemy" => participant?.isEnemy ? "enemy" : "player";
  const visualOf = (participant: Participant | undefined, side: "player" | "enemy") => {
    const master = CHARACTERS_MASTER.find((character: any) => character.id === participant?.characterId || character.name === participant?.characterId);
    return {
      src: master ? getCharacterTransparentImg(master.name) : undefined,
      placeholder: !master,
      rarity: master?.rarity ? String(master.rarity) : undefined,
      attribute: participant?.alignment || master?.alignment,
    };
  };
  const popupFor = (participant: Participant) => props.damagePopup?.charId === participant.id ? props.damagePopup : null;
  const hasAdvantage = (target?: Participant) => Boolean(
    activeParticipant?.alignment
      && target?.alignment
      && advantageMap[activeParticipant.alignment] === target.alignment,
  );

  const activeSide = sideOf(activeParticipant);
  const activeVisual = visualOf(activeParticipant, activeSide);
  const targetHasAdvantage = hasAdvantage(targetParticipant);
  const skillName = props.skillCutIn?.skillName || "通常攻撃";
  const isSkillAction = Boolean(props.skillCutIn && !/通常攻撃|ATTACK/i.test(skillName));
  const skillPresentation = resolveBattleSkillPresentation(props.skillCutIn, activeParticipant ? { ...activeParticipant, rarity: activeVisual.rarity } : undefined);
  const lastSkillCueRef = useRef<unknown>(null);
  const lastDamageCueRef = useRef<unknown>(null);
  const tutorialPaceRef = useRef({ normalSeen: false, skillSeen: false, advanced: false });
  const [showSpeedGuidance, setShowSpeedGuidance] = useState(false);
  useEffect(() => {
    if (!props.tutorial || props.presentationPhase !== "ACTION_HOLD") return;
    if (isSkillAction) tutorialPaceRef.current.skillSeen = true;
    else tutorialPaceRef.current.normalSeen = true;
    const pace = tutorialPaceRef.current;
    if (!pace.advanced && pace.normalSeen && pace.skillSeen) {
      pace.advanced = true;
      props.onSpeedChange(2);
      setShowSpeedGuidance(true);
      const timer = window.setTimeout(() => setShowSpeedGuidance(false), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [isSkillAction, props.onSpeedChange, props.presentationPhase, props.tutorial]);
  useEffect(() => {
    if (!props.skillCutIn || lastSkillCueRef.current === props.skillCutIn) return;
    lastSkillCueRef.current = props.skillCutIn;
    if (isSkillAction) playSe("BATTLE_SKILL");
    else if (skillPresentation?.impact === "slash") playSe("BATTLE_SLASH");
    else if (skillPresentation?.impact === "muzzle") playSe("BATTLE_GUN");
    else playSe("BATTLE_ATTACK");
  }, [isSkillAction, playSe, props.skillCutIn, skillPresentation?.impact]);
  useEffect(() => {
    if (!props.damagePopup || lastDamageCueRef.current === props.damagePopup) return;
    lastDamageCueRef.current = props.damagePopup;
    if (props.damagePopup.isCritical) playSe("BATTLE_CRITICAL");
    else if (targetHasAdvantage) playSe("BATTLE_WEAK");
    else if (props.damagePopup.type === "dmg") playSe("BATTLE_DAMAGE");
  }, [playSe, props.damagePopup, targetHasAdvantage]);
  const actionPhase = (props.presentationPhase || "IDLE").toLowerCase().replaceAll("_", "-");
  const acceptanceState = props.damagePopup
    ? (props.enemyParty.every((entry) => entry.isDead || entry.hp <= 0) ? "B5" : isSkillAction ? "B4" : "B3")
    : isSkillAction ? "B4" : "B3";
  const isFinalHit = acceptanceState === "B5";
  const roundLimit = props.battleMode === "RAID" ? 30 : props.battleMode === "PVP" || props.battleMode === "GVG" ? 20 : 15;

  return (
    <div className={`playing-container quest-battle-viewer ${props.tutorial ? "is-tutorial" : ""}`} data-battle-speed={props.speed} data-acceptance-state={props.tutorial ? acceptanceState : undefined} data-action-phase={actionPhase} data-action-kind={isSkillAction ? "skill" : "normal"} data-action-actor-id={activeParticipant?.id || ""} data-action-target-id={targetParticipant?.id || ""}>
      <header className="battle-viewer-header">
        <span>{props.battleMode === "PATROL" ? "QUEST BATTLE" : props.battleMode}</span>
        <strong>ROUND {props.round}<small> / {roundLimit}</small></strong>
        <i>AUTO</i>
      </header>

      <section className="battle-timeline" aria-label="行動順">
        {timelinePreview.map((node, index) => (
          <div key={`${node.id}-${index}`} className={`battle-timeline-slot ${node.isEnemy ? "is-enemy" : "is-player"} ${index === 0 ? "is-current" : ""}`}>
            <small>{index === 0 ? "CURRENT" : `NEXT ${index}`}</small>
            <strong>{node.name}</strong>
          </div>
        ))}
      </section>

      <main className="battle-roster-stage">
        <PartyZone side="player" label={`${props.playerParty.length} MEMBERS`} party={props.playerParty} activeId={activeParticipant?.id} targetId={targetParticipant?.id} shakingId={props.shakingId} visualOf={visualOf} popupFor={popupFor} hasAdvantage={hasAdvantage} tutorial={props.tutorial} />
        <section className={`battle-action-stage is-${activeSide}-actor is-phase-${actionPhase} ${isSkillAction ? "is-skill-action" : "is-normal-action"} ${isFinalHit ? "is-final-hit" : ""}`} aria-live="polite" aria-label={`${activeParticipant?.name || "ACTION"} ${isSkillAction ? skillName : "通常攻撃"} ${targetParticipant?.name || ""}`}>
          <div className="battle-action-relation" aria-hidden="true">
            <span>{activeParticipant?.name || "ACTOR"}</span><i /><b>{isSkillAction ? "SKILL" : "HIT"}</b><i /><span>{targetParticipant?.name || "TARGET"}</span>
          </div>
          {props.skillCutIn && isSkillAction && !skillPresentation?.tier && <div className="battle-skill-flash"><small>SKILL</small><strong>{props.skillCutIn.skillName}</strong></div>}
        </section>
        <PartyZone side="enemy" label={props.opponentName} party={props.enemyParty} activeId={activeParticipant?.id} targetId={targetParticipant?.id} shakingId={props.shakingId} visualOf={visualOf} popupFor={popupFor} hasAdvantage={hasAdvantage} tutorial={props.tutorial} />
        {isSkillAction && (props.presentationPhase === "TARGET_FOCUS" || props.presentationPhase === "ATTACK_MOTION") && <BattleSkillResolutionVfx presentation={skillPresentation} phase={props.presentationPhase} actorSide={activeSide} />}
        {props.damagePopup && <div className={`battle-target-impact-vfx is-${sideOf(targetParticipant)} is-${props.damagePopup.type}`} aria-hidden="true">
          {props.damagePopup.type === "dmg" && <BattleImpactEffect kind={(skillPresentation?.impact || "impact") as BattleImpactKind} speed={props.speed} />}
          <div className={`battle-impact-burst is-${props.damagePopup.type}`}><i /><i /><i /></div>
        </div>}
      </main>

      <BattleSkillCutIn presentation={skillPresentation} participant={activeParticipant ? { ...activeParticipant, rarity: activeVisual.rarity } : undefined} imageSrc={activeVisual.src} speed={props.speed} />
      {isFinalHit && <div className="battle-final-hit-overlay" role="status"><strong>FINAL HIT</strong><i /></div>}
      {showSpeedGuidance && <div className="battle-speed-guidance" role="status">ここからは2倍速で進むよ</div>}

      <footer className="battle-viewer-controls">
        <span className="battle-tactic-label">{tacticLabel[props.tactic] || tacticLabel.BALANCED}</span>
        <button
          className={`speed-toggle-btn active-scale-effect ${props.speed > 1 ? "active" : ""}`}
          onClick={() => {
            const nextSpeed = props.speed === 1 ? 2 : props.speed === 2 && props.monthlyPassActive ? 3 : 1;
            props.onSpeedChange(nextSpeed);
            props.onSound();
          }}
          title={props.monthlyPassActive ? "1倍・2倍・3倍速を切替" : "通常は1倍・2倍速。3倍速はVIPパス限定"}
        >
          {props.speed}x
        </button>
        <button className="pause-toggle-btn active-scale-effect" onClick={() => { props.onPauseChange(!props.paused); props.onSound(); }}>
          {props.paused ? "再開" : "一時停止"}
        </button>
        {props.canSkip && <button className="battle-skip-btn active-scale-effect" onClick={props.onSkip} disabled={props.skipPending} aria-busy={props.skipPending}>{props.skipPending ? "結果へ移動中" : "スキップ"}</button>}
        {!props.tutorial && <button className="battle-retreat-btn active-scale-effect" onClick={props.onRetreat}>撤退</button>}
      </footer>
    </div>
  );
}

type PartyZoneProps = {
  side: "player" | "enemy";
  label: string;
  party: Participant[];
  activeId?: string;
  targetId?: string;
  shakingId: string | null;
  visualOf: (participant: Participant, side: "player" | "enemy") => { src?: string; placeholder: boolean; rarity?: string; attribute?: string };
  popupFor: (participant: Participant) => (BattleDamagePopup & { charId: string }) | null;
  hasAdvantage: (participant: Participant) => boolean;
  tutorial: boolean;
};

function PartyZone({ side, label, party, activeId, targetId, shakingId, visualOf, popupFor, hasAdvantage, tutorial }: PartyZoneProps) {
  return (
    <section className={`battle-party-zone is-${side} ${tutorial ? "is-tutorial-party" : ""}`} data-party-size={Math.max(1, Math.min(5, party.length))} aria-label={side === "enemy" ? "敵パーティ" : "味方パーティ"}>
      <div className="battle-party-label"><span>{side === "enemy" ? "ENEMY" : "YOUR TEAM"}</span><strong>{label}</strong></div>
      <div className="battle-party-grid">
        {party.map((participant) => {
          const visual = visualOf(participant, side);
          return (
            <div key={participant.id} className={shakingId === participant.id ? "shake" : ""}>
              <BattleUnitPortrait
                participant={participant}
                imageSrc={visual.src}
                side={side}
                domId={participant.id}
                actor={activeId === participant.id}
                target={targetId === participant.id}
                placeholderAsset={visual.placeholder}
                popup={popupFor(participant)}
                advantage={hasAdvantage(participant)}
                rarity={visual.rarity}
                attribute={visual.attribute}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

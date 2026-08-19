"use client";

import { useEffect, useRef } from "react";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import BattleUnitPortrait, { BattleDamagePopup, BattleParticipantView } from "./BattleUnitPortrait";
import {
  BattleImpactEffect,
  BattleSkillCutIn,
  resolveBattleSkillPresentation,
  type BattleImpactKind,
} from "./BattleEffectPresentation";
import "./QuestBattleViewer.css";
import { useAudio } from "@/audio/AudioProvider";

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
  const activeTimelineNode = props.timeline[props.timelineIndex] || props.timeline[0];
  const activeParticipant = allParticipants.find((entry) => entry.id === activeTimelineNode?.id)
    || props.playerParty[0]
    || props.enemyParty[0];
  const targetId = props.damagePopup?.charId || props.targetLine?.toId;
  const targetParticipant = allParticipants.find((entry) => entry.id === targetId)
    || (activeParticipant?.isEnemy
      ? props.playerParty.find((entry) => !entry.isDead)
      : props.enemyParty.find((entry) => !entry.isDead));

  const livingTimeline = props.timeline.filter((node) => !allParticipants.find((entry) => entry.id === node.id)?.isDead);
  const rawStart = livingTimeline.findIndex((node) => node.id === activeTimelineNode?.id);
  const start = rawStart < 0 ? 0 : rawStart;
  const timelinePreview = livingTimeline.length === 0
    ? []
    : Array.from({ length: 4 }, (_, offset) => livingTimeline[(start + offset) % livingTimeline.length]);

  const sideOf = (participant?: Participant): "player" | "enemy" => participant?.isEnemy ? "enemy" : "player";
  const visualOf = (participant: Participant | undefined, side: "player" | "enemy") => {
    const master = CHARACTERS_MASTER.find((character: any) => character.id === participant?.characterId || character.name === participant?.characterId);
    return {
      src: master ? getCharacterTransparentImg(master.name) : undefined,
      placeholder: !master,
    };
  };
  const popupFor = (participant: Participant) => props.damagePopup?.charId === participant.id ? props.damagePopup : null;
  const hasAdvantage = (target?: Participant) => Boolean(
    activeParticipant?.alignment
      && target?.alignment
      && advantageMap[activeParticipant.alignment] === target.alignment,
  );

  const activeSide = sideOf(activeParticipant);
  const targetSide = sideOf(targetParticipant);
  const activeVisual = visualOf(activeParticipant, activeSide);
  const targetVisual = visualOf(targetParticipant, targetSide);
  const targetHasAdvantage = hasAdvantage(targetParticipant);
  const skillName = props.skillCutIn?.skillName || "通常攻撃";
  const isSkillAction = Boolean(props.skillCutIn && !/通常攻撃|ATTACK/i.test(skillName));
  const skillPresentation = resolveBattleSkillPresentation(props.skillCutIn, activeParticipant);
  const lastSkillCueRef = useRef<unknown>(null);
  const lastDamageCueRef = useRef<unknown>(null);
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
  const actionPhase = props.damagePopup ? "impact" : props.targetLine ? (isSkillAction ? "skill" : "attack") : "actor";
  const acceptanceState = props.damagePopup
    ? (props.enemyParty.every((entry) => entry.isDead || entry.hp <= 0) ? "B5" : isSkillAction ? "B4" : "B3")
    : isSkillAction ? "B4" : "B3";
  const isFinalHit = acceptanceState === "B5";
  const roundLimit = props.battleMode === "RAID" ? 30 : props.battleMode === "PVP" || props.battleMode === "GVG" ? 20 : 15;

  return (
    <div className={`playing-container quest-battle-viewer ${props.tutorial ? "is-tutorial" : ""}`} data-battle-speed={props.speed} data-acceptance-state={props.tutorial ? acceptanceState : undefined}>
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

      <PartyZone
        side="enemy"
        label={props.opponentName}
        party={props.enemyParty}
        activeId={activeParticipant?.id}
        targetId={targetParticipant?.id}
        shakingId={props.shakingId}
        visualOf={visualOf}
        popupFor={popupFor}
        hasAdvantage={hasAdvantage}
      />

      <section className={`battle-action-stage is-${activeSide}-actor is-phase-${actionPhase} ${isSkillAction ? "is-skill-action" : "is-normal-action"} ${isFinalHit ? "is-final-hit" : ""}`} aria-live="polite">
        <div className="battle-action-copy">
          <span>{isSkillAction ? "SKILL" : "ACTION"} / {activeParticipant?.name || "ACTION"}</span>
          <strong>{skillName}</strong>
        </div>
        <div className="battle-action-sequence" aria-label="行動進行">
          <span className="is-active">ACTOR</span><i>›</i>
          <span className={actionPhase !== "actor" ? "is-active" : ""}>{isSkillAction ? "SKILL" : "ATTACK"}</span><i>›</i>
          <span className={props.targetLine || props.damagePopup ? "is-active" : ""}>TARGET</span><i>›</i>
          <span className={actionPhase === "impact" ? "is-active" : ""}>IMPACT</span>
        </div>
        <div className="battle-action-units">
          {activeParticipant && (
            <BattleUnitPortrait participant={activeParticipant} imageSrc={activeVisual.src} side={activeSide} frame="action" actor placeholderAsset={activeVisual.placeholder} />
          )}
          <div className="battle-action-impact" aria-hidden="true"><i /><strong>VS</strong><i /></div>
          {targetParticipant && (
            <BattleUnitPortrait
              participant={targetParticipant}
              imageSrc={targetVisual.src}
              side={targetSide}
              frame="action"
              target
              placeholderAsset={targetVisual.placeholder}
              popup={popupFor(targetParticipant)}
              advantage={hasAdvantage(targetParticipant)}
            />
          )}
        </div>
        {props.damagePopup && props.damagePopup.type === "dmg" && <BattleImpactEffect kind={(skillPresentation?.impact || "impact") as BattleImpactKind} speed={props.speed} />}
        {props.damagePopup && <div className={`battle-impact-burst is-${props.damagePopup.type}`} aria-hidden="true"><i /><i /><i /></div>}
        <BattleSkillCutIn
          presentation={skillPresentation}
          participant={activeParticipant}
          imageSrc={activeVisual.src}
          speed={props.speed}
        />
        {props.skillCutIn && !skillPresentation?.tier && <div className="battle-skill-flash"><small>{isSkillAction ? "SKILL" : "ATTACK"}</small><strong>{props.skillCutIn.skillName}</strong></div>}
      </section>

      <PartyZone
        side="player"
        label={`${props.playerParty.length} MEMBERS`}
        party={props.playerParty}
        activeId={activeParticipant?.id}
        targetId={targetParticipant?.id}
        shakingId={props.shakingId}
        visualOf={visualOf}
        popupFor={popupFor}
        hasAdvantage={hasAdvantage}
      />

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
  visualOf: (participant: Participant, side: "player" | "enemy") => { src?: string; placeholder: boolean };
  popupFor: (participant: Participant) => (BattleDamagePopup & { charId: string }) | null;
  hasAdvantage: (participant: Participant) => boolean;
};

function PartyZone({ side, label, party, activeId, targetId, shakingId, visualOf, popupFor, hasAdvantage }: PartyZoneProps) {
  return (
    <section className={`battle-party-zone is-${side}`} aria-label={side === "enemy" ? "敵パーティ" : "味方パーティ"}>
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
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

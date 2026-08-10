"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

type GvgMatch = {
  id: string;
  status: "MATCHING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  scheduled_start_at: string;
  scheduled_end_at: string;
  guild_a_id: string;
  guild_b_id: string | null;
  npc_guild_name: string | null;
  guild_a_phase: number;
  guild_b_phase: number;
  guild_a_phase_hp: number;
  guild_b_phase_hp: number;
  guild_a_phase_max_hp: number;
  guild_b_phase_max_hp: number;
  guild_a_collapses: number;
  guild_b_collapses: number;
};

function formatRemaining(endAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(endAt).getTime() - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days > 0 ? `${days}日 ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function GvgMatchStatusPanel({ guildId, onStartAttack }: { guildId?: string; onStartAttack?: (matchId: string) => Promise<void> | void }) {
  const [match, setMatch] = useState<GvgMatch | null>(null);
  const [personalRawDamage, setPersonalRawDamage] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [isStartingAttack, setIsStartingAttack] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    const load = async () => {
      const { data } = await supabase.from("gvg_match_sessions").select("*")
        .or(`guild_a_id.eq.${guildId},guild_b_id.eq.${guildId}`)
        .in("status", ["MATCHING", "CONFIRMED", "ACTIVE"])
        .order("scheduled_start_at", { ascending: true }).limit(1).maybeSingle();
      setMatch(data as GvgMatch | null);
      if (data?.id) {
        const { data: logs } = await supabase.from("gvg_attack_logs")
          .select("raw_damage").eq("match_session_id", data.id).neq("battle_result", "PENDING");
        setPersonalRawDamage((logs || []).reduce((total: number, log: { raw_damage: number }) => total + Number(log.raw_damage || 0), 0));
      } else {
        setPersonalRawDamage(0);
      }
    };
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refreshTimer = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(refreshTimer);
    };
  }, [guildId]);

  if (!guildId) return null;
  if (!match) {
    return (
      <section className="hud-panel gvg-match-card p-3 flex-col-gap-1">
        <span className="font-size-9 font-weight-bold text-color-cyan">公式GvGマッチ</span>
        <span className="font-size-8 text-secondary">現在参加できる公式マッチはありません。マッチングの開始をお待ちください。</span>
      </section>
    );
  }
  const isA = match.guild_a_id === guildId;
  const myHp = isA ? match.guild_a_phase_hp : match.guild_b_phase_hp;
  const myMax = isA ? match.guild_a_phase_max_hp : match.guild_b_phase_max_hp;
  const enemyHp = isA ? match.guild_b_phase_hp : match.guild_a_phase_hp;
  const enemyMax = isA ? match.guild_b_phase_max_hp : match.guild_a_phase_max_hp;
  const myCollapses = isA ? match.guild_a_collapses : match.guild_b_collapses;
  const enemyCollapses = isA ? match.guild_b_collapses : match.guild_a_collapses;
  const enemyLabel = match.guild_b_id ? "対戦ギルド" : (match.npc_guild_name || "NPCギルド");

  return (
    <section className="hud-panel gvg-match-card p-3 flex-col-gap-2">
      <div className="gvg-match-header">
        <span className="font-size-9 font-weight-bold text-color-cyan">公式GvGマッチ</span>
        <span className="gvg-match-remaining">{match.status === "ACTIVE" ? `残り ${formatRemaining(match.scheduled_end_at, now ?? new Date(match.scheduled_end_at).getTime())}` : match.status}</span>
      </div>
      <div className="gvg-match-opponent"><small>対戦相手</small><strong>{enemyLabel}</strong></div>
      <div className="gvg-army-grid">
        <div><small>自軍HP</small><strong>{myHp.toLocaleString()}<i> / {myMax.toLocaleString()}</i></strong><span>陥落 {myCollapses}/2</span></div>
        <div className="enemy"><small>相手HP</small><strong>{enemyHp.toLocaleString()}<i> / {enemyMax.toLocaleString()}</i></strong><span>陥落 {enemyCollapses}/2</span></div>
      </div>
      <div className="gvg-contribution">あなたの貢献ダメージ <strong>{personalRawDamage.toLocaleString()}</strong></div>
      {match.status === "ACTIVE" && onStartAttack && (
        <button
          type="button"
          className="sub-btn border-cyan text-color-cyan height-26 px-4 font-size-8 font-weight-bold active-scale-effect"
          disabled={isStartingAttack}
          onClick={() => {
            setIsStartingAttack(true);
            void Promise.resolve(onStartAttack(match.id)).finally(() => setIsStartingAttack(false));
          }}
        >
          {isStartingAttack ? "侵攻準備中..." : "公式マッチへ侵攻（20 AP）"}
        </button>
      )}
      {match.status === "ACTIVE" && !onStartAttack && (
        <button type="button" className="sub-btn border-subtle height-26 px-4 font-size-8 font-weight-bold" disabled>
          バトル画面は後工程
        </button>
      )}
    </section>
  );
}

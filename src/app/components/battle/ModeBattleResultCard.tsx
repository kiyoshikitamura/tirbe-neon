"use client";

import "./ModeBattleResultCard.css";

type Stat = { label: string; value: string };
type Props = { mode: "PVP" | "RAID"; victory: boolean; opponent: string; stats: Stat[]; reward?: string; note?: string };

export default function ModeBattleResultCard({ mode, victory, opponent, stats, reward, note }: Props) {
  return <section className={`mode-result-card is-${victory ? "win" : "lose"}`}>
    <small>{mode} RESULT</small>
    <strong>{victory ? "WIN" : "LOSE"}</strong>
    <p>VS {opponent || (mode === "RAID" ? "RAID BOSS" : "対戦相手")}</p>
    <div className="mode-result-stats">{stats.map((stat) => <span key={stat.label}><small>{stat.label}</small><b>{stat.value}</b></span>)}</div>
    {reward && <div className="mode-result-reward"><span>REWARD</span><strong>{reward}</strong></div>}
    {note && <p className="mode-result-note">{note}</p>}
  </section>;
}

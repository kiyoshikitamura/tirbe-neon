"use client";

import CanonicalDialog from "../ui/CanonicalDialog";
import CanonicalItemIcon from "../ui/CanonicalItemIcon";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";
import { rankingRewardSections, type RankingRewardCategory, type RankingRewardPeriod } from "@/domain/ranking/rankingRewardPresentation";
import "./RankingRewardDialog.css";

const rankLabel = (from: number, to: number) => from === to ? `${from}位` : `${from}〜${to}位`;

export default function RankingRewardDialog({ category, period, onClose }: { category: RankingRewardCategory; period: RankingRewardPeriod; onClose: () => void }) {
  const sections = rankingRewardSections(category, period);
  return <CanonicalDialog title="ランキング報酬" ariaLabel="ランキング報酬確認" onClose={onClose} actions={[{ label: "閉じる", onClick: onClose }]}> 
    {sections.length === 0 ? <p className="ranking-reward-empty">報酬定義なし</p> : <div className="ranking-reward-sections">
      {sections.map((rewardSection) => <section key={rewardSection.title}>
        <header><strong>{rewardSection.title}</strong><span>{rewardSection.cadence === "MONTHLY" ? "月次" : "週次"}</span></header>
        <div className="ranking-reward-tiers">{rewardSection.tiers.map((tier) => <div key={`${tier.from}-${tier.to}-${tier.itemId}`} className="ranking-reward-tier">
          <strong>{rankLabel(tier.from, tier.to)}</strong><CanonicalItemIcon itemId={tier.itemId} alt={canonicalItemName(tier.itemId)} fallback="券" /><span>{canonicalItemName(tier.itemId)}</span><b>×{tier.quantity}</b>
        </div>)}</div>
      </section>)}
    </div>}
  </CanonicalDialog>;
}

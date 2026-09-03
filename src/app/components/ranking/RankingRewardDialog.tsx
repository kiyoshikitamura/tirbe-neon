"use client";

import CanonicalDialog from "../ui/CanonicalDialog";
import CanonicalItemIcon from "../ui/CanonicalItemIcon";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";
import {
  rankingRewardSections,
  rankingRewardSectionsFromPayload,
  type RankingRewardCategory,
  type RankingRewardMasterPayload,
  type RankingRewardPeriod,
} from "@/domain/ranking/rankingRewardPresentation";
import "./RankingRewardDialog.css";

const rankLabel = (from: number, to: number) => from === to ? `${from}位` : `${from}〜${to}位`;

export default function RankingRewardDialog({ category, period, master, loading = false, onClose }: { category: RankingRewardCategory; period: RankingRewardPeriod; master?: RankingRewardMasterPayload | null; loading?: boolean; onClose: () => void }) {
  const sections = master === undefined ? rankingRewardSections(category, period) : rankingRewardSectionsFromPayload(master, category, period);
  return <CanonicalDialog title="ランキング報酬" ariaLabel="ランキング報酬確認" onClose={onClose} loading={loading} actions={[{ label: "閉じる", onClick: onClose, disabled: loading }]}>
    {loading ? <span className="spinner" role="status" aria-label="報酬情報を取得中" /> : sections.length === 0 ? <p className="ranking-reward-empty">報酬定義なし</p> : <div className="ranking-reward-sections">
      {sections.map((rewardSection) => <section key={rewardSection.title}>
        <header><strong>{rewardSection.title}</strong><span>{rewardSection.cadence === "MONTHLY" ? "月次" : rewardSection.cadence === "WEEKLY" ? "週次" : "日次"}</span></header>
        <div className="ranking-reward-tiers">{rewardSection.tiers.map((tier) => <div key={`${tier.from}-${tier.to}-${tier.itemId}`} className="ranking-reward-tier">
          <strong>{rankLabel(tier.from, tier.to)}</strong><CanonicalItemIcon itemId={tier.itemId} alt={canonicalItemName(tier.itemId)} fallback="券" /><span>{canonicalItemName(tier.itemId)}</span><b>×{tier.quantity}</b>
        </div>)}</div>
      </section>)}
    </div>}
  </CanonicalDialog>;
}

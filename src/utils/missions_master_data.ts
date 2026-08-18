export const MISSIONS_MASTER_DATA = [
  {
    id: "m_guild_join_01",
    trigger_type: "GUILD_JOIN",
    title: "ギルドに加入する",
    description: "ギルドに加入して仲間と協力しよう",
    target_count: 1,
    reward_type: "NORMAL_GACHA_TICKET",
    reward_amount: 3
  },
  {
    id: "m_raid_clear_01",
    trigger_type: "RAID_CLEAR",
    title: "レイドに参加 (1回)",
    description: "レイドボスとの戦闘に1回参加する",
    target_count: 1,
    reward_type: "CASH",
    reward_amount: 5000
  },
  {
    id: "m_raid_clear_05",
    trigger_type: "RAID_CLEAR",
    title: "レイドに参加 (5回)",
    description: "レイドボスとの戦闘に5回参加する",
    target_count: 5,
    reward_type: "NORMAL_GACHA_TICKET",
    reward_amount: 1
  },
  {
    id: "m_gacha_pull_10",
    trigger_type: "GACHA_PULL",
    title: "ガチャを引く (10回)",
    description: "種類を問わずガチャを10回引く",
    target_count: 10,
    reward_type: "DIAMOND",
    reward_amount: 100
  }
];

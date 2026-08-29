export type HomeActionPresentationId = "guild" | "fight" | "conquest" | "war";

export type HomeActionPresentationSlot = Readonly<{
  id: HomeActionPresentationId;
  label: string;
  destination: "guild" | "pvp" | "patrol" | null;
  assetPath: string;
  deliveryStatus: "EXISTING_FALLBACK" | "PRODUCTION_DELIVERED";
  exposure: "ACTIVE" | "UPCOMING";
}>;

// Canonical Home FA four-piece Night Spot Emblem set. Internal ids and routes
// intentionally remain stable; only the player-facing presentation changed.
export const HOME_ACTION_PRESENTATION_SLOTS: readonly HomeActionPresentationSlot[] = [
  { id: "guild", label: "ギルド / GUILD", destination: "guild", assetPath: "/menu/home_main_guild.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "ACTIVE" },
  { id: "fight", label: "バトル / PvP", destination: "pvp", assetPath: "/menu/home_main_battle_pvp.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "ACTIVE" },
  { id: "conquest", label: "クエスト / QUEST", destination: "patrol", assetPath: "/menu/home_main_quest.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "ACTIVE" },
  { id: "war", label: "ギルドバトル / GvG", destination: null, assetPath: "/menu/home_main_guild_battle_gvg.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "UPCOMING" },
] as const;

export type HomeActionPresentationId = "guild" | "fight" | "conquest" | "war";

export type HomeActionPresentationSlot = Readonly<{
  id: HomeActionPresentationId;
  label: string;
  destination: "guild" | "pvp" | "patrol" | null;
  assetPath: string;
  deliveryStatus: "EXISTING_FALLBACK" | "PRODUCTION_DELIVERED";
  exposure: "ACTIVE" | "UPCOMING";
}>;

// Canonical Home FA transparent navigation set. Internal ids and routes remain
// stable; the supplied 2026-08-30 assets contain artwork only, so labels and
// state badges stay in the frontend presentation layer.
export const HOME_ACTION_PRESENTATION_SLOTS: readonly HomeActionPresentationSlot[] = [
  { id: "guild", label: "ギルド", destination: "guild", assetPath: "/menu/home_nav_guild.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "ACTIVE" },
  { id: "fight", label: "バトル", destination: "pvp", assetPath: "/menu/home_nav_pvp.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "ACTIVE" },
  { id: "conquest", label: "クエスト", destination: "patrol", assetPath: "/menu/home_nav_quest.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "ACTIVE" },
  { id: "war", label: "ギルドバトル", destination: null, assetPath: "/menu/home_nav_gvg.png", deliveryStatus: "PRODUCTION_DELIVERED", exposure: "UPCOMING" },
] as const;

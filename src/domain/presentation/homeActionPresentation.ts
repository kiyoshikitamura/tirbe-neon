export type HomeActionPresentationId = "guild" | "fight" | "conquest" | "war";

export type HomeActionPresentationSlot = Readonly<{
  id: HomeActionPresentationId;
  label: string;
  destination: "guild" | "pvp" | "patrol" | null;
  assetPath: string;
  deliveryStatus: "EXISTING_FALLBACK" | "PRODUCTION_DELIVERED";
  exposure: "ACTIVE" | "UPCOMING";
}>;

// A matched four-piece Home Action set is delivered on a separate asset line.
// Until its filenames are authoritative, reuse only the artwork already in the
// repository. Generated or provisional assets must not enter the active path.
export const HOME_ACTION_PRESENTATION_SLOTS: readonly HomeActionPresentationSlot[] = [
  { id: "guild", label: "連合", destination: "guild", assetPath: "/menu/menu_allies.png", deliveryStatus: "EXISTING_FALLBACK", exposure: "ACTIVE" },
  { id: "fight", label: "喧嘩", destination: "pvp", assetPath: "/menu/menu_fight.png", deliveryStatus: "EXISTING_FALLBACK", exposure: "ACTIVE" },
  { id: "conquest", label: "制圧", destination: "patrol", assetPath: "/menu/menu_conquest.png", deliveryStatus: "EXISTING_FALLBACK", exposure: "ACTIVE" },
  { id: "war", label: "抗争", destination: null, assetPath: "/menu/menu_war.png", deliveryStatus: "EXISTING_FALLBACK", exposure: "UPCOMING" },
] as const;

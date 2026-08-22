import source from "./data/operations_feature_state_20260823.json" with { type: "json" };

export type OperationsFeatureState = "OPEN" | "CLOSED" | "MAINTENANCE";
export type OperationsFeatureKey = typeof source.features[number]["featureKey"];
export type OperationsStateMap = Record<OperationsFeatureKey, OperationsFeatureState>;

export const OPERATIONS_FEATURES = source.features;
export const OPERATIONS_MAINTENANCE = source.maintenance;
export const DEFAULT_OPERATIONS_STATE = Object.fromEntries(
  source.features.map((feature) => [feature.featureKey, feature.state]),
) as OperationsStateMap;

const TAB_FEATURE: Record<string, OperationsFeatureKey> = {
  home: "HOME", patrol: "QUEST", quest: "QUEST", pvp: "PVP", raid: "RAID",
  gacha: "NORMAL_GACHA", guild: "GUILD", character: "CHARACTER", bag: "BAG",
  ranking: "RANKING", friend: "FRIEND", friends: "FRIEND", shop: "SHOP", gvg: "GVG",
};

export function featureState(featureKey: OperationsFeatureKey, states: Partial<OperationsStateMap> = DEFAULT_OPERATIONS_STATE) {
  return states[featureKey] ?? DEFAULT_OPERATIONS_STATE[featureKey];
}

export function isFeatureOpen(featureKey: OperationsFeatureKey, states: Partial<OperationsStateMap> = DEFAULT_OPERATIONS_STATE) {
  return featureState(featureKey, states) === "OPEN";
}

export function isMaintenanceEnabled(states: Partial<OperationsStateMap> = DEFAULT_OPERATIONS_STATE) {
  return featureState("MAINTENANCE", states) === "MAINTENANCE";
}

export function sanitizeOperationsTab(tab: string, states: Partial<OperationsStateMap> = DEFAULT_OPERATIONS_STATE) {
  const normalized = tab === "quest" ? "patrol" : tab;
  const feature = TAB_FEATURE[normalized];
  if (!feature) return ["menu", "avatar", "bbs"].includes(normalized) ? normalized : "home";
  return isFeatureOpen(feature, states) ? normalized : "home";
}

export function isDestinationAvailable(destination: string | null | undefined, states: Partial<OperationsStateMap> = DEFAULT_OPERATIONS_STATE) {
  if (!destination) return false;
  const [tab, subTab] = destination.split(":");
  if (sanitizeOperationsTab(tab, states) !== (tab === "quest" ? "patrol" : tab)) return false;
  if (tab === "gacha" && subTab?.toLowerCase().includes("special")) return isFeatureOpen("SPECIAL_GACHA", states);
  return true;
}

export function mergeServerOperationsState(rows: Array<{ feature_key: string; state: string }> | null | undefined) {
  const result = { ...DEFAULT_OPERATIONS_STATE };
  for (const row of rows ?? []) {
    if (row.feature_key in result && ["OPEN", "CLOSED", "MAINTENANCE"].includes(row.state)) {
      result[row.feature_key as OperationsFeatureKey] = row.state as OperationsFeatureState;
    }
  }
  return result;
}

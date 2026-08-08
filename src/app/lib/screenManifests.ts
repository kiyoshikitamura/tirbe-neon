import { AssetRequest } from "./screenAssets";

const FRAME_ASSETS = [
  "/frames/sq_n.png", "/frames/sq_r.png", "/frames/sq_sr.png", "/frames/sq_ssr.png",
  "/frames/card_n.png", "/frames/card_r.png", "/frames/card_sr.png", "/frames/card_ssr.png",
];

const COMMON_SHELL_ASSETS = [
  "/ui/icon_cash.png", "/ui/icon_dia.png",
  "/ui/icon_footer_character.png", "/ui/icon_footer_gacha.png", "/ui/icon_footer_guild.png", "/ui/icon_footer_mypage.png", "/ui/icon_footer_shop.png",
];

const HOME_ASSETS = [
  "/bg/bg_base_neontower.png", "/bg/bg_base_deepdock.png", "/bg/bg_base_junkbazaar.png", "/bg/bg_base_kitakuragate.png",
  "/characters/reiji_transparent_asset.png", "/characters/rui_transparent_asset.png", "/characters/chang_transparent_asset.png",
  "/menu/menu_allies.png", "/menu/menu_fight.png", "/menu/menu_conquest.png", "/menu/menu_war.png",
  "/gacha/bg_gacha_ssr.png", "/gacha/bg_gacha_sr.png", "/gacha/bg_gacha_normal.png",
  "/ui/icon_bag.png", "/ui/icon_community.png", "/ui/icon_friends.png", "/ui/icon_map.png", "/ui/icon_mission.png",
  "/ui/icon_news.png", "/ui/icon_present.png", "/ui/icon_raid.png", "/ui/icon_ranking.png", "/ui/icon_settings.png",
];

function optionalAssets(paths: string[]): AssetRequest[] {
  return paths.map((src) => ({ src, required: false }));
}

export const SCREEN_ASSET_MANIFESTS = {
  commonShell: optionalAssets([...FRAME_ASSETS, ...COMMON_SHELL_ASSETS]),
  home: optionalAssets([...FRAME_ASSETS, ...COMMON_SHELL_ASSETS, ...HOME_ASSETS]),
} as const;

export const HOME_BOOT_ASSETS = SCREEN_ASSET_MANIFESTS.home.map((asset) => asset.src);

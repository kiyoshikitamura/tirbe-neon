import React, { useState, memo } from "react";
import AttributeBadge, { AttributeType } from "./AttributeBadge";

export interface CardIconProps {
  rarity?: string;
  img?: string;
  jpName?: string;
  name?: string;
  attribute?: AttributeType;
  alignment?: string;
  size?: number; // width in px
  height?: number; // height in px (for battle slim)
  mode?: "square" | "battle_slim";
  showBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const CardIcon: React.FC<CardIconProps> = memo(({
  rarity = "N",
  img = "/characters/reiji_transparent_asset.png",
  jpName,
  name,
  attribute,
  alignment,
  size = 96,
  height,
  mode = "square",
  showBadge = true,
  className = "",
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const normRarity = (rarity || "N").toLowerCase();

  // 本番フレーム枠パス
  const framePath = mode === "battle_slim"
    ? `/frames/card_${normRarity}.png`
    : `/frames/sq_${normRarity}.png`;

  const calcHeight = height || (mode === "battle_slim" ? size * 2 : size);

  // Production attribute badges use the canonical alignment contract.
  const attrKey = attribute || alignment || "JUSTICE";

  // 左上属性オーブバッジのサイズ算出 (カード幅に対する比率)
  const badgeSize = Math.max(16, Math.floor(size * 0.28));

  return (
    <div
      className={`relative select-none inline-block overflow-hidden active-scale-effect cursor-pointer ${className}`}
      style={{ width: `${size}px`, height: `${calcHeight}px` }}
      onClick={onClick}
    >
      {/* ロード前のチラつき防止スケルトンプレースホルダー */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded z-0" />
      )}

      {/* 1. キャラクター立ち絵 (顔～胸部アップクロップ) */}
      <div
        className="absolute inset-0 overflow-hidden flex items-center justify-center z-1"
        style={{
          padding: mode === "square" ? "3px" : "2px"
        }}
      >
        <img
          src={img}
          alt={jpName || name || "character"}
          className={`w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            objectPosition: mode === "square" ? "center 12%" : "center 15%",
            transform: mode === "square" ? "scale(1.3)" : "scale(1.15)"
          }}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/characters/reiji_transparent_asset.png";
            setIsLoaded(true);
          }}
        />
      </div>

      {/* 2. 最前面に重ね合わせる本番アルファ透過フレーム枠 */}
      <img
        src={framePath}
        alt={`${rarity} Frame`}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ objectFit: "fill" }}
      />

      {/* 3. 左上重ね合わせ: 3D属性カラー球体オーブバッジ */}
      {showBadge && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            top: mode === "square" ? "2px" : "2px",
            left: mode === "square" ? "2px" : "2px"
          }}
        >
          <AttributeBadge attribute={attrKey} size={badgeSize} />
        </div>
      )}
    </div>
  );
});

CardIcon.displayName = "CardIcon";

export default CardIcon;

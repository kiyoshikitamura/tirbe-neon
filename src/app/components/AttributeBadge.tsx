import React from "react";
import { getAttributeBadgeAsset, getAttributeLabel } from "@/utils/attributeAssets";

export type AttributeType = "GO" | "WA" | "SHIN" | "GOKU" | "RIN" | "剛" | "技" | "心" | "極" | "凛" | string;

interface AttributeBadgeProps {
  attribute?: AttributeType;
  size?: number; // width & height in px
  className?: string;
}

export const AttributeBadge: React.FC<AttributeBadgeProps> = ({
  attribute = "剛",
  size = 28,
  className = ""
}) => {
  const asset = getAttributeBadgeAsset(attribute);
  if (asset) return <img className={className} src={asset} width={size} height={size} alt={getAttributeLabel(attribute)} />;

  // 属性名と対応するカラー・漢字のマッピング
  let label = "剛";
  let bgGradient = "radial-gradient(circle at 35% 35%, #FF5555 0%, #CC0000 65%, #660000 100%)";
  let borderGlow = "rgba(255, 85, 85, 0.6)";

  const normAttr = (attribute || "").toUpperCase();

  if (normAttr === "WA" || normAttr === "技" || normAttr === "GREEN") {
    label = "技";
    bgGradient = "radial-gradient(circle at 35% 35%, #55FF88 0%, #00CC44 65%, #006622 100%)";
    borderGlow = "rgba(85, 255, 136, 0.6)";
  } else if (normAttr === "SHIN" || normAttr === "心" || normAttr === "BLUE") {
    label = "心";
    bgGradient = "radial-gradient(circle at 35% 35%, #55CCFF 0%, #0088CC 65%, #004466 100%)";
    borderGlow = "rgba(85, 204, 255, 0.6)";
  } else if (normAttr === "GOKU" || normAttr === "極" || normAttr === "PURPLE") {
    label = "極";
    bgGradient = "radial-gradient(circle at 35% 35%, #DD55FF 0%, #9900CC 65%, #440066 100%)";
    borderGlow = "rgba(221, 85, 255, 0.6)";
  } else if (normAttr === "RIN" || normAttr === "凛" || normAttr === "YELLOW") {
    label = "凛";
    bgGradient = "radial-gradient(circle at 35% 35%, #FFEE55 0%, #CCAA00 65%, #665500 100%)";
    borderGlow = "rgba(255, 238, 85, 0.6)";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full select-none shadow-md ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: bgGradient,
        border: "1.5px solid rgba(255, 255, 255, 0.8)",
        boxShadow: `0 0 6px ${borderGlow}, inset 0 1px 2px rgba(255, 255, 255, 0.5)`
      }}
    >
      <span
        className="font-weight-bold text-white tracking-tighter drop-shadow-md"
        style={{
          fontSize: `${Math.max(9, Math.floor(size * 0.52))}px`,
          fontFamily: "'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default AttributeBadge;

import React from "react";
import { ITEMS_MASTER_DATA } from "@/utils/items_master_data";

interface CanonicalItemIconProps {
  itemId?: string | null;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function canonicalItemAssetPath(itemId?: string | null) {
  return ITEMS_MASTER_DATA.find((item) => item.id === itemId)?.assetPath ?? null;
}

export default function CanonicalItemIcon({ itemId, alt = "", className = "", fallback = "◆" }: CanonicalItemIconProps) {
  const assetPath = canonicalItemAssetPath(itemId);
  return assetPath
    ? <img src={assetPath} alt={alt} className={className} />
    : <span className={className} aria-hidden={alt ? undefined : true}>{fallback}</span>;
}

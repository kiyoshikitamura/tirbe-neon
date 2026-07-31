"use client";

import { useState } from "react";
import { ShopProductItem } from "@/utils/shop_master_data";

export function useShop() {
  const [shopSubTab, setShopSubTab] = useState<string>("LIMITED");
  const [userShopPurchases, setUserShopPurchases] = useState<Record<string, number>>({});
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [boughtResultModal, setBoughtResultModal] = useState<{ productTitle: string; items: ShopProductItem[]; message: string } | null>(null);

  return {
    shopSubTab, setShopSubTab,
    userShopPurchases, setUserShopPurchases,
    userCreatedAt, setUserCreatedAt,
    boughtResultModal, setBoughtResultModal
  };
}

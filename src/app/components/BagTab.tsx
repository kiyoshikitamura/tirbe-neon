"use client";

import React, { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { ITEMS_MASTER_DATA, ItemMaster } from "@/utils/items_master_data";
import "./BagTab.css";

export default function BagTab() {
  const {
    energyDrinks,
    charExpS,
    charExpM,
    charExpL,
    equipExpS,
    equipExpM,
    equipExpL,
    lawsOfStrife,
    skillLbBooks,
    exclusiveContracts,
    equipLbHammers,
    handleUseItem,
    vitality,
    playCyberSe,
    setConfirmDialogConfig
  } = useGame();

  const [activeCategory, setActiveCategory] = useState<"ALL" | "CONSUMABLE" | "CHAR_EXP" | "EQUIP_EXP" | "AWAKEN_LB">("ALL");
  const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);

  // 各アイテムのリアルタイム所持数マッピング
  const itemQuantities: { [key: string]: number } = useMemo(() => ({
    ENERGY_DRINK: energyDrinks || 0,
    CHAR_EXP_S: charExpS || 0,
    CHAR_EXP_M: charExpM || 0,
    CHAR_EXP_L: charExpL || 0,
    EQUIP_EXP_S: equipExpS || 0,
    EQUIP_EXP_M: equipExpM || 0,
    EQUIP_EXP_L: equipExpL || 0,
    LAW_OF_STRIFE: lawsOfStrife || 0,
    SKILL_MANUAL: skillLbBooks || exclusiveContracts || 0,
    EQUIP_LB_PART: equipLbHammers || 0
  }), [energyDrinks, charExpS, charExpM, charExpL, equipExpS, equipExpM, equipExpL, lawsOfStrife, skillLbBooks, exclusiveContracts, equipLbHammers]);

  // アイテム一覧のフィルタリング
  const filteredItems = useMemo(() => {
    return ITEMS_MASTER_DATA.filter(item => {
      if (activeCategory === "ALL") return true;
      if (activeCategory === "CONSUMABLE") return item.category === "CONSUMABLE";
      if (activeCategory === "CHAR_EXP") return item.category === "CHAR_EXP";
      if (activeCategory === "EQUIP_EXP") return item.category === "EQUIP_EXP";
      if (activeCategory === "AWAKEN_LB") return item.category === "AWAKEN" || item.category === "LIMIT_BREAK";
      return true;
    });
  }, [activeCategory]);

  const handleItemCardClick = (item: ItemMaster) => {
    playCyberSe("click");
    setSelectedItem(item);
  };

  const handleUseButtonClick = async (item: ItemMaster) => {
    playCyberSe("click");
    const qty = itemQuantities[item.id] || 0;
    if (qty <= 0) {
      setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: "このアイテムを所持していません。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }

    if (item.id === "ENERGY_DRINK") {
      if (vitality >= 100) {
        setConfirmDialogConfig({ isOpen: true, title: "使用不可", message: "スタミナが100以上の場合は使用できません。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
        return;
      }
      await handleUseItem(item.id);
    }
  };

  return (
    <div className="bag-tab-view">
      <div className="bag-tab-header">
        <h2 className="bag-tab-title text-color-cyan">所持品</h2>
      </div>

      {/* カテゴリー切り替えタブ */}
      <div className="bag-category-tabs">
        <button
          className={`category-tab-btn active-scale-effect ${activeCategory === "ALL" ? "active" : ""}`}
          onClick={() => { playCyberSe("click"); setActiveCategory("ALL"); }}
        >
          すべて
        </button>
        <button
          className={`category-tab-btn active-scale-effect ${activeCategory === "CONSUMABLE" ? "active" : ""}`}
          onClick={() => { playCyberSe("click"); setActiveCategory("CONSUMABLE"); }}
        >
          回復
        </button>
        <button
          className={`category-tab-btn active-scale-effect ${activeCategory === "CHAR_EXP" ? "active" : ""}`}
          onClick={() => { playCyberSe("click"); setActiveCategory("CHAR_EXP"); }}
        >
          キャラ強化
        </button>
        <button
          className={`category-tab-btn active-scale-effect ${activeCategory === "EQUIP_EXP" ? "active" : ""}`}
          onClick={() => { playCyberSe("click"); setActiveCategory("EQUIP_EXP"); }}
        >
          装備強化
        </button>
        <button
          className={`category-tab-btn active-scale-effect ${activeCategory === "AWAKEN_LB" ? "active" : ""}`}
          onClick={() => { playCyberSe("click"); setActiveCategory("AWAKEN_LB"); }}
        >
          覚醒・突破
        </button>
      </div>

      {/* アイテムグリッド一覧 */}
      <div className="bag-items-container scroll-container">
        {filteredItems.map(item => {
          const qty = itemQuantities[item.id] || 0;
          const isConsumable = item.category === "CONSUMABLE";
          const isEnergyDrinkDisabled = item.id === "ENERGY_DRINK" && (vitality >= 100 || qty <= 0);

          return (
            <div
              key={item.id}
              className={`bag-item-card ${qty > 0 ? "has-quantity" : "empty-quantity"}`}
              onClick={() => handleItemCardClick(item)}
            >
              <div className="bag-item-icon-area">
                {/* 共通アイコン描画 */}
                <div className="item-icon-badge">
                  {item.iconType === "ENERGY_DRINK" && <span className="icon-text text-color-cyan">ST</span>}
                  {item.iconType.startsWith("BOOK") && <span className="icon-text text-color-magenta">EXP</span>}
                  {item.iconType.startsWith("OIL") && <span className="icon-text text-amber-400">EQ</span>}
                  {item.iconType === "AWAKEN_BOOK" && <span className="icon-text text-red-500">覚醒</span>}
                  {item.iconType.includes("LB") && <span className="icon-text text-purple-400">突破</span>}
                  {item.iconType === "EQUIP_LB" && <span className="icon-text text-yellow-400">万能</span>}
                </div>
              </div>

              <div className="bag-item-info-area">
                <div className="bag-item-meta">
                  <span className="bag-item-name">{item.name}</span>
                </div>
                <p className="bag-item-desc">{item.description}</p>
                <div className="bag-item-action-row">
                  <div className="bag-item-quantity">
                    所持数: <span className="quantity-num">{qty}</span>
                  </div>
                  {isConsumable ? (
                    <button
                      className="item-use-btn active-scale-effect"
                      onClick={(e) => { e.stopPropagation(); handleUseButtonClick(item); }}
                      disabled={isEnergyDrinkDisabled}
                    >
                      使用
                    </button>
                  ) : (
                    <span className="item-material-label">強化画面で使用</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* アイテム詳細ダイアログモーダル */}
      {selectedItem && (
        <div className="recover-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="recover-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="recover-modal-header">
              <h3>{selectedItem.name}</h3>
            </div>
            <div className="recover-modal-body p-3 text-center">
              <p className="text-gray-300 font-size-8 mb-3">{selectedItem.description}</p>
              <div className="font-size-8 text-cyan-400 font-bold mb-4">
                所持数: {itemQuantities[selectedItem.id] || 0} 個
              </div>
              <div className="flex gap-2">
                {selectedItem.category === "CONSUMABLE" && (
                  <button
                    className="item-use-btn flex-1 py-2 active-scale-effect"
                    onClick={() => {
                      const item = selectedItem;
                      setSelectedItem(null);
                      handleUseButtonClick(item);
                    }}
                    disabled={selectedItem.id === "ENERGY_DRINK" && (vitality >= 100 || (itemQuantities[selectedItem.id] || 0) <= 0)}
                  >
                    使用する
                  </button>
                )}
                <button
                  className="sub-btn flex-1 py-2 active-scale-effect"
                  onClick={() => setSelectedItem(null)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

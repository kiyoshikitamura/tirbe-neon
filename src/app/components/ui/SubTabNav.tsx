import React from "react";
import "./SubTabNav.css";
import { useGame } from "../../context/GameContext";

interface SubTabItem {
  id: string;
  label: string;
}

interface SubTabNavProps {
  tabs: SubTabItem[];
  activeTabId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export default function SubTabNav({ tabs, activeTabId, onSelect, className = "" }: SubTabNavProps) {
  const { playCyberSe } = useGame();

  const handleSelect = (id: string) => {
    if (id !== activeTabId) {
      playCyberSe("click");
      onSelect(id);
    }
  };

  return (
    <div className={`outlaw-sub-tab-nav ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            className={`sub-tab-item ${isActive ? "active" : ""} active-scale-effect`}
            onClick={() => handleSelect(tab.id)}
          >
            {tab.label}
            {isActive && <div className="sub-tab-indicator" />}
          </button>
        );
      })}
    </div>
  );
}

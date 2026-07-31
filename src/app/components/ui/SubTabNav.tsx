import React from "react";
import "./SubTabNav.css";
import { useGame } from "../../context/GameContext";

interface SubTabItem {
  id: string;
  label: string;
  disabled?: boolean;
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
            className={`sub-tab-item ${isActive ? "active" : ""} ${tab.disabled ? "disabled" : ""} active-scale-effect`}
            onClick={() => !tab.disabled && handleSelect(tab.id)}
            disabled={tab.disabled}
          >
            {tab.label}
            {isActive && <div className="sub-tab-indicator" />}
          </button>
        );
      })}
    </div>
  );
}

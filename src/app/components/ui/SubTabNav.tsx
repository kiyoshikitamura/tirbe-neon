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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = React.useState({ left: false, right: false });

  const updateScrollState = React.useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setScrollState({
      left: node.scrollLeft > 2,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
    });
  }, []);

  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(node);
    return () => observer.disconnect();
  }, [tabs.length, updateScrollState]);

  const handleSelect = (id: string) => {
    if (id !== activeTabId) {
      playCyberSe("click");
      onSelect(id);
    }
  };

  const scrollByTab = (direction: -1 | 1) => {
    playCyberSe("click");
    scrollRef.current?.scrollBy({ left: direction * Math.max(120, scrollRef.current.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className={`outlaw-sub-tab-shell ${className}`}>
      <button type="button" className="sub-tab-scroll-button prev" onClick={() => scrollByTab(-1)} disabled={!scrollState.left} aria-label="前の項目を表示">‹</button>
      <div ref={scrollRef} className="outlaw-sub-tab-nav" onScroll={updateScrollState}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              type="button"
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
      <button type="button" className="sub-tab-scroll-button next" onClick={() => scrollByTab(1)} disabled={!scrollState.right} aria-label="次の項目を表示">›</button>
    </div>
  );
}

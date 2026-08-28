import React from "react";
import "./SubTabNav.css";
import { useGame } from "../../context/GameContext";

interface SubTabItem {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: number;
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

  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const activeItem = Array.from(node.querySelectorAll<HTMLButtonElement>("[data-sub-tab-id]"))
      .find((item) => item.dataset.subTabId === activeTabId);
    if (!activeItem) return;
    const itemLeft = activeItem.offsetLeft;
    const itemRight = itemLeft + activeItem.offsetWidth;
    if (itemLeft < node.scrollLeft) {
      node.scrollTo({ left: itemLeft, behavior: "smooth" });
    } else if (itemRight > node.scrollLeft + node.clientWidth) {
      node.scrollTo({ left: itemRight - node.clientWidth, behavior: "smooth" });
    }
  }, [activeTabId]);

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
              data-sub-tab-id={tab.id}
              className={`sub-tab-item ${isActive ? "active" : ""} ${tab.disabled ? "disabled" : ""} active-scale-effect`}
              onClick={() => !tab.disabled && handleSelect(tab.id)}
              disabled={tab.disabled}
            >
              {tab.label}
              {Number(tab.badge || 0) > 0 && <span className="sub-tab-badge" aria-label={`未受取${tab.badge}件`}>{tab.badge}</span>}
              {isActive && <div className="sub-tab-indicator" />}
            </button>
          );
        })}
      </div>
      <button type="button" className="sub-tab-scroll-button next" onClick={() => scrollByTab(1)} disabled={!scrollState.right} aria-label="次の項目を表示">›</button>
    </div>
  );
}

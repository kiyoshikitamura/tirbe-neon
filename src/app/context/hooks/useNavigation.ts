"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialogConfig } from "@/app/components/ui/ConfirmDialog";
import { sanitizeOperationsTab } from "@/domain/operations/operations";

export function useNavigation(playCyberSe: (type: string) => void, handleFirstUserInteraction: () => void) {
  const [activeTab, setActiveTabState] = useState<string>("home");
  const [showInboxPanel, setShowInboxPanel] = useState<boolean>(false);
  const [showMissionPanel, setShowMissionPanel] = useState<boolean>(false);
  const [showFriendPanel, setShowFriendPanel] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [showTribeChatPanel, setShowTribeChatPanel] = useState<boolean>(false);
  const [showMoveBaseModal, setShowMoveBaseModal] = useState<boolean>(false);
  const [showLegalPage, setShowLegalPage] = useState<string | null>(null);
  const [showTitleView, setShowTitleView] = useState<boolean>(true);
  const [inboxPanelTab, setInboxPanelTab] = useState<"presents" | "news">("presents");
  const [rankingActiveTab, setRankingActiveTab] = useState<string>("power");
  const [characterEntryView, setCharacterEntryView] = useState<"party" | null>(null);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<ConfirmDialogConfig | null>(null);
  const [globalInteractionBlocking, setGlobalInteractionBlocking] = useState<boolean>(false);

  const setActiveTab = useCallback((tabName: string) => {
    setActiveTabState(sanitizeOperationsTab(tabName));
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (!requestedTab) return;
    const safeTab = sanitizeOperationsTab(requestedTab);
    setActiveTabState(safeTab);
    if (safeTab !== requestedTab) {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", safeTab);
      window.history.replaceState(null, "", url);
    }
  }, []);

  const navigateTab = (tabName: string, subTab?: string) => {
    handleFirstUserInteraction();
    playCyberSe("click");
    setActiveTab(tabName);
    setCharacterEntryView(tabName === "character" && subTab === "party" ? "party" : null);
    
    // パネル系を全て閉じる
    setShowInboxPanel(false);
    setShowMissionPanel(false);
    setShowFriendPanel(false);
    setShowSettingsPanel(false);
    setShowTribeChatPanel(false);
    setShowMoveBaseModal(false);
    setShowLegalPage(null);
    
    if (tabName === "ranking" && subTab) {
      setRankingActiveTab(subTab);
    }
  };

  return {
    activeTab,
    setActiveTab,
    showInboxPanel,
    setShowInboxPanel,
    showMissionPanel,
    setShowMissionPanel,
    showFriendPanel,
    setShowFriendPanel,
    showSettingsPanel,
    setShowSettingsPanel,
    showTribeChatPanel,
    setShowTribeChatPanel,
    showMoveBaseModal,
    setShowMoveBaseModal,
    showLegalPage,
    setShowLegalPage,
    showTitleView,
    setShowTitleView,
    inboxPanelTab,
    setInboxPanelTab,
    rankingActiveTab,
    setRankingActiveTab,
    characterEntryView,
    setCharacterEntryView,
    confirmDialogConfig,
    setConfirmDialogConfig,
    globalInteractionBlocking,
    setGlobalInteractionBlocking,
    navigateTab
  };
}

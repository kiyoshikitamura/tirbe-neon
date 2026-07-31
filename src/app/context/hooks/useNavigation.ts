"use client";

import { useState } from "react";
import { ConfirmDialogConfig } from "@/app/components/ui/ConfirmDialog";

export function useNavigation(playCyberSe: (type: string) => void, handleFirstUserInteraction: () => void) {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [showInboxPanel, setShowInboxPanel] = useState<boolean>(false);
  const [showMissionPanel, setShowMissionPanel] = useState<boolean>(false);
  const [showFriendPanel, setShowFriendPanel] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [showTribeChatPanel, setShowTribeChatPanel] = useState<boolean>(false);
  const [showMoveBaseModal, setShowMoveBaseModal] = useState<boolean>(false);
  const [showLegalPage, setShowLegalPage] = useState<string | null>(null);
  const [showTitleView, setShowTitleView] = useState<boolean>(true);
  const [inboxPanelTab, setInboxPanelTab] = useState<"presents" | "news">("presents");
  const [rankingActiveTab, setRankingActiveTab] = useState<string>("overall");
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<ConfirmDialogConfig | null>(null);
  const [globalInteractionBlocking, setGlobalInteractionBlocking] = useState<boolean>(false);

  const navigateTab = (tabName: string, subTab?: string) => {
    handleFirstUserInteraction();
    playCyberSe("click");
    setActiveTab(tabName);
    
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
    confirmDialogConfig,
    setConfirmDialogConfig,
    globalInteractionBlocking,
    setGlobalInteractionBlocking,
    navigateTab
  };
}

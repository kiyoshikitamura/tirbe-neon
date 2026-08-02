import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
import { supabase } from "@/utils/supabase";
import "./FriendPanel.css";

export default function FriendPanel() {
  const { 
    showFriendPanel, 
    setShowFriendPanel, 
    userFriends, 
    friendRequests, 
    setConfirmDialogConfig,
    session,
    playCyberSe,
    syncBootstrapData
  } = useGame();
  
  const [activeTab, setActiveTab] = useState<string>("list");
  const [friendIdInput, setFriendIdInput] = useState<string>("");

  if (!showFriendPanel) return null;

  const handleClose = () => {
    setShowFriendPanel(false);
  };

  const tabs = [
    { id: "list", label: "一覧" },
    { id: "add", label: "検索追加" },
    { id: "requests", label: "承認待ち" }
  ];

  const handleSendRequest = async () => {
    playCyberSe("click");
    if (!friendIdInput) return;
    try {
      const res = await supabase.rpc("send_friend_request", { p_user_id: session?.user?.id, p_friend_id: friendIdInput });
      if (res.error) throw res.error;
      
      setConfirmDialogConfig({
        isOpen: true,
        title: "フレンド申請",
        message: "フレンド申請を送信しました。",
        confirmText: "OK",
        onConfirm: () => { setConfirmDialogConfig(null); setFriendIdInput(""); syncBootstrapData(); }
      });
    } catch (err: any) {
      setConfirmDialogConfig({
        isOpen: true,
        title: "エラー",
        message: err.message || "申請に失敗しました。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig(null)
      });
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    playCyberSe("click");
    try {
      const res = await supabase.rpc("accept_friend_request", { p_user_id: session?.user?.id, p_friend_id: friendId });
      if (res.error) throw res.error;
      syncBootstrapData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    playCyberSe("click");
    setConfirmDialogConfig({
      isOpen: true,
      title: "フレンド解除",
      message: "このプレイヤーをフレンドから削除しますか？",
      confirmText: "削除",
      cancelText: "キャンセル",
      onConfirm: async () => {
        setConfirmDialogConfig(null);
        try {
          const res = await supabase.rpc("remove_friend", { p_user_id: session?.user?.id, p_friend_id: friendId });
          if (res.error) throw res.error;
          syncBootstrapData();
        } catch (err) {
          console.error(err);
        }
      },
      onCancel: () => setConfirmDialogConfig(null)
    });
  };

  return (
    <FullScreenPanel title="フレンド" onClose={handleClose}>
      <SubTabNav tabs={tabs} activeTabId={activeTab} onSelect={setActiveTab} />
      
      <div className="friend-panel-container-inner flex-1 p-3 scroll-container flex-col-gap-3">
        {activeTab === "list" && (
          <div className="flex-col-gap-2">
            <h3 className="font-size-9 text-color-cyan font-weight-bold">フレンド一覧 ({userFriends?.length || 0}/50)</h3>
            {userFriends && userFriends.length > 0 ? (
              userFriends.map((f: any) => (
                <div key={f.id} className="friend-card border-subtle p-2 flex-row-space-between align-center bg-black-60">
                  <div className="flex-col">
                    <span className="font-size-8 font-weight-bold text-white">{f.friend?.name || f.friend_id.slice(0, 8)}</span>
                    <span className="font-size-7 text-secondary">Lv.{f.friend?.level || 1}</span>
                  </div>
                  <OutlawButton variant="danger" onClick={() => handleRemoveFriend(f.friend_id)} className="px-2 py-1 font-size-7">
                    解除
                  </OutlawButton>
                </div>
              ))
            ) : (
              <p className="font-size-8 text-secondary">フレンドがいません。</p>
            )}
          </div>
        )}

        {activeTab === "add" && (
          <div className="flex-col-gap-2">
            <h3 className="font-size-9 text-color-cyan font-weight-bold">ID検索</h3>
            <p className="font-size-7 text-secondary">友達のプレイヤーIDを入力してフレンド申請を送ります。</p>
            <div className="flex gap-2">
              <input
                type="text"
                className="game-input flex-1 p-2 font-size-8"
                placeholder="プレイヤーID (UUID)"
                value={friendIdInput}
                onChange={(e) => setFriendIdInput(e.target.value)}
              />
              <OutlawButton variant="primary" onClick={handleSendRequest} className="px-3" disabled={!friendIdInput}>
                申請
              </OutlawButton>
            </div>
            
            <div className="mt-4 pt-3 border-top-subtle">
              <h3 className="font-size-8 text-color-magenta mb-2">あなたのID</h3>
              <div className="p-2 bg-black-80 border-magenta-subtle rounded font-size-7 text-white text-center break-all user-select-all">
                {session?.user?.id}
              </div>
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="flex-col-gap-2">
            <h3 className="font-size-9 text-color-cyan font-weight-bold">承認待ち</h3>
            
            <div className="mt-2">
              <h4 className="font-size-8 text-white mb-2">受信した申請</h4>
              {friendRequests && friendRequests.filter((f: any) => f.status === "RECEIVED").length > 0 ? (
                friendRequests.filter((f: any) => f.status === "RECEIVED").map((f: any) => (
                  <div key={f.id} className="friend-card border-subtle p-2 flex-row-space-between align-center bg-black-60 mb-2">
                    <div className="flex-col">
                      <span className="font-size-8 font-weight-bold text-white">{f.friend?.name || f.friend_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex gap-2">
                      <OutlawButton variant="primary" onClick={() => handleAcceptRequest(f.friend_id)} className="px-2 py-1 font-size-7">
                        承認
                      </OutlawButton>
                      <OutlawButton variant="danger" onClick={() => handleRemoveFriend(f.friend_id)} className="px-2 py-1 font-size-7">
                        拒否
                      </OutlawButton>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-size-8 text-secondary">受信した申請はありません。</p>
              )}
            </div>
            
            <div className="mt-4 pt-2 border-top-subtle">
              <h4 className="font-size-8 text-white mb-2">送信した申請</h4>
              {friendRequests && friendRequests.filter((f: any) => f.status === "PENDING").length > 0 ? (
                friendRequests.filter((f: any) => f.status === "PENDING").map((f: any) => (
                  <div key={f.id} className="friend-card border-subtle p-2 flex-row-space-between align-center bg-black-60 mb-2">
                    <div className="flex-col">
                      <span className="font-size-8 font-weight-bold text-white">{f.friend?.name || f.friend_id.slice(0, 8)}</span>
                      <span className="font-size-7 text-secondary">承認待ち</span>
                    </div>
                    <OutlawButton variant="danger" onClick={() => handleRemoveFriend(f.friend_id)} className="px-2 py-1 font-size-7">
                      取消
                    </OutlawButton>
                  </div>
                ))
              ) : (
                <p className="font-size-8 text-secondary">送信した申請はありません。</p>
              )}
            </div>
          </div>
        )}
      </div>
    </FullScreenPanel>
  );
}

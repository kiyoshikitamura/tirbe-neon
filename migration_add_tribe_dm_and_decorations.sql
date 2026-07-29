-- ===============================================================
-- TRIBE: NEON REIGN
-- マイグレーション: 暗号メッセージ『トライブ』(DM) ＆ プロフィール任意背景・レイヤー装飾テーブル (安全再実行版)
-- ===============================================================

-- 1. users テーブルへの装着属性カラムの追加
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS selected_bg_mode VARCHAR(64) DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS interior_item VARCHAR(64) DEFAULT 'none';

-- 2. 個人チャット (DM) テーブルの作成
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成 (送信者・受信者別の高速クエリ用)
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON public.direct_messages(created_at DESC);

-- 3. 所持背景・装飾アイテム管理テーブルの作成
CREATE TABLE IF NOT EXISTS public.user_profile_decorations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    decoration_type VARCHAR(32) NOT NULL, -- 'BACKGROUND', 'INTERIOR', 'TITLE', 'EFFECT'
    decoration_id VARCHAR(64) NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_decoration UNIQUE (user_id, decoration_type, decoration_id)
);

-- 4. Row Level Security (RLS) ポリシーの設定
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_decorations ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーが存在する場合にエラーにならないようドロップ
DROP POLICY IF EXISTS "Users can view their own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can insert direct messages as sender" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can view all user decorations" ON public.user_profile_decorations;
DROP POLICY IF EXISTS "Users can insert their own decorations" ON public.user_profile_decorations;

-- direct_messages: 自分が送信者または受信者であるメッセージのみ参照・追加可能
CREATE POLICY "Users can view their own direct messages" 
  ON public.direct_messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert direct messages as sender" 
  ON public.direct_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- user_profile_decorations: 自分の所持アイテムのみ管理・全ユーザー参照可能
CREATE POLICY "Users can view all user decorations" 
  ON public.user_profile_decorations FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own decorations" 
  ON public.user_profile_decorations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 5. Supabase Realtime の安全な有効化 (リアルタイムDM受信)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.direct_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

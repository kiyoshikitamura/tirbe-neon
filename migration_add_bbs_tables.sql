-- ====================================================================
-- TRIBE: NEON REIGN - BBS機能（スレッド式掲示板）用マイグレーション
-- ====================================================================

-- 1. BBSスレッドテーブルの作成
CREATE TABLE IF NOT EXISTS bbs_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('RECRUIT', 'STRATEGY_CHAT')), -- カテゴリ制限
    title VARCHAR(50) NOT NULL,                                            -- スレッドタイトル
    content VARCHAR(200) NOT NULL,                                          -- スレッド本文
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,          -- 作成者ID
    author_name TEXT NOT NULL,                                             -- 作成者名
    author_avatar_url TEXT,                                                -- 作成者アバター画像URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. BBSレステーブルの作成
CREATE TABLE IF NOT EXISTS bbs_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES bbs_threads(id) ON DELETE CASCADE NOT NULL,  -- 親スレッドID
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,          -- 投稿者ID
    author_name TEXT NOT NULL,                                             -- 投稿者名
    author_avatar_url TEXT,                                                -- 投稿者アバター画像URL
    content VARCHAR(200) NOT NULL,                                          -- レス本文 (200文字制限)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. インデックスの追加（検索・ソート高速化）
CREATE INDEX IF NOT EXISTS idx_bbs_threads_category_updated ON bbs_threads(category, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bbs_posts_thread_created ON bbs_posts(thread_id, created_at ASC);

-- 4. レス投稿時にスレッドの updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_bbs_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bbs_threads
    SET updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bbs_thread_timestamp ON bbs_posts;
CREATE TRIGGER trg_update_bbs_thread_timestamp
AFTER INSERT ON bbs_posts
FOR EACH ROW
EXECUTE FUNCTION update_bbs_thread_timestamp();

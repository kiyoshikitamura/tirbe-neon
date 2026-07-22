-- ====================================================================
-- TRIBE: NEON REIGN - PvP防衛デッキ5人編成拡張マイグレーション
-- ====================================================================

-- pvp_defense_decks テーブルに4人目、5人目のキャラクターIDカラムを追加
ALTER TABLE pvp_defense_decks ADD COLUMN IF NOT EXISTS character_4_id UUID REFERENCES user_characters(id) ON DELETE SET NULL;
ALTER TABLE pvp_defense_decks ADD COLUMN IF NOT EXISTS character_5_id UUID REFERENCES user_characters(id) ON DELETE SET NULL;

COMMENT ON COLUMN pvp_defense_decks.character_4_id IS '出撃パーティ/防衛メンバー4人目の所持キャラID';
COMMENT ON COLUMN pvp_defense_decks.character_5_id IS '出撃パーティ/防衛メンバー5人目の所持キャラID';

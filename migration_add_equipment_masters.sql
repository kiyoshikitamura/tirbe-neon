-- Migration: Add equipment master tables and new equipment items

CREATE TABLE IF NOT EXISTS equipment_level_up_master (
    level INT PRIMARY KEY,
    required_cash INT NOT NULL,
    required_item_id TEXT NOT NULL,
    required_item_qty INT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipment_limit_break_master (
    plus_val INT PRIMARY KEY,
    required_cash INT NOT NULL,
    required_item_qty INT NOT NULL
);

-- シードデータの投入 (1〜49レベル用、cost = level * 40)
DO $$
BEGIN
    FOR i IN 1..49 LOOP
        INSERT INTO equipment_level_up_master (level, required_cash, required_item_id, required_item_qty)
        VALUES (i, i * 40, 'POLISHING_STONE', 1)
        ON CONFLICT (level) DO UPDATE
        SET required_cash = EXCLUDED.required_cash,
            required_item_id = EXCLUDED.required_item_id,
            required_item_qty = EXCLUDED.required_item_qty;
    END LOOP;
END $$;

-- シードデータの投入 (0〜9限界突破段階用、cost = (plus_val + 1) * 2000)
DO $$
BEGIN
    FOR i IN 0..9 LOOP
        INSERT INTO equipment_limit_break_master (plus_val, required_cash, required_item_qty)
        VALUES (i, (i + 1) * 2000, 1)
        ON CONFLICT (plus_val) DO UPDATE
        SET required_cash = EXCLUDED.required_cash,
            required_item_qty = EXCLUDED.required_item_qty;
    END LOOP;
END $$;

-- 新規SSR装備品（LEGS_021、ACCESSORY_051）の登録
INSERT INTO equipments (id, name, slot_type, rarity, base_atk, base_def, base_hp, base_spd, base_luk, is_exclusive, exclusive_character_id, description)
VALUES 
('LEGS_021', 'シャドウランナー', 'LEGS', 'SSR', 0, 8, 200, 15, 0, FALSE, NULL, '軽量極まる特殊チタンソールと強化ナイロンを編み込んだハイスペックシューズ。路地裏を風のように駆け抜ける。'),
('ACCESSORY_051', '福呼びの守り', 'ACCESSORY', 'SSR', 0, 0, 100, 0, 25, FALSE, NULL, '古い裏社会の構成員から譲り受けた、銃弾を弾くと言われる幸運のお守り。鈍く輝く金属の縁取り。')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slot_type = EXCLUDED.slot_type,
    rarity = EXCLUDED.rarity,
    base_atk = EXCLUDED.base_atk,
    base_def = EXCLUDED.base_def,
    base_hp = EXCLUDED.base_hp,
    base_spd = EXCLUDED.base_spd,
    base_luk = EXCLUDED.base_luk,
    description = EXCLUDED.description;

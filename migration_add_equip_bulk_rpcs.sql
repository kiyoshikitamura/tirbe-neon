-- ====================================================================
-- TRIBE: NEON REIGN - 一括操作RPCおよび装備演出用スキーママイグレーション
-- ====================================================================

-- 1. equipments テーブルに演出指定用カラムを追加
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS effect_trigger_type TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS effect_visual_type TEXT;

-- 2. 装備一括解除 RPC (unequip_gear_bulk)
CREATE OR REPLACE FUNCTION unequip_gear_bulk(
    p_user_id UUID,
    p_character_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_equipments
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 装備一括装着 RPC (equip_gear_bulk)
CREATE OR REPLACE FUNCTION equip_gear_bulk(
    p_user_id UUID,
    p_character_id UUID,
    p_equipment_uuids UUID[],
    p_slot_indexes INT[]
) RETURNS VOID AS $$
DECLARE
    i INT;
    v_char_exists BOOLEAN;
    v_eq_record RECORD;
BEGIN
    -- キャラクター所有権チェック
    SELECT EXISTS (
        SELECT 1 FROM user_characters 
        WHERE id = p_character_id AND user_id = p_user_id
    ) INTO v_char_exists;
    
    IF NOT v_char_exists THEN
        RAISE EXCEPTION 'Character does not exist or access denied.';
    END IF;
    
    -- 該当キャラクターの現在の装備をすべて解除
    UPDATE user_equipments
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;

    -- 配列サイズチェック
    IF array_length(p_equipment_uuids, 1) IS NULL OR array_length(p_equipment_uuids, 1) != array_length(p_slot_indexes, 1) THEN
        RAISE EXCEPTION 'Invalid parameters: array length mismatch.';
    END IF;

    -- ループ処理で装備
    FOR i IN 1 .. array_length(p_equipment_uuids, 1) LOOP
        -- 装備の所有権および専用装備の適合チェック
        SELECT ue.user_id, eq.is_exclusive, eq.exclusive_character_id, uc.character_id AS target_char_id
        INTO v_eq_record
        FROM user_equipments ue
        JOIN equipments eq ON ue.equipment_id = eq.id
        CROSS JOIN user_characters uc
        WHERE ue.id = p_equipment_uuids[i] AND uc.id = p_character_id;

        IF v_eq_record.user_id IS NULL OR v_eq_record.user_id != p_user_id THEN
            RAISE EXCEPTION 'Equipment does not exist or access denied.';
        END IF;

        IF v_eq_record.is_exclusive AND v_eq_record.exclusive_character_id IS NOT NULL AND v_eq_record.exclusive_character_id != v_eq_record.target_char_id THEN
            RAISE EXCEPTION 'Equipment is exclusive and cannot be equipped by this character.';
        END IF;

        -- 他のキャラクターが現在装備している場合は外す
        UPDATE user_equipments
        SET equipped_character_id = NULL, slot_index = NULL
        WHERE id = p_equipment_uuids[i];

        -- 新たに装備
        UPDATE user_equipments
        SET equipped_character_id = p_character_id, slot_index = p_slot_indexes[i]
        WHERE id = p_equipment_uuids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 装備一括売却 RPC (sell_gear_bulk)
CREATE OR REPLACE FUNCTION sell_gear_bulk(
    p_user_id UUID,
    p_equipment_ids UUID[]
) RETURNS INT AS $$
DECLARE
    v_total_cash INT := 0;
    v_cash_gain INT;
    v_eq_count INT;
    v_eq_record RECORD;
    v_base_price INT;
    i INT;
BEGIN
    v_eq_count := array_length(p_equipment_ids, 1);
    IF v_eq_count IS NULL OR v_eq_count = 0 THEN
        RETURN 0;
    END IF;

    FOR i IN 1 .. v_eq_count LOOP
        -- 装備の存在、所有権、未装備状態のチェック
        SELECT ue.equipped_character_id, ue.level, ue.plus_val, eq.rarity, ue.user_id
        INTO v_eq_record
        FROM user_equipments ue
        JOIN equipments eq ON ue.equipment_id = eq.id
        WHERE ue.id = p_equipment_ids[i];

        IF v_eq_record.user_id IS NULL OR v_eq_record.user_id != p_user_id THEN
            RAISE EXCEPTION 'Equipment does not exist or access denied.';
        END IF;

        IF v_eq_record.equipped_character_id IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot sell equipped items.';
        END IF;

        -- レアリティ別ベース価格算出
        IF v_eq_record.rarity = 'SSR' THEN
            v_base_price := 10000;
        ELSIF v_eq_record.rarity = 'SR' THEN
            v_base_price := 2000;
        ELSIF v_eq_record.rarity = 'R' THEN
            v_base_price := 500;
        ELSE
            v_base_price := 100;
        END IF;

        v_cash_gain := v_base_price + (v_eq_record.level - 1) * 50 + v_eq_record.plus_val * 1000;
        v_total_cash := v_total_cash + v_cash_gain;

        -- 削除
        DELETE FROM user_equipments WHERE id = p_equipment_ids[i];
    END LOOP;

    -- キャッシュをユーザーに加算
    UPDATE users
    SET cash = cash + v_total_cash
    WHERE id = p_user_id;

    RETURN v_total_cash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. スキル一括解除 RPC (unequip_skill_bulk)
CREATE OR REPLACE FUNCTION unequip_skill_bulk(
    p_user_id UUID,
    p_character_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_skills
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. スキル一括装着 RPC (equip_skill_bulk)
CREATE OR REPLACE FUNCTION equip_skill_bulk(
    p_user_id UUID,
    p_character_id UUID,
    p_skill_uuids UUID[],
    p_slot_indexes INT[]
) RETURNS VOID AS $$
DECLARE
    i INT;
    v_char_exists BOOLEAN;
    v_sk_record RECORD;
BEGIN
    -- キャラクター所有権チェック
    SELECT EXISTS (
        SELECT 1 FROM user_characters 
        WHERE id = p_character_id AND user_id = p_user_id
    ) INTO v_char_exists;
    
    IF NOT v_char_exists THEN
        RAISE EXCEPTION 'Character does not exist or access denied.';
    END IF;
    
    -- 該当キャラクターの現在のスキルをすべて解除
    UPDATE user_skills
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;

    -- 配列サイズチェック
    IF array_length(p_skill_uuids, 1) IS NULL OR array_length(p_skill_uuids, 1) != array_length(p_slot_indexes, 1) THEN
        RAISE EXCEPTION 'Invalid parameters: array length mismatch.';
    END IF;

    -- ループ処理で装着
    FOR i IN 1 .. array_length(p_skill_uuids, 1) LOOP
        -- スキルの所有権および専用スキルの適合チェック
        SELECT us.user_id, sk.is_exclusive, sk.exclusive_character_id, uc.character_id AS target_char_id
        INTO v_sk_record
        FROM user_skills us
        JOIN skill_cards sk ON us.skill_card_id = sk.id
        CROSS JOIN user_characters uc
        WHERE us.id = p_skill_uuids[i] AND uc.id = p_character_id;

        IF v_sk_record.user_id IS NULL OR v_sk_record.user_id != p_user_id THEN
            RAISE EXCEPTION 'Skill card does not exist or access denied.';
        END IF;

        IF v_sk_record.is_exclusive AND v_sk_record.exclusive_character_id IS NOT NULL AND v_sk_record.exclusive_character_id != v_sk_record.target_char_id THEN
            RAISE EXCEPTION 'Skill card is exclusive and cannot be equipped by this character.';
        END IF;

        -- 他のキャラクターが現在装備している場合は外す
        UPDATE user_skills
        SET equipped_character_id = NULL, slot_index = NULL
        WHERE id = p_skill_uuids[i];

        -- 新たに装着
        UPDATE user_skills
        SET equipped_character_id = p_character_id, slot_index = p_slot_indexes[i]
        WHERE id = p_skill_uuids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

# 仕様書：アバターシステム

> [!IMPORTANT]
> **現在アバター機能は一時オミット中です**。
> スキーマ定義やモックDB、描画用コンポーネントコードは将来の再有効化を見据えて実装された状態で保持されていますが、マイページ表示（お気に入りNPC表示と拠点背景の維持）、新規登録（メイキングUI非表示）、およびメニュー遷移（アバターボタンのオミット）により、通常のゲームフローからはアクセスできない状態に再設計されています。

本仕様書は、ユーザーがゲーム内で自身のオリジナルアバターを作成・カスタマイズできる「アバターシステム」の全体設計図です。
マイページの「アバター主役化」、ゲーム開始時の「キャラクターメイキング」、着せ替えにおける「ロード時間最適化（UX保護）」を統合したシステム構成を定義します。

---

## 1. システム概要

本作におけるアバターシステムは、ちびキャラクターをパーツごとに重ね合わせて表示する「レイヤードレンダリング方式」を採用します。
お気に入りNPCの立ち絵を表示していたマイページ（HomeTab）はアバター表示へ全面的に置き換わり、NPCの立ち絵はキャラクター（育成）画面のみで表示される「アバター主役化」を適用します。

---

## 2. アバターレイヤー構成

アバターは、背面（下層）から前面（上層）に向けて以下の順序で画像を重ね合わせて描画します。

| 順序 | レイヤー名 | 説明 |
| :--- | :--- | :--- |
| 1 | **BACKGROUND_EFFECT_1** | 背景エフェクト1（オーラや光など） |
| 2 | **BACKGROUND_EFFECT_2** | 背景エフェクト2（火花や雨など） |
| 3 | **BASE** | 素体（性別 `MALE` / `FEMALE` に対応した肌・体） |
| 4 | **FACE** | 表情（男女それぞれ4パターン、計8パターン） |
| 5 | **BODY** | 服装（初期はベーシック上下1パターンのみ） |
| 6 | **SHOES** | 靴（スニーカー、ブーツなど。初期はなし） |
| 7 | **HAIR** | 髪型（男女それぞれ4パターン、計8パターン） |
| 8 | **ACCESSORY** | アクセサリー（眼鏡、マスク、サングラスなど。任意） |

---

## 3. データベーステーブル設計 (Supabase / PostgreSQL)

アバターシステムを構築するために、以下の3つのテーブルを追加します。

### ① `avatar_parts` (マスタデータ)
アバターを構成するパーツ情報を格納します。
```sql
CREATE TABLE avatar_parts (
    id TEXT PRIMARY KEY,                     -- 'hair_male_spiky', 'body_basic' 等
    name TEXT NOT NULL,                      -- パーツの表示名
    part_type TEXT NOT NULL CHECK (part_type IN ('HAIR', 'FACE', 'BODY', 'SHOES', 'ACCESSORY', 'BACKGROUND_EFFECT')),
    image_path TEXT NOT NULL,                -- 画像ファイルのパス（例: '/avatar/hair_male_spiky.webp'）
    price_cash INT NOT NULL DEFAULT 0,       -- 通常通貨(キャッシュ)価格（0は初期解放または非売品）
    price_diamond INT NOT NULL DEFAULT 0,    -- 課金通貨(ダイヤ)価格
    is_released BOOLEAN DEFAULT TRUE,        -- リリースフラグ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### ② `user_avatar_parts` (ユーザー所持パーツ)
ユーザーが購入・解放したアバターパーツを記録します。
```sql
CREATE TABLE user_avatar_parts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    part_id TEXT REFERENCES avatar_parts(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, part_id)
);
```

### ③ `user_avatars` (アバター装着状態)
ユーザーの現在のアバター装着構成を保存します（1ユーザーにつき最大1レコード）。
```sql
CREATE TABLE user_avatars (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')), -- 性別
    hair_id TEXT REFERENCES avatar_parts(id) ON DELETE RESTRICT NOT NULL,
    face_id TEXT REFERENCES avatar_parts(id) ON DELETE RESTRICT NOT NULL,
    body_id TEXT REFERENCES avatar_parts(id) ON DELETE RESTRICT NOT NULL, -- 初期は 'body_basic'
    shoes_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,        -- 初期はNULL
    accessory_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,    -- 初期はNULL
    bg_effect_1_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,  -- 背景エフェクト1
    bg_effect_2_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,  -- 背景エフェクト2
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

---

## 4. 初期アセットマスタ定義

リリース時の初期マスタデータとして以下のパーツを定義します。画像アセットはすべて透過処理されたWebP形式です。

### 1. 性別素体 (BASE)
- `base_male`: 男性素体 (初期解放)
- `base_female`: 女性素体 (初期解放)

### 2. 表情 (FACE) - 男女各4種 (計8種 / すべて初期解放)
- `face_male_standard` / `face_female_standard`: 通常
- `face_male_smirk` / `face_female_smirk`: 不敵な笑み
- `face_male_angry` / `face_female_angry`: 怒り
- `face_male_smile` / `face_female_smile`: 笑顔

### 3. 髪型 (HAIR) - 男女各4種 (計8種 / すべて初期解放)
- `hair_male_spiky` / `hair_female_spiky`: ツンツン
- `hair_male_short` / `hair_female_short`: ショート
- `hair_male_wavy` / `hair_female_wavy`: ウエーブ
- `hair_male_long` / `hair_female_long`: ロング

### 4. 服装 (BODY) - 1種のみ (初期解放)
- `body_basic`: ベーシック（上下簡単な服装：黒タンクトップ＋ショートパンツ）

### 5. 靴 (SHOES) / アクセサリー (ACCESSORY) / エフェクト
- 初期状態では未設定（NULL可）。ショップ購入用マスタとして適宜追加。

---

## 5. UI/UX 画面仕様

### ① 組織設立画面 (`SetupView`)
ゲーム開始時のユーザー初期登録処理にてアバターを作成します。
1. **ユーザー名入力**: 重複チェック付きテキストボックス。
2. **アバターカスタマイズ**:
   - 性別選択（MALE/FEMALEの切り替えトグル）。
   - 髪型選択（該当性別の4種類の髪型からサムネイル選択）。
   - 表情選択（該当性別の4種類の表情からサムネイル選択）。
3. **登録処理 (`initialize_new_user`)**:
   - ユーザーレコード作成時に、選択した髪型・表情、および `body_basic` を `user_avatar_parts` に登録。
   - `user_avatars` に初期装着状態としてインサート。

### ② マイページ画面 (`HomeTab`)
- **アバター背景**: 拠点移動後も背景画像は拠点と連動せず、アバター専用の「クールな路地裏（つや消し・ダークメタル調）」画像を固定表示。最上部の拠点情報HUD（現在地、支配ギルド、拠点移動ボタン）はそのままオーバーレイ表示。
- **アバターレンダラーの配置**: ビジュアルエリア中央にアバターを大きく描画。NPC立ち絵はキャラクター画面へ隔離。

### ③ アバター着せ替え・ショップ画面 (`AvatarTab`)
- **プレビューエリア**: 現在設定中のアバターパーツをレイヤード表示。背景エフェクト2枠も重ねて表示。
- **パーツ選択メニュー**: カテゴリ（髪、顔、服、靴、アクセ、背景エフェクト）のサブタブ。
  - **背景エフェクト**: 「スロット1」「スロット2」に対してそれぞれ所持アセットから装着を選択可能。
- **即時購入**: 未所持パーツはキャッシュまたはダイヤを消費してその場で即時購入・解放（`user_avatar_parts` へのインサート）が可能。
- **保存処理**: 「保存」ボタンのタップで、現在の構成を `user_avatars` テーブルへ同期保存。

---

## 6. ロード時間最適化・UX保護対策

レイヤードアバターは最大8枚の別画像を非同期にロードするため、表示の遅延やちらつき（パーツがバラバラに表示される現象）を防止する処理を組み込みます。

1. **軽量画像フォーマット (WebP) の採用**:
   - パーツ画像は透過付き `WebP` 形式で用意（解像度: 最大512x512程度）し、画像容量をPNG比で50〜70%軽量化。
2. **ログイン時プリフェッチ**:
   - ゲーム起動時の `syncBootstrapData` 実行時に、現在ユーザーが装着しているアバターパーツの画像データをバックグラウンドでメモリにロード（プリフェッチ）し、画面遷移時の表示ラグを0にします。
3. **全パーツ読込の同期検知**:
   - `AvatarRenderer` コンポーネントは、装着しているすべての画像アセットの `onLoad` イベント完了をカウント・監視します。
   - すべてのパーツ画像がロード完了するまではスケルトン（またはスピナー）を表示し、ロード完了後に一括してフェードイン表示します。
4. **ブラウザキャッシュの有効化**:
   - `public/avatar/` ディレクトリに対し、`Cache-Control` ヘッダーを `public, max-age=31536000, immutable`（長寿命キャッシュ）として配信し、2回目以降のアクセスではキャッシュからミリ秒単位で描画します。

---

## 7. モックデータベース (Local Storage) 対応仕様

本プロジェクトは、APIアクセスキーがダミーである場合に `MockSupabaseClient`（ローカルストレージベースのデータベース）へ自動でフォールバックして動作する設計になっています。そのため、アバターシステムもローカルデモ環境で完全に動作するように以下のモック仕様を実装します。

### ① ローカル初期シードデータ生成
- `MockSupabaseClient` の初期ロード時に、`avatar_parts` テーブル（ストレージキー: `mock_db_avatar_parts`）が未存在、または空である場合、初期マスタデータ（素体2種、表情8種、髪型8種、服装1種）をローカルストレージに自動インサートします。

### ② initialize_new_user 関数のモック拡張
- `rpc("initialize_new_user")` 実行時、選択されたアバターパーツ（性別、表情、髪型）および初期服装 `body_basic` を `mock_db_user_avatar_parts` に登録。
- `mock_db_user_avatars` テーブルへ、性別と初期パーツ構成からなる装着状態レコードを保存。

### ③ アバター同期 ＆ ショップ購入APIのモック
- **装着中アバターの取得 (`user_avatars`)**: `user_avatars` の中から対象 `user_id` の装着レコードを取得して返却。
- **所持パーツ一覧の取得 (`user_avatar_parts`)**: `user_avatar_parts` から対象ユーザーの所持リストを結合して返却。
- **パーツ購入・解放**: ユーザーの `cash` または `neon_diamonds` から代金を減算し、対象のパーツIDを `user_avatar_parts` に追加。
- **装着保存**: 選択された構成を `user_avatars` 上で更新。

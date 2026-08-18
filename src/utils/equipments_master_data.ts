export interface EquipmentMaster {
  id: string;
  name: string;
  rarity: "N" | "R" | "SR" | "SSR";
  slot_type: "WEAPON" | "HEAD" | "BODY" | "LEGS" | "ACCESSORY";
  atk: number;
  def: number;
  hp: number;
  spd: number;
  luk: number;
  is_exclusive: boolean;
  exclusive_character_id: string | null;
  effect_description: string | null;
  effect_trigger_type?: string | null;
  effect_visual_type?: string | null;
  description: string;
}

export const EQUIPMENTS_MASTER_DATA: EquipmentMaster[] = [
  // =========================================================================
  // 1. 武器 (WEAPON: 50種)
  // =========================================================================
  {
    id: "WEAPON_001",
    name: "ストリートナイフ",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 5, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "折りたたみ式の無骨なポケットナイフ。ストリートの若者が携帯している定番モデル。"
  },
  {
    id: "WEAPON_002",
    name: "9mmハンドガン",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 8, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "密造ルートで広く出回っている標準的な自動拳銃。スチールブラックの無機質な外観。"
  },
  {
    id: "WEAPON_003",
    name: "金属バット",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 10, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "表面に無数の擦り傷や打撃痕が残る、競技用のアルミ製バット。"
  },
  {
    id: "WEAPON_004",
    name: "サバイバルマチェテ",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 12, def: 0, hp: 0, spd: -1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "厚みのある鋼鉄で作られた頑丈な鉈。木製のグリップが手になじむ。"
  },
  {
    id: "WEAPON_005",
    name: "特殊警棒",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 7, def: 3, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "金属製の頑丈な伸縮式警棒。滑り止めのラバーグリップが施されている。"
  },
  {
    id: "WEAPON_006",
    name: "折りたたみカミソリ",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 6, def: 0, hp: 0, spd: 0, luk: 2,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "理髪用の折りたたみカミソリ。プラスチック製の黒い柄を持つ。"
  },
  {
    id: "WEAPON_007",
    name: "鉄パイプ",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 9, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "解体現場やスクラップ場から拾い集めた、錆びついた中空の鉄製パイプ。"
  },
  {
    id: "WEAPON_008",
    name: "メリケンサック",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 6, def: 0, hp: 0, spd: 1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "拳の関節に合わせて成形された、無塗装の金属製ナックルダスター。"
  },
  {
    id: "WEAPON_009",
    name: "錆びたバール",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 11, def: 0, hp: 0, spd: -1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "解体作業などで使用される、L字型をした赤錆びだらけの重い鉄製バール。"
  },
  {
    id: "WEAPON_010",
    name: "バスターマグナム",
    rarity: "N",
    slot_type: "WEAPON",
    atk: 13, def: 0, hp: 0, spd: -2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "特大のシリンダーを持つ回転式ピストル。銃身にヘアライン加工が施されている。"
  },
  {
    id: "WEAPON_011",
    name: "ダガー",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 15, def: 0, hp: 0, spd: 0, luk: 3,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "軍用の無反射コーティングが施された戦闘用短刀。刃を鈍く黒光りさせた外観が特徴。"
  },
  {
    id: "WEAPON_012",
    name: "カスタムピストル",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 18, def: 0, hp: 0, spd: 2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "スライドを一部肉抜き軽量化し、ドットサイトを取り付けた9mm自動拳銃。"
  },
  {
    id: "WEAPON_013",
    name: "ソウドオフ・ショットガン",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 25, def: 0, hp: 0, spd: -3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "銃身とストックを短く切り落とした散弾銃。木製ストックにオイル仕上げが施されている。"
  },
  {
    id: "WEAPON_014",
    name: "コンバットナイフ",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 16, def: 0, hp: 0, spd: 0, luk: 4,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "サバイバル環境向けに作られた極厚の鋼鉄製ナイフ。刃背に鋸歯（セレーション）がある。"
  },
  {
    id: "WEAPON_015",
    name: "電撃警棒",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 14, def: 0, hp: 0, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "先端に放電用の端子を備えた護身用デバイス。側面にイエローの警告色が入っている。"
  },
  {
    id: "WEAPON_016",
    name: "消音サブマシンガン",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 22, def: 0, hp: 0, spd: 1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "銃身一体型のサプレッサーを備えた自動拳銃。スチールブラックのマットな質感。"
  },
  {
    id: "WEAPON_017",
    name: "ヘヴィスレッジハマー",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 35, def: 0, hp: 0, spd: -5, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "工事現場等で使用される大型のハンマー。鋳鉄製のヘッドに打撃痕が多数残る。"
  },
  {
    id: "WEAPON_018",
    name: "カスタムバタフライ",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 17, def: 0, hp: 0, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "特徴的な回転アクションで開閉するナイフ。チタンコーティングの虹色の刃を持つ。"
  },
  {
    id: "WEAPON_019",
    name: "ワイヤーソー",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 19, def: 0, hp: 0, spd: 2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "極細のワイヤーに小さな鋸歯を多数並べたノコギリ。両端に金属リングの持ち手がある。"
  },
  {
    id: "WEAPON_020",
    name: "競技用コンポジットボウ",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 21, def: 0, hp: 0, spd: 0, luk: 2,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "左右に滑車を組み込んだ近代的な弓。マットブラックに塗装された金属フレーム。"
  },
  {
    id: "WEAPON_021",
    name: "チタンナックルクロー",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 18, def: 0, hp: 0, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "拳の先端に鋭利なチタン製の刃を仕込んだアタッチメント。鮮やかなチタンブルー仕上げ。"
  },
  {
    id: "WEAPON_022",
    name: "オートマチックマグナム",
    rarity: "R",
    slot_type: "WEAPON",
    atk: 28, def: 0, hp: 0, spd: -3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "自動装填式の大型拳銃。角張った重厚なステンレススチール製のフレーム。"
  },
  {
    id: "WEAPON_023",
    name: "スタンアサシンダガー",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 30, def: 0, hp: 0, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時攻撃時に5%の確率で敵を1ターン「麻痺」にする。",
    description: "グリップに隠されたバッテリーから超高電圧を刃先に送る暗殺用短刀。"
  },
  {
    id: "WEAPON_024",
    name: "消音サプレッサーSMG",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 35, def: 0, hp: 0, spd: 5, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避率+5%。",
    description: "特殊部隊向けにカスタムされた消音サブマシンガン。俊敏な立ち回りを阻害しない。"
  },
  {
    id: "WEAPON_025",
    name: "インダストリアル・デモリッシャー",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 55, def: 0, hp: 0, spd: -5, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "通常攻撃時に敵のDEFを10%無視してダメージを与える。",
    description: "鉄骨をもへし折る超重量の解体用ハンマー。厚い防具も力任せに粉砕する。"
  },
  {
    id: "WEAPON_026",
    name: "仕込み日本刀『黒曜』",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 45, def: 0, hp: 0, spd: 0, luk: 8,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時クリティカル率+10%。",
    description: "傘や杖に偽装された、黒い漆塗りの刀身を持つ極上の日本刀。"
  },
  {
    id: "WEAPON_027",
    name: "アサルトライフル",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 48, def: 0, hp: 0, spd: -1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "ターン開始時、5%の確率でAPが1増加する。",
    description: "レールシステムを配し、ドットサイトとフォアグリップを備えた近代突撃銃。"
  },
  {
    id: "WEAPON_028",
    name: "超硬度カーボンブレード",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 42, def: 0, hp: 0, spd: 0, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "与えたダメージの5%分、自身のHPを吸収回復する。",
    effect_trigger_type: "ON_HIT",
    effect_visual_type: "vfx_lifesteal",
    description: "特殊複合カーボンを極限まで研ぎ澄ました違法な戦闘用ブレード。軽量かつ圧倒的な切断力を誇る。"
  },
  {
    id: "WEAPON_029",
    name: "化学注入式ダガー",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 34, def: 0, hp: 0, spd: 0, luk: 15,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時攻撃時に15%の確率で敵を「出血」にする。",
    description: "刀身の中空ルートから劇薬や毒素を傷口に直接送り込む暗殺用ナイフ。"
  },
  {
    id: "WEAPON_030",
    name: "散弾銃『レイザー』",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 47, def: 0, hp: 0, spd: -3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "与ダメージ時に敵の行動タイムラインを5%後退させる。",
    description: "散弾の衝撃波で敵の姿勢を大きく崩す、暴徒鎮圧用ショットガン。"
  },
  {
    id: "WEAPON_031",
    name: "ヘヴィリボルバー『コフィン』",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 50, def: 0, hp: 0, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "自身の残りHPが30%以下の時、ATK+20%。",
    description: "「棺桶」の名を冠する大型拳銃。土壇場での一撃必殺に賭ける銃士の相棒。"
  },
  {
    id: "WEAPON_032",
    name: "デュアルカスタムピストル",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 38, def: 0, hp: 0, spd: 7, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の行動タイムライン進行速度+5%。",
    description: "二挺で一対となるよう完全調整された、銃身軽量化カスタムピストル。"
  },
  {
    id: "WEAPON_033",
    name: "スタン警棒カスタム",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 32, def: 12, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のDEF+15%。",
    description: "厚手のラバーグリップと強化チタン芯で作られた、極めて頑丈なスタンバトン。"
  },
  {
    id: "WEAPON_034",
    name: "アサシンマチェテ",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 41, def: 0, hp: 0, spd: 0, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時クリティカルダメージ+15%。",
    description: "裏社会の掃除屋が愛用する、血抜きの溝が深く掘られた肉厚のマチェテ。"
  },
  {
    id: "WEAPON_035",
    name: "コンパクトサブピストル",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 36, def: 0, hp: 0, spd: 6, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "バトル開始の最初のターンのみ消費AP-1。",
    description: "ジャケットの内ポケットに忍ばせられる、隠密性と連射力に長けた機関拳銃。"
  },
  {
    id: "WEAPON_036",
    name: "カタナ『影打ち』",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 43, def: 0, hp: 0, spd: 0, luk: 9,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の攻撃が「必中」になる。",
    description: "刃を黒檀色に焼き入れした無反射の日本刀。敵の影を縫うような鋭い突きを放つ。"
  },
  {
    id: "WEAPON_037",
    name: "消音スナイパーライフル",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 53, def: 0, hp: 0, spd: -4, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時クリティカル率+12%。",
    description: "分解してアタッシュケースに収納可能な、特製の消音ボルトアクションライフル。"
  },
  {
    id: "WEAPON_038",
    name: "スチールハンドクロー",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 33, def: 0, hp: 0, spd: 9, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "通常攻撃時に10%の確率で敵の防御バフを1つ解除する。",
    description: "拳に括り付ける三列のスチール爪。敵の衣服や防具を引き裂く。"
  },
  {
    id: "WEAPON_039",
    name: "サイレントスチール弓",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 39, def: 0, hp: 0, spd: 0, luk: 12,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "通常攻撃時に10%の確率で敵を「沈黙」にする。",
    description: "カーボン製リムを採用した高精度クロスボウ。風を切り裂きターゲットの喉元を射抜く。"
  },
  {
    id: "WEAPON_040",
    name: "変形蛇腹刃",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 40, def: 0, hp: 0, spd: 4, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "攻撃が敵全体に及ぶ（ダメージの15%が周囲に拡散）。",
    description: "節々をワイヤーで連結し、鞭のようにしならせて広範囲を薙ぎ払う特殊刀。"
  },
  {
    id: "WEAPON_041",
    name: "カービンライフル",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 46, def: 8, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の最大HP+100。",
    description: "軽量合金で成形された近代戦闘用の自動小銃。取り回しが極めて良い。"
  },
  {
    id: "WEAPON_042",
    name: "アイアンナックル『阿修羅』",
    rarity: "SR",
    slot_type: "WEAPON",
    atk: 37, def: 0, hp: 0, spd: 8, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "自身がデバフ状態の時、ATK+15%。",
    description: "地下格闘技の闘士が素手に巻き付ける、鉄鋲が埋め込まれた強化ナックル。"
  },
  {
    id: "WEAPON_043",
    name: "デス・バイパー",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 70, def: 0, hp: 0, spd: 8, luk: 15,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のクリティカル率+15% ＆ クリティカルダメージ+25%。",
    description: "毒蛇の牙のように鋭く湾曲した、クロームスチール製の超一級コンバットマチェテ。"
  },
  {
    id: "WEAPON_044",
    name: "タクティカル・カタナ『電光石火』",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 65, def: 0, hp: 0, spd: 20, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の行動タイムライン進行速度+10% ＆ 通常攻撃の消費AP-1。",
    effect_trigger_type: "ON_BATTLE_START",
    effect_visual_type: "vfx_speed_up",
    description: "チタン合金で鍛造された黒染めの現代刀。極限の軽量化により、神速の抜刀を可能にする。"
  },
  {
    id: "WEAPON_045",
    name: "ショットガン『終末の鐘』",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 85, def: 0, hp: 150, spd: -5, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時与ダメージの15%を敵の最大HPから削減する（回復不可ダメージ化）。",
    description: "強力な散弾を放つ近接掃射散弾銃。一撃で敵の戦闘意思を完膚なきまでに叩き潰す。"
  },
  {
    id: "WEAPON_046",
    name: "【保留専用：レオン専用】インゴット・ファング",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 75, def: 0, hp: 0, spd: 6, luk: 20,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "レオン専用 / 常時自身のクリティカル率+25%。",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },
  {
    id: "WEAPON_047",
    name: "【レイジ専用】レヴ・イグニッション",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 80, def: 0, hp: 0, spd: 5, luk: 10,
    is_exclusive: true, exclusive_character_id: "11111111-1111-1111-1111-111111111111", // Reiji
    effect_description: "レイジ専用 / 攻撃カード使用時に15%の確率で自身のAPが1回復する。",
    description: "赤いナックルガードと漆黒の肉厚ブレードを持つ、レイジ特製のコンバットナイフ。"
  },
  {
    id: "WEAPON_048",
    name: "【ルイ専用】コマンド・キーブレード",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 60, def: 0, hp: 80, spd: 25, luk: 0,
    is_exclusive: true, exclusive_character_id: "33333333-3333-3333-3333-333333333333", // Rui
    effect_description: "ルイ専用 / サポート・ジャマーカード発動時に味方全体にDEF+15%の防壁シールド付与。",
    effect_trigger_type: "ON_ATTACK",
    effect_visual_type: "vfx_shield",
    description: "暗号解読用物理キーモジュールと頑丈な防錆刃を一体化させた、情報屋ルイ愛用の多機能コマンドナイフ。"
  },
  {
    id: "WEAPON_049",
    name: "【チャン専用】毒蛇の黒刃",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 72, def: 0, hp: 0, spd: 10, luk: 15,
    is_exclusive: true, exclusive_character_id: "22222222-2222-2222-2222-222222222222", // Chang
    effect_description: "チャン専用 / 攻撃ヒット時に100%の確率で敵を3ターン「毒（毎ターン50ダメージ）」にする。",
    description: "特製の遅効性神経毒がブレード表面に焼き付けられた、池袋のマフィア幹部チャン専用のナイフ。"
  },
  {
    id: "WEAPON_050",
    name: "【保留専用：ユウキ専用】支配者の鉄扇",
    rarity: "SSR",
    slot_type: "WEAPON",
    atk: 75, def: 20, hp: 0, spd: 0, luk: 15,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "ユウキ専用 / 敵がバフ所持時、常時自身のATK+30%。",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },

  // =========================================================================
  // 2. 頭防具 (HEAD: 20種)
  // =========================================================================
  {
    id: "HEAD_001",
    name: "ストリートキャップ",
    rarity: "N",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 30, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ストリート系ブランドのロゴが入ったカジュアルな黒いアジャスター付きキャップ帽。"
  },
  {
    id: "HEAD_002",
    name: "パンクバンダナ",
    rarity: "N",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 20, spd: 1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "額にきつく巻き付けた赤いバンダナ。ストリートでのトレードマーク。"
  },
  {
    id: "HEAD_003",
    name: "ニットキャップ",
    rarity: "N",
    slot_type: "HEAD",
    atk: 0, def: 1, hp: 25, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "アクリル繊維で編み込まれた厚手の黒いニット帽。"
  },
  {
    id: "HEAD_004",
    name: "ワークキャップ",
    rarity: "N",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 35, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "擦り切れたダック生地で作られたタフなフラット型のワークキャップ。"
  },
  {
    id: "HEAD_005",
    name: "サングラス",
    rarity: "R",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 80, spd: 0, luk: 2,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "偏光レンズを採用した、シャープなメタルフレーム of 黒いサングラス。"
  },
  {
    id: "HEAD_006",
    name: "ハッカーヘッドセット",
    rarity: "R",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 70, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ノイズキャンセリングイヤーカップを備えた、ブラックとネオングリーンのヘッドセット。"
  },
  {
    id: "HEAD_007",
    name: "マフィアフェドラ",
    rarity: "R",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 90, spd: 0, luk: 4,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "上質なウールフェルトで作られた中折れ帽。深めに被るのがお決まり。"
  },
  {
    id: "HEAD_008",
    name: "防毒マスク",
    rarity: "R",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 100, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "二連式の吸気キャニスターを備えた、フルフェイス型の黒いゴム製マスク。"
  },
  {
    id: "HEAD_009",
    name: "カーボンライダーヘルメット",
    rarity: "R",
    slot_type: "HEAD",
    atk: 0, def: 4, hp: 120, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "強化カーボンで作られた頑丈なフルフェイスヘルメット。ミラーシールド仕様。"
  },
  {
    id: "HEAD_010",
    name: "アンティークゴーグル",
    rarity: "R",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 75, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "経年変化した本革のストラップと真鍮製のフレームで構成されたレトロなゴーグル。"
  },
  {
    id: "HEAD_011",
    name: "バリスティックヘルメット",
    rarity: "SR",
    slot_type: "HEAD",
    atk: 0, def: 10, hp: 200, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身への被クリティカルダメージを20%軽減。",
    description: "特殊部隊向けに開発されたケブラー製の軽量防弾ヘルメット。"
  },
  {
    id: "HEAD_012",
    name: "マルチナイトビジョンゴーグル",
    rarity: "SR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 180, spd: 0, luk: 8,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の攻撃の命中率+10%。",
    description: "暗闇での熱感知・暗視が可能な4眼式の高性能戦闘用ゴーグル。"
  },
  {
    id: "HEAD_013",
    name: "重工業プロテクト溶接マスク",
    rarity: "SR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 220, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時「暗闇・目潰し」デバフを完全に無効化する。",
    description: "強烈なアーク光や火花を遮断する、強化樹脂製のインダストリアルマスク。"
  },
  {
    id: "HEAD_014",
    name: "バリスティックフェイスシールド",
    rarity: "SR",
    slot_type: "HEAD",
    atk: 0, def: 15, hp: 250, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "ターン開始時、50%の確率で自身のデバフを1つ解除する。",
    description: "顔面全体を覆う防弾仕様のスチールプレートマスク。圧倒的な威圧感を与える。"
  },
  {
    id: "HEAD_015",
    name: "タクティカル・スマートグラス",
    rarity: "SR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 150, spd: 8, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "バトル開始時に自身の行動タイムライン進行速度+10%。",
    effect_trigger_type: "ON_BATTLE_START",
    effect_visual_type: "vfx_speed_up",
    description: "反射低減コーティングレンズを搭載し、リアルタイムで標的の距離や風速を計測するタクティカルグラス。"
  },
  {
    id: "HEAD_016",
    name: "隠密用アサシンフード",
    rarity: "SR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 170, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避率+6%。",
    description: "影と同化するために開発された、防刃繊維を織り込んだ深いフード。"
  },
  {
    id: "HEAD_017",
    name: "タクティカル・バイザー『千里眼』",
    rarity: "SSR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 380, spd: 10, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のクリティカル率+10% ＆ 攻撃が絶対に回避されない。",
    effect_trigger_type: "ON_BATTLE_START",
    effect_visual_type: "vfx_accuracy_up",
    description: "高感度の赤外線サーマル検知機能と暗視機能を備え、暗闇での精密な急所狙いを可能にする特殊バイザー。"
  },
  {
    id: "HEAD_018",
    name: "ヘルメット『防塁』",
    rarity: "SSR",
    slot_type: "HEAD",
    atk: 0, def: 20, hp: 500, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身への全被ダメージを10%カット ＆ クリティカルを無効化する。",
    description: "極厚のチタンプレートを追加した特注ヘルメット。銃火の真ん中でも怯まない防壁。"
  },
  {
    id: "HEAD_019",
    name: "【保留専用：ユウキ専用】支配者のモノクル",
    rarity: "SSR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 400, spd: 0, luk: 15,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "ユウキ専用 / 味方全体の通常攻撃の命中率+15%",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },
  {
    id: "HEAD_020",
    name: "【セリカ専用】艶花の黒簪",
    rarity: "SSR",
    slot_type: "HEAD",
    atk: 0, def: 0, hp: 350, spd: 12, luk: 15,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "セリカ専用 / 自身がデバフ状態の時、ターン開始時にAPを追加で1獲得する。",
    description: "黒い金属の針にマゼンタに輝く桜の細工を施した、セリカ愛用の武器を兼ねるかんざし。"
  },

  // =========================================================================
  // 3. 身体防具 (BODY: 30種)
  // =========================================================================
  {
    id: "BODY_001",
    name: "ウインドブレーカー",
    rarity: "N",
    slot_type: "BODY",
    atk: 0, def: 5, hp: 50, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "薄手のナイロンで作られた、防風性の高いスポーツ用ジップアップアウター。"
  },
  {
    id: "BODY_002",
    name: "デニムベスト",
    rarity: "N",
    slot_type: "BODY",
    atk: 0, def: 6, hp: 60, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "背中にストリートのスラングがペンキで手書きされた、厚手のカットオフデニムベスト。"
  },
  {
    id: "BODY_003",
    name: "作業用つなぎ",
    rarity: "N",
    slot_type: "BODY",
    atk: 0, def: 7, hp: 65, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "各所にオイル染みが残る、重作業向けの綿キャンバス地つなぎ。"
  },
  {
    id: "BODY_004",
    name: "サテンブルゾン",
    rarity: "N",
    slot_type: "BODY",
    atk: 0, def: 5, hp: 55, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "独特の鈍い光沢を放つサテン生地で作られた、ストリート用の薄型ジャンパー。"
  },
  {
    id: "BODY_005",
    name: "レザージャケット",
    rarity: "N",
    slot_type: "BODY",
    atk: 0, def: 8, hp: 70, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "シングル仕様のシンプルなラム革レザージャケット。"
  },
  {
    id: "BODY_006",
    name: "ルーズサイズフーディ",
    rarity: "N",
    slot_type: "BODY",
    atk: 0, def: 4, hp: 80, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "厚手のヘヴィウエイトスウェット生地で作られた、極太アームのプルオーバーパーカー。"
  },
  {
    id: "BODY_007",
    name: "ブランドパーカー",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 15, hp: 150, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "デザイン性に優れた、肉厚コットンのストリート系ブランドパーカー。"
  },
  {
    id: "BODY_008",
    name: "ロングレザーコート",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 18, hp: 180, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "重厚な黒の牛革で仕立てられたロング丈のコート。"
  },
  {
    id: "BODY_009",
    name: "ダブルライダース",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 20, hp: 160, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "多数のジッパーやスタッズが打ち込まれた、頑丈なカウハイド製のダブルライダース。"
  },
  {
    id: "BODY_010",
    name: "インナーシャツ",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 14, hp: 190, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "服の下に着用する、吸汗速乾性に優れた伸縮素材の黒いインナーシャツ。"
  },
  {
    id: "BODY_011",
    name: "ワークデニムジャケット",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 16, hp: 170, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "三本針ステッチと金属製ネオバボタンが特徴の、無骨なデニムジャケット。"
  },
  {
    id: "BODY_012",
    name: "プロテクトパファーベスト",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 17, hp: 195, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ボリューム感のあるキルティング加工が施された、ジップアップ式のダウンベスト。"
  },
  {
    id: "BODY_013",
    name: "フライトジャケット",
    rarity: "R",
    slot_type: "BODY",
    atk: 0, def: 19, hp: 175, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ナイロンツイル素材で作られた、中綿入りのヘヴィミリタリージャケット。"
  },
  {
    id: "BODY_014",
    name: "防弾ベスト",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 35, hp: 300, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身が受ける物理ATKダメージを10%軽減する。",
    description: "前後に超高強度セラミックプレートを装填した本格的な防弾チョッキ。"
  },
  {
    id: "BODY_015",
    name: "アサシンテックコート",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 0, hp: 280, spd: 5, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避率+5%。",
    effect_trigger_type: "ON_BATTLE_START",
    effect_visual_type: "vfx_buff",
    description: "耐水性と隠密性に特化した、深いフードを備えた高機能ストリートテックウェア。"
  },
  {
    id: "BODY_016",
    name: "強化耐衝撃重装アーマー",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 50, hp: 450, spd: -3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の最大HP+200。",
    description: "チタン合金製の増加装甲を取り付けた、歩くトーチカのような重防具。"
  },
  {
    id: "BODY_017",
    name: "防刃ファイバーアウター",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 30, hp: 350, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時「出血」状態異常の発生を無効化する。",
    effect_trigger_type: "ON_BATTLE_START",
    effect_visual_type: "vfx_buff",
    description: "アラミドと防刃複合繊維を重ねた、耐摩耗・防刃性に特化したストリートアウター。"
  },
  {
    id: "BODY_018",
    name: "防弾ダブルスーツジャケット",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 28, hp: 320, spd: 0, luk: 8,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "ターン開始時に5%の確率で自身のAPが1増加する。",
    description: "裏地に薄型ケブラーを仕込んだ、仕立ての良いヤクザ・エージェント用スーツ。"
  },
  {
    id: "BODY_019",
    name: "パンクスタッズレザーライダース",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 36, hp: 260, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時被ダメージの10%を攻撃者に物理反射する。",
    description: "無数の金属スタッズとトゲを取り付けた、相手を威圧するライダース。"
  },
  {
    id: "BODY_020",
    name: "重作業用リギングベスト",
    rarity: "SR",
    slot_type: "BODY",
    atk: 8, def: 45, hp: 310, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のATK+8%。",
    effect_trigger_type: "ON_BATTLE_START",
    effect_visual_type: "vfx_buff",
    description: "衝撃緩衝バッファープレートを内蔵し、大型火器の強力な反動を肉体に分散・軽減する戦闘用タクティカルベスト。"
  },
  {
    id: "BODY_021",
    name: "ウインドブレーカー・カスタム",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 31, hp: 330, spd: 4, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "行動時に10%の確率で自身のタイムライン進行を5%加速。",
    description: "関節部の伸縮性を極限まで高め、俊敏なフットワークを助ける戦闘用ジャンパー。"
  },
  {
    id: "BODY_022",
    name: "高級ウールチェスターコート",
    rarity: "SR",
    slot_type: "BODY",
    atk: 0, def: 29, hp: 360, spd: 0, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の状態異常耐性+10%。",
    description: "撥水・防汚だけでなく、衝撃分散素材を織り込んだオーダーメイドの高級ロングコート。"
  },
  {
    id: "BODY_023",
    name: "タクティカルベスト『盾壁』",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 0, def: 58, hp: 550, spd: -2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時受けるすべてのダメージを12%カット ＆ クリティカル被弾時ダメージを半減。",
    effect_trigger_type: "ON_BEING_HIT",
    effect_visual_type: "vfx_shield_block",
    description: "何層にも重ねたケブラー繊維と衝撃吸収ゲルプレートを組み合わせた、最高峰の防弾ベスト。"
  },
  {
    id: "BODY_024",
    name: "タクティカル・ステルスジャケット",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 0, def: 40, hp: 480, spd: 10, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避率+10% ＆ 回避成功時に常時自身のHPを50回復する。",
    effect_trigger_type: "ON_BEING_HIT",
    effect_visual_type: "vfx_heal",
    description: "無反射特殊黒染めコーティングが施された、夜間の隠密行動に最適な超軽量防刃アウター。"
  },
  {
    id: "BODY_025",
    name: "【保留専用：カイト専用】ヴェルヴェット・コート",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 0, def: 60, hp: 600, spd: 0, luk: 0,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "カイト専用 / 受デバフ率-30%",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },
  {
    id: "BODY_026",
    name: "【レイジ専用】覇王のライダース",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 15, def: 55, hp: 650, spd: 0, luk: 0,
    is_exclusive: true, exclusive_character_id: "11111111-1111-1111-1111-111111111111", // Reiji
    effect_description: "レイジ専用 / 敵から攻撃を受けた際、常時15%の確率で自身のAPが1回復する。",
    description: "レイジが着用する、裏地に蜘蛛の巣の刺繍が施された特注の極厚レザーライダース。"
  },
  {
    id: "BODY_027",
    name: "【チャン専用】蛇紋のシルクシャツ",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 0, def: 45, hp: 550, spd: 0, luk: 20,
    is_exclusive: true, exclusive_character_id: "22222222-2222-2222-2222-222222222222", // Chang
    effect_description: "チャン専用 / ターン開始時に常時自身のHPを40回復する。",
    description: "胸元に蛇のタトゥーが見えるよう仕立てられた、チャン愛用の防弾シルク製ドレスシャツ。"
  },
  {
    id: "BODY_028",
    name: "【ルイ専用】タクティカル・ミリタリーワンピ",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 0, def: 40, hp: 580, spd: 12, luk: 0,
    is_exclusive: true, exclusive_character_id: "33333333-3333-3333-3333-333333333333", // Rui
    effect_description: "ルイ専用 / 自身がスキルカードをプレイした時、常時自身にHP40相当の防壁シールドを付与する。",
    effect_trigger_type: "ON_ATTACK",
    effect_visual_type: "vfx_shield",
    description: "ルイのコンカフェ衣装を戦闘用に改造した、防弾メッシュ内蔵のフリル付きミニワンピース。"
  },
  {
    id: "BODY_029",
    name: "【ミオ専用】ボルドーホストスーツ",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 0, def: 48, hp: 570, spd: 0, luk: 18,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "ミオ専用 / 自身が発動するすべてのバフ効果の持続ターンを常時+1ターン延長する。",
    description: "高級ワインをこぼしても汚れない、防刃ナノテクスーツ。ミオのカリスマ性を引き立てる。"
  },
  {
    id: "BODY_030",
    name: "【ケンゴ専用】般若刺繍のスカジャン",
    rarity: "SSR",
    slot_type: "BODY",
    atk: 10, def: 52, hp: 620, spd: 0, luk: 0,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "ケンゴ専用 / 敵からクリティカル攻撃を受けた時、常時威力80の物理カウンター攻撃を行う。",
    description: "ケンゴが愛用する、背中に般若と龍の刺繍が施されたヴィンテージサテン의スカジャン。"
  },

  // =========================================================================
  // 4. 脚防具 (LEGS: 20種)
  // =========================================================================
  {
    id: "LEGS_001",
    name: "テックジョガー",
    rarity: "N",
    slot_type: "LEGS",
    atk: 0, def: 3, hp: 0, spd: 2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ポリエステル素材のカジュアルなジョガーパンツ。裾口がリブ仕様。"
  },
  {
    id: "LEGS_002",
    name: "ダメージジーンズ",
    rarity: "N",
    slot_type: "LEGS",
    atk: 0, def: 2, hp: 0, spd: 0, luk: 1,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "膝や太もも部分に荒々しいカット加工が入ったインディゴジーンズ。"
  },
  {
    id: "LEGS_003",
    name: "ヘヴィカーゴパンツ",
    rarity: "N",
    slot_type: "LEGS",
    atk: 0, def: 4, hp: 20, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "目の詰まったコットンキャンバス地のカーゴズボン。両腿にマチ付きポケット。"
  },
  {
    id: "LEGS_004",
    name: "スポーツショーツ",
    rarity: "N",
    slot_type: "LEGS",
    atk: 0, def: 1, hp: 0, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "吸汗速乾ポリエステルで作られた、ごくシンプルなランニングショーツ。"
  },
  {
    id: "LEGS_005",
    name: "加圧コンプレッションパンツ",
    rarity: "R",
    slot_type: "LEGS",
    atk: 0, def: 10, hp: 0, spd: 5, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "下半身全体をぴったりとサポートする、光沢のある黒いコンプレッションスパッツ。"
  },
  {
    id: "LEGS_006",
    name: "レザーライダーパンツ",
    rarity: "R",
    slot_type: "LEGS",
    atk: 0, def: 15, hp: 50, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "厚手の黒牛革で成形された、膝カップ用のステッチが入ったバイク用革ズボン。"
  },
  {
    id: "LEGS_007",
    name: "強化カーゴパンツ",
    rarity: "R",
    slot_type: "LEGS",
    atk: 0, def: 12, hp: 0, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "擦れやすい膝やヒップ部分を二重生地で補強したコットンカーゴパンツ。"
  },
  {
    id: "LEGS_008",
    name: "サルエルスウェット",
    rarity: "R",
    slot_type: "LEGS",
    atk: 0, def: 9, hp: 0, spd: 4, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "股上が極端に深く、ルーズなシルエットを持つグレーのスウェットズボン。"
  },
  {
    id: "LEGS_009",
    name: "ストレッチスキニー",
    rarity: "R",
    slot_type: "LEGS",
    atk: 0, def: 8, hp: 0, spd: 0, luk: 3,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "非常に伸縮性の高い糸を織り交ぜた、タイトシルエットの黒スキニーパンツ。"
  },
  {
    id: "LEGS_010",
    name: "作業用オーバーオール",
    rarity: "R",
    slot_type: "LEGS",
    atk: 0, def: 14, hp: 40, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "胸部にペンホルダーやツールポケットを備えた、無骨なデニム地オーバーオール。"
  },
  {
    id: "LEGS_011",
    name: "プロテクト・コンバットパンツ",
    rarity: "SR",
    slot_type: "LEGS",
    atk: 0, def: 25, hp: 100, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時「麻痺・凍結（速度低下）」デバフを完全に無効化する。",
    description: "膝と脛に頑丈なプラスチック製プロテクターを埋め込んだ、戦闘用ズボン。"
  },
  {
    id: "LEGS_012",
    name: "強化スチールトゥーブーツ",
    rarity: "SR",
    slot_type: "LEGS",
    atk: 0, def: 22, hp: 0, spd: 8, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の通常攻撃の威力+10%。",
    description: "つま先に硬化スチールプレートを仕込んだ、強烈なキックを可能にする重戦闘ブーツ。"
  },
  {
    id: "LEGS_013",
    name: "ナノカーボン・ランニングスパッツ",
    rarity: "SR",
    slot_type: "LEGS",
    atk: 0, def: 18, hp: 0, spd: 12, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避率+4%。",
    description: "下半身の動作をバネのようにアシストする、新開発の軽量ナノ繊維タイツ。"
  },
  {
    id: "LEGS_014",
    name: "ヘヴィタクティカルグリーブ",
    rarity: "SR",
    slot_type: "LEGS",
    atk: 0, def: 35, hp: 150, spd: -2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "被攻撃時に常時10%の確率で自身のAPが1回復する。",
    description: "暴徒の投石やバットでの打撃を完全に無効化する、強固な脛用メタルプレート。"
  },
  {
    id: "LEGS_015",
    name: "高通気テックメッシュパンツ",
    rarity: "SR",
    slot_type: "LEGS",
    atk: 0, def: 20, hp: 0, spd: 10, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "ターン開始時に5%の確率で自身の全デバフを解除。",
    description: "熱がこもらないようサイドにメッシュスリットを入れた、高機能テックウェア。"
  },
  {
    id: "LEGS_016",
    name: "スパイクスタッズレザーパンツ",
    rarity: "SR",
    slot_type: "LEGS",
    atk: 0, def: 24, hp: 0, spd: 0, luk: 6,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時被ダメージの5%を敵に反射する。",
    description: "太ももから裾にかけて金属スタッズをびっしりと並べた、凶暴なパンクパンツ。"
  },
  {
    id: "LEGS_017",
    name: "カーボンファイバー・スニーカー『閃光』",
    rarity: "SSR",
    slot_type: "LEGS",
    atk: 0, def: 20, hp: 0, spd: 20, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避率+8% ＆ 回避成功時に常時自身の行動タイムラインを10%加速する。",
    description: "特殊な軽量高反発ソールを搭載した、音もなくストリートを疾走するスニーカー。"
  },
  {
    id: "LEGS_018",
    name: "アーマードブーツ『防塁』",
    rarity: "SSR",
    slot_type: "LEGS",
    atk: 0, def: 38, hp: 180, spd: -2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のDEF+15% ＆ 常時クリティカル攻撃を無効化する。",
    description: "対地雷・破片防御を施した極厚ソールのコンバットブーツ。いかなる罠も防ぎきる。"
  },
  {
    id: "LEGS_019",
    name: "【保留専用：コハル専用】スピードスター・スニーカー",
    rarity: "SSR",
    slot_type: "LEGS",
    atk: 0, def: 20, hp: 0, spd: 15, luk: 0,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "コハル専用 / ターン開始時に確率でAP+1",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },
  {
    id: "LEGS_020",
    name: "【保留専用：サクラ専用】漆黒のアサシンロングブーツ",
    rarity: "SSR",
    slot_type: "LEGS",
    atk: 0, def: 22, hp: 0, spd: 10, luk: 10,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "サクラ専用 / 常時自身のクリティカル率+15% ＆ クリティカル時の与ダメージ+30%。",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },
  {
    id: "LEGS_021",
    name: "シャドウランナー",
    rarity: "SSR",
    slot_type: "LEGS",
    atk: 0, def: 8, hp: 200, spd: 15, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "軽量極まる特殊チタンソールと強化ナイロンを編み込んだハイスペックシューズ。路地裏を風のように駆け抜ける。"
  },


  // =========================================================================
  // 5. アクセサリー (ACCESSORY: 50種)
  // =========================================================================
  {
    id: "ACCESSORY_001",
    name: "ネオンスタッドピアス",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 1,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "暗闇で鈍く光るネオンブルーの安物アクリル製ピアス。"
  },
  {
    id: "ACCESSORY_002",
    name: "スチールフラットリング",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 2,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ステンレススチール製のシンプルな鏡面平打ちの指輪。"
  },
  {
    id: "ACCESSORY_003",
    name: "レザーベルトチョーカー",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 10, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "合皮の細いストラップにシルバーバックルを備えた首輪。"
  },
  {
    id: "ACCESSORY_004",
    name: "刻印付きドッグタグ",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 2, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "認識番号が刻印された、錆びたチェーン付き真鍮ドッグタグ。"
  },
  {
    id: "ACCESSORY_005",
    name: "ラバーリストバンド",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 1, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ストリートで配布されているシンプルな黒いシリコンバンド。"
  },
  {
    id: "ACCESSORY_006",
    name: "シルバーチェーンネックレス",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 3,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "安価なシルバーで作られた細めの小判型チェーン。"
  },
  {
    id: "ACCESSORY_007",
    name: "真鍮アームバングル",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 2, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ハンマーで叩き出して成形されたシンプルな真鍮製の腕輪。"
  },
  {
    id: "ACCESSORY_008",
    name: "ネオンラバーキーホルダー",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 2,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ビビッドピンクのゴム製ロゴチャームキーリング。"
  },
  {
    id: "ACCESSORY_009",
    name: "スカルピンバッジ",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 15, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ジャケットの襟元やバッグにピンで固定する小さなドクロの金属バッジ。"
  },
  {
    id: "ACCESSORY_010",
    name: "編み込み革ブレス",
    rarity: "N",
    slot_type: "ACCESSORY",
    atk: 0, def: 1, hp: 0, spd: 0, luk: 1,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "黒とブラウンの本革の紐を編み込んで作ったブレスレット。"
  },
  {
    id: "ACCESSORY_011",
    name: "ブランドクロノグラフ",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 50, spd: 2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "アナログ式のクロノグラフ文字盤を備えた、黒塗装のスチールウォッチ。"
  },
  {
    id: "ACCESSORY_012",
    name: "極太ゴールドチェーン",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 6,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "首元で激しく主張する、18Kメッキが施された極太のマイアミリンクチェーン。"
  },
  {
    id: "ACCESSORY_013",
    name: "スクエア印台リング",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 5, def: 0, hp: 0, spd: 0, luk: 4,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "大きな四角い台座を備えた、重厚なキャスト製ブラス指輪。"
  },
  {
    id: "ACCESSORY_014",
    name: "チタンチョーカー",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 8, hp: 0, spd: 2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "マット仕上げのチタン合金で作られた首輪。"
  },
  {
    id: "ACCESSORY_015",
    name: "スパイクスタッズリストバンド",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 4, def: 4, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "幅3cmの黒レザーバンドに1cmの円錐スタッズを並べたリストバンド。"
  },
  {
    id: "ACCESSORY_016",
    name: "カミソリ刃ペンダント",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 6, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "本物のカミソリ刃の形状を忠実に再現したシルバー製ペンダント。"
  },
  {
    id: "ACCESSORY_017",
    name: "ギャンブラーダイス",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 8,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "半透明の赤い樹脂で作られた一対のサイコロ。"
  },
  {
    id: "ACCESSORY_018",
    name: "ユーティリティベルト",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 10, hp: 30, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "複数のアタッチメント用ループを備えたナイロンウェビング製ベルト。"
  },
  {
    id: "ACCESSORY_019",
    name: "シルバーゴシックスカルリング",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 4, def: 0, hp: 0, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ドクロが細部まで立体的に彫り込まれた925シルバー製リング。"
  },
  {
    id: "ACCESSORY_020",
    name: "スタッドイヤーカフ",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 3, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "耳たぶの縁に挟み込むだけのシンプルなスチール製イヤーカフ。"
  },
  {
    id: "ACCESSORY_021",
    name: "スチールウォレットチェーン",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 7,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ダブルクリップ仕様の頑丈なスチール製リンクチェーン。"
  },
  {
    id: "ACCESSORY_022",
    name: "ゴシッククロスペンダント",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 4, hp: 60, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "伝統的な百合のモチーフをあしらった中型のシルバー十字架ペンダント。"
  },
  {
    id: "ACCESSORY_023",
    name: "スマートフィットトラッカー",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 40, spd: 4, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ラバーバンドとモノクロ液晶を備えた、薄型のデジタルアタッチメント。"
  },
  {
    id: "ACCESSORY_024",
    name: "コブラバングル",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 5, def: 0, hp: 0, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "蛇が巻き付くデザインのシルバーバングル。"
  },
  {
    id: "ACCESSORY_025",
    name: "弾丸シェルネックレス",
    rarity: "R",
    slot_type: "ACCESSORY",
    atk: 8, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "ライフルの空薬莢をチャームにしたペンダント。"
  },
  {
    id: "ACCESSORY_026",
    name: "アンティークロケットペンダント",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 100, spd: 0, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の被回復効果+15%。",
    description: "家族の写真が収められた、細工の細かいアンティークシルバーのロケット。"
  },
  {
    id: "ACCESSORY_027",
    name: "プラチナ印台リング",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 10, def: 0, hp: 0, spd: 0, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "ターン開始時に常時自身のHPを15回復。",
    description: "純プラチナを台座にした最高級のシグネットリング。"
  },
  {
    id: "ACCESSORY_028",
    name: "解錠ツールキーホルダー",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 8, hp: 0, spd: 6, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "バトル開始時に自身の最初のカードプレイ時の消費AP-1（最低1）。",
    description: "複数のピッキングピンを備えた、隠密活動用のキーホルダー型ツールセット。"
  },
  {
    id: "ACCESSORY_029",
    name: "ブルーサファイアリング",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 4, luk: 12,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時クリティカル率+8%。",
    description: "深青色のサファイアをあしらった指輪。闘争のツキを呼び込む。"
  },
  {
    id: "ACCESSORY_030",
    name: "極太クロームチェーン",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 12, def: 0, hp: 0, spd: 0, luk: 8,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のATK+5%。",
    description: "職人が一本ずつ磨き上げた、鏡面仕上げ of クローム合金製ヘヴィチェーン。"
  },
  {
    id: "ACCESSORY_031",
    name: "死神のシルバーチャーム",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 200, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身が戦闘不能になるダメージを受けた際、1度だけHP1で耐える（食いしばり）。",
    description: "鎌を持つ死神を精巧に彫った銀のお守り。死線を彷徨う者を踏みとどまらせる。"
  },
  {
    id: "ACCESSORY_032",
    name: "百合の刻印ネックレス",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 14, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "出血状態の敵を攻撃した際、常時与ダメージ+20%。",
    description: "ゴシック様式の百合の紋章が刻まれた、鋭いエッジを持つペンダント。"
  },
  {
    id: "ACCESSORY_033",
    name: "ヘヴィスパイクチョーカー",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 8, def: 12, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時被ダメージの8%を攻撃者に物理反射する。",
    description: "太い本革に3cmの金属スパイクが突き出た、パンクテイストのチョーカー。"
  },
  {
    id: "ACCESSORY_034",
    name: "ダイヤモンドアンカーリング",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 80, spd: 0, luk: 15,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の状態異常耐性+12%。",
    description: "ダイヤモンドを散りばめた錨マークのプラチナ指輪。精神を不動に保つ。"
  },
  {
    id: "ACCESSORY_035",
    name: "原石ターコイズバングル",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 15, hp: 0, spd: 0, luk: 9,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "ターン開始時に常時自身のシールド（DEF）+20。",
    description: "天然のターコイズ原石を嵌め込んだ銀のバングル。"
  },
  {
    id: "ACCESSORY_036",
    name: "天然水晶チャーム",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 180, spd: 0, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "自身がヒールカードを使用した際、その回復効果+15%。",
    description: "水晶の結晶をそのまま吊り下げたペンダント。"
  },
  {
    id: "ACCESSORY_037",
    name: "スマートウォッチPRO",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 120, spd: 10, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "バトル開始時に自身のタイムライン進行速度+8%。",
    description: "空間にシステムウィンドウを投影する、特殊ルートから入手したスマートデバイス。"
  },
  {
    id: "ACCESSORY_038",
    name: "黒のトライバルシール",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 15, def: -5, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の与ATKダメージ+10%。",
    description: "首元や腕に貼ることで闘争本能を極限まで刺激する、鋭利なタトゥーステッカー。"
  },
  {
    id: "ACCESSORY_039",
    name: "鉄製シャックルブレス",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 12, hp: 0, spd: 0, luk: 10,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "自身にデバフが付与された時、常時自身のDEF+15%。",
    description: "鉄格子の手錠をリメイクして作った無骨なブレスレット。"
  },
  {
    id: "ACCESSORY_040",
    name: "ルビーゴールドチャーム",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 16, def: 0, hp: 0, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "クリティカル発生時に常時自身のHPを30回復。",
    description: "鮮血のような深紅のルビーが嵌め込まれた、ゴールドのネックレストップ。"
  },
  {
    id: "ACCESSORY_041",
    name: "強化カーボン戦闘グローブ",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 10, def: 10, hp: 0, spd: 2, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の通常攻撃時の獲得AP+5%（ゲージ加算）。",
    description: "拳の部分に本物のカーボンファイバーを採用した、軍用の戦闘グローブ。"
  },
  {
    id: "ACCESSORY_042",
    name: "スネークアンクレット",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 8, luk: 11,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の回避成功率+3%。",
    description: "足首を飾る、銀製のコブラを模したアンクレットチェーン。"
  },
  {
    id: "ACCESSORY_043",
    name: "スチールスカルキーチェーン",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 14,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "バトル勝利時の獲得キャッシュ+10%。",
    description: "重厚なスチールキャストで成形されたドクロのキーチェーン。強運をもたらす。"
  },
  {
    id: "ACCESSORY_044",
    name: "チタンアスリートバンド",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 18, hp: 100, spd: 0, luk: 0,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身が受ける「毒」のダメージを50%軽減する。",
    description: "特殊チタン内蔵 of シリコンリストバンド。"
  },
  {
    id: "ACCESSORY_045",
    name: "オパール襟ピンバッジ",
    rarity: "SR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 0, luk: 18,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身のデバフ付与成功率+10%。",
    description: "虹色の光沢を放つ高級オパールを使用した襟ピン。相手の判断力を狂わせる。"
  },
  {
    id: "ACCESSORY_046",
    name: "極道幹部の翡翠守り",
    rarity: "SSR",
    slot_type: "ACCESSORY",
    atk: 5, def: 5, hp: 50, spd: 5, luk: 5,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: "常時自身の全被ダメージを5%軽減 ＆ 常時与ダメージを5%上昇。",
    description: "横浜の中国系組織の老大が持つとされる、魔除けの効果を持つ最高級の翡翠のアミュレット。"
  },
  {
    id: "ACCESSORY_047",
    name: "【保留専用：サクラ専用】漆塗りの桜根付",
    rarity: "SSR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 0, spd: 10, luk: 10,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "サクラ専用 / 通常攻撃時に100%の確率で敵を3ターン「出血（毎ターン30ダメ）」にする。",
    description: "【保留】対象キャラクターアセット未実装のため枠のみ保留。画像生成なし。"
  },
  {
    id: "ACCESSORY_048",
    name: "【レイジ専用】蜘蛛の巣の首飾り",
    rarity: "SSR",
    slot_type: "ACCESSORY",
    atk: 20, def: 0, hp: 0, spd: 8, luk: 0,
    is_exclusive: true, exclusive_character_id: "11111111-1111-1111-1111-111111111111", // Reiji
    effect_description: "レイジ専用 / 敵を撃破した際、100%の確率で自身のAPが即座に1回復する。",
    description: "首筋の蜘蛛の巣タトゥーに重なるようにデザインされた、レイジ特製のスチールチョーカー。"
  },
  {
    id: "ACCESSORY_049",
    name: "【ルイ専用】タクティカル・イヤーカフ",
    rarity: "SSR",
    slot_type: "ACCESSORY",
    atk: 0, def: 15, hp: 0, spd: 15, luk: 0,
    is_exclusive: true, exclusive_character_id: "33333333-3333-3333-3333-333333333333", // Rui
    effect_description: "ルイ専用 / ターン開始時、20%の確率で自身のAPを追加で1獲得する。",
    effect_trigger_type: "ON_TURN_START",
    effect_visual_type: "vfx_buff",
    description: "ルイの耳元にフィットする高感度ノイズキャンセリング式イヤーカフ。秋葉原の闇ルートで仕入れた高性能通信デバイス。"
  },
  {
    id: "ACCESSORY_050",
    name: "【ケンゴ専用】狂犬の数珠",
    rarity: "SSR",
    slot_type: "ACCESSORY",
    atk: 25, def: 0, hp: 150, spd: 0, luk: 0,
    is_exclusive: true, exclusive_character_id: "99999999-9999-9999-9999-999999999999",
    effect_description: "ケンゴ専用 / 敵に与えたダメージの10%分、常時自身のHPを回復する（吸血）。",
    description: "ケンゴが首に巻いている、磨き上げられた黒檀の巨大な数珠。狂犬の血の渇きを癒やす。"
  },
  {
    id: "ACCESSORY_051",
    name: "福呼びの守り",
    rarity: "SSR",
    slot_type: "ACCESSORY",
    atk: 0, def: 0, hp: 100, spd: 0, luk: 25,
    is_exclusive: false, exclusive_character_id: null,
    effect_description: null,
    description: "古い裏社会の仲間から譲り受けた、銃弾を弾くと言われる幸運のお守り。鈍く輝く金属の縁取り。"
  }
];

# 仕様書と実装のギャップ一覧

更新日: 2026-08-03

仕様書に記載された機能を、現行の`src/`・Supabase migration・Preview確認結果と照合した結果です。

## 優先度A（機能追加前に仕様確定が必要）

企画方針として、PvP・GvG・レイドを継続の中心、ガチャを課金の主軸、時間短縮を副軸とする。シナリオ／ADV／アバターは初回リリース対象外へ変更した。

| 項目 | 仕様上の要求 | 現状 | 次アクション |
|---|---|---|---|
| Stripe決済 | Stripe Checkout / Webhook、冪等な課金処理 | クライアントから開発用RPC`process_stripe_shop_purchase`を呼ぶ実装はあるが、`src/app/api`のCheckout/Webhookエンドポイントがない | Stripe API・Webhook境界を設計し、Preview用テストモードで実装・検証 |
| シナリオ/ADV | `flow_nodes`形式の会話フロー、選択肢・分岐・セーブ復帰 | 現行`src`にシナリオエンジンと`flow_nodes`実行処理が見当たらない | 初回リリース対象外。別計画へ保留 |
| DM/ギルドチャット | 双方向Realtime、受信表示、未読・再接続 | BBSはRealtime購読済み。DM送信はあるが、DM取得・Realtime購読・未読管理が不足 | `direct_messages`/`user_chats`の所有者・参加者RLS、購読、未読状態を実装 |

## 優先度B（仕様上は存在するが部分実装・意図的停止）

| 項目 | 現状 | 次アクション |
|---|---|---|
| アバター作成UI | データ構造・描画・同期は保持されているが、仕様書どおり通常導線からオミット | 初回リリース対象外。再開時に別計画を作成 |
| 専用装備画像 | マスタ枠は存在するが、対象キャラクター画像が未生成の装備が7件 | 画像生成・配置・Preview表示確認 |
| 初期アセット数 | 仕様書の初期実装数とマスタ実数に差分がないか要棚卸し | マスター件数を自動集計し、初期実装/アップデート在庫を確定 |
| 決済・購入履歴 | RPCと`payment_transactions`はあるが、実決済の外部連携は未検証 | Stripe Test modeでWebhook冪等性・返金/失敗を検証 |

## 優先度C（品質・運用）

- 既存Lintエラーの段階的解消（全体Lintは未通過）。
- 残存する広範RLSポリシー（主にギルド・PvP/GvG/レイド・チャット）の機能単位ハードニング。
- Playwright等によるPreview E2E導入と、主要導線の実機自動検証。
- 本番前の負荷試験、バックアップ復旧訓練、運用監視設計。

## 実装済みとして扱える主要領域

キャラクター/スキル/装備ガチャ、通貨・チケット・無料10連、ピティ・交換、公開プロフィール/ランキング、PvP/GvG/レイドの主要RPC、所有者RLS、BBS Realtime、Preview配信・ビルド・型検査は開発環境で検証済みです。
Priority correction: GvG is the primary retention loop. Raid, PvP, and quests are supporting loops, followed by collection, growth, and social rewards.

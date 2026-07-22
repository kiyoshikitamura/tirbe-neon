const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../src/app/components/HomeTab.css');
if (!fs.existsSync(cssPath)) {
  console.error("Error: HomeTab.css not found!");
  process.exit(1);
}

let content = fs.readFileSync(cssPath, 'utf8');

// 1. mypage-left-column と mypage-pc-members-sidebar のレスポンシブ幅としなやかなフレックス伸縮ルールの適用
const layoutQueryRegex = /@media\s*\(min-width:\s*768px\)\s*\{[\s\S]*?\}\s*\}\s*\}\s*\}\s*\}\s*\/\* PC版左カラムチャチ/;
// 安全な記述のために、末尾に強制オーバーライドとして追加する手法を取ります
// (既存の@media (min-width:768px) ルールを完全に上書きして統合するCSSを追加)

const finalPcStyles = `
/* PC用：モックアップ完全再現（非カード形式シームレスリスト ＆ レスポンシブ伸縮） */
@media (min-width: 768px) {
  .mypage-main-layout-wrapper {
    display: flex !important;
    flex-direction: row !important;
    justify-content: center !important;
    align-items: center !important;
    height: 100% !important;
    overflow: hidden !important;
    width: 100% !important;
    box-sizing: border-box !important;
    gap: 12px !important;
  }

  /* 中央メイン：固定幅を排除し、最小360px〜最大480pxの間でしなやかに伸縮 */
  .mypage-left-column {
    flex: 1.3 !important;
    max-width: 480px !important;
    min-width: 360px !important;
    height: calc(100% - 32px) !important;
    margin: 16px 6px !important;
    background: rgba(12, 16, 26, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  /* 右側サイドスレート：固定幅を排除し、最小260px〜最大360pxの間で伸縮。1枚のソリッドプレート背景 */
  .mypage-pc-members-sidebar {
    display: flex !important;
    flex-direction: column !important;
    flex: 0.9 !important;
    max-width: 360px !important;
    min-width: 260px !important;
    background: rgba(8, 10, 16, 0.95) !important; /* モックアップ通りの重厚な1枚の背景板 */
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
    box-sizing: border-box !important;
    height: calc(100% - 32px) !important;
    margin: 16px 16px 16px 6px !important;
    overflow: hidden !important;
  }

  /* 非カード形式・シームレスメンバーリストアイテムのスタイリング (モックアップ完全準拠) */
  .sidebar-member-card {
    display: flex !important;
    width: 100% !important;
    align-items: center !important;
    background: transparent !important; /* 背景カードを廃止して透明に */
    border: none !important; /* 個別のカード外枠線を廃止 */
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important; /* 区切りのスリット線のみ適用 */
    box-shadow: none !important; /* 影を廃止 */
    border-radius: 0 !important;
    padding: 12px 16px !important;
    gap: 12px !important;
    box-sizing: border-box !important;
    transition: background 0.2s ease !important;
    align-self: stretch !important;
  }

  .sidebar-member-card:hover {
    background: rgba(255, 255, 255, 0.03) !important;
    transform: none !important;
  }

  /* アバター枠を上品な丸みのある四角形に */
  .member-avatar-wrapper {
    width: 44px !important;
    height: 44px !important;
    border-radius: 4px !important; /* 角丸四角枠 */
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: #000 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .member-avatar-img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }

  .member-card-info-col {
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 5px !important;
    min-width: 0 !important;
  }

  .member-header-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  }

  .member-name {
    font-size: 11px !important;
    font-weight: 800 !important;
    color: #fff !important;
  }

  .member-level {
    font-size: 9px !important;
    font-weight: 700 !important;
    color: var(--neon-cyan) !important;
  }

  .member-stats-row {
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
  }

  .member-stat-item {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: 8px !important;
  }

  .stat-label {
    width: 20px !important;
    color: rgba(255, 255, 255, 0.4) !important;
    font-weight: 700 !important;
  }

  .stat-bar-bg {
    flex: 1 !important;
    height: 4px !important;
    background: rgba(0, 0, 0, 0.4) !important;
    border-radius: 1px !important;
    overflow: hidden !important;
  }

  .stat-bar-fill {
    height: 100% !important;
    border-radius: 1px !important;
  }

  .fill-hp {
    background: var(--neon-cyan) !important;
  }

  .fill-atk {
    background: var(--neon-magenta) !important;
  }

  .fill-def {
    background: #ffffff !important;
  }

  .stat-value {
    width: 28px !important;
    text-align: right !important;
    color: #fff !important;
    font-weight: 700 !important;
  }
}
`;

// 重複追加を防ぐ処理
if (!content.includes('PC用：モックアップ完全再現（非カード形式シームレスリスト')) {
  content += finalPcStyles;
  console.log("Successfully appended mockup-accurate layout styling overrides");
}

fs.writeFileSync(cssPath, content, 'utf8');
console.log("CSS file update operations completed successfully.");

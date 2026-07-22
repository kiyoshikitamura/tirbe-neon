const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../src/app/components/HomeTab.css");
const css = fs.readFileSync(cssPath, "utf8");
const lines = css.split("\n");

console.log("--- SEARCH RESULTS ---");
lines.forEach((line, idx) => {
  if (line.includes("mypage-buttons-menu-container") || line.includes("mypage-pc-top-hud-row") || line.includes("base-status-overlay") || line.includes("mypage-calligraphy-menu-btn")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

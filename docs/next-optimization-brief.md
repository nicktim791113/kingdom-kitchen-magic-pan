# 王國廚房：後續優化交接文案

這份文件給新的對話視窗接手使用。請從目前 GitHub 上的最新版開始，不要重做已完成的圖片替換工作。

## 目前完成狀態

- 遊戲是單一 `index.html` Canvas 小遊戲，主流程為：選水果、客人點餐、清洗、魔法備料、下鍋、攪拌、獎勵貼紙、貼紙書。
- 已完成四種水果內容：蘋果、香蕉、草莓、橘子。
- 已加入生成式水彩 PNG 資產：
  - `assets/sprites/fruit/`：完整水果。
  - `assets/sprites/prep/`：備料完成狀態。
  - `assets/sprites/characters/`：主廚與四位客人。
  - `assets/sprites/environment/`：廚房背景、鍋子、湯碗。
- 圖片渲染策略是「PNG 優先、Canvas 備援」，請延續這個方式。
- 已加入第一輪動態 polish：鍋子微光、蒸氣飄動、貼紙閃光。
- 測試流程目前使用：
  - `npm run test:flow`
  - `npm run test:responsive`
  - `node C:\Users\nickt\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js --url http://127.0.0.1:5173/index.html --click 250,415 --iterations 2 --pause-ms 250 --screenshot-dir output/<name>`

## 下一階段建議順序

1. 新增一個新食材和新食譜

建議先新增「胡蘿蔔」或「南瓜」，因為顏色清楚、幼兒容易辨識，也能跟現有甜湯風格搭配。新增內容時要同步補齊：

- `FRUITS` 資料：名稱、湯名、顏色、客人台詞、備料動作。
- 互動流程：可以沿用 tap prep，也可以做簡單「刷一刷」或「灑一灑」。
- 生成圖片：完整食材、備料完成圖、貼紙顯示。
- `test-full-flow.cjs`：加入新食材完整流程。

2. 增加一個極簡新互動

建議新增「灑魔法星星」作為烹煮前的小步驟，比較符合目前魔法廚房調性，而且不需要真實刀具。互動可以是：

- 點三次調味瓶。
- 或拖曳小星星到鍋子上方。
- 完成後產生一圈小粒子，再進入 cook/stir。

3. 強化獎勵與收藏感

目前貼紙書已可累積星星，下一步可以讓收藏更有期待感：

- 每種水果完成第 1、2、3 碗時貼紙逐步變亮。
- 第 3 碗顯示一個小皇冠或亮框。
- 獎勵畫面多一個「貼到書上」的小動畫。

4. 做父母設定或幼兒友善選項

建議新增一個簡單設定面板，不要太早做複雜帳號或資料系統：

- 音效開關目前已有，可整理成設定入口。
- 加入「降低閃光」選項，讓動畫更柔和。
- 加入「慢速模式」，延長提示與完成停留時間。

5. 程式結構整理

當新增一個新食材後，再進行拆檔會比較合適。建議拆成：

- `src/data.js`：水果、客人、食譜資料。
- `src/assets.js`：圖片載入與 fallback helper。
- `src/render.js`：渲染函式。
- `src/input.js`：互動處理。
- `src/game.js`：狀態、流程與 update loop。

拆檔時要保持 `window.render_game_to_text` 和 `window.advanceTime(ms)`，測試腳本依賴它們。

## 新對話可直接使用的起始提示

請接手 `kingdom-kitchen-magic-pan` 這個專案。先閱讀 `docs/next-optimization-brief.md`、`index.html`、`test-full-flow.cjs`，確認目前已完成水果/備料/角色/環境 PNG 替換與動態 polish。接著請從「新增一個新食材和新食譜」開始，優先選胡蘿蔔或南瓜，延續現有的 PNG 優先、Canvas 備援策略。完成後請跑 `npm run test:flow`、`npm run test:responsive`，並用 Playwright 截圖檢查新增流程。

## 實作注意事項

- 不要重做已經存在的圖片資產，除非畫面檢查發現明顯問題。
- 新增圖片時，請放在既有資料夾結構下，命名保持英文小寫與連字號。
- 每次新增互動都要更新 `render_game_to_text`，讓測試能理解目前狀態。
- 每次改畫面後都要檢查桌機和手機截圖，避免文字或按鈕重疊。
- 如果要推 GitHub，先確認 `git status` 只包含這次任務相關檔案。

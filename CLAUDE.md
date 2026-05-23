# Magic Kitchen — Claude 工作規則

> 這是專案的工作規範文件。每次開新的 session 都會自動先讀這份。**動工前請先看完。**

---

## 1. 工作流程鐵則

### 1.1 做完一定要 commit + push

每次完成一個任務（功能、修 bug、改文案、調樣式……任何使用者請求的事），收尾時**自動**做以下三步，不需要再問使用者：

1. `git add` 你改過的具體檔案（**不要用 `git add -A` 或 `git add .`**，避免把 token、log、暫存檔等掃進去）
2. `git commit` 使用下面 1.2 的 author identity 與訊息格式
3. `git push origin main`

如果途中遇到問題（pre-commit hook 失敗、push 被拒等），先排除問題再重推，不要靜悄悄略過。

### 1.2 Commit 規則

- **Author identity（每次 commit 都要帶）：**
  ```
  git -c user.name="chiwei" -c user.email="nicktim1113@hotmail.com" commit -m "..."
  ```
  本機沒有設 global git config，靠 `-c` 帶。
- **訊息格式：** 第一行祈使句 ≤ 70 字（英文或中文皆可），空一行後寫條列原因／影響。最後一行加：
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- **多行訊息用 heredoc**：
  ```bash
  git commit -m "$(cat <<'EOF'
  Short imperative subject

  - bullet 1
  - bullet 2

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

### 1.3 分支策略：沒有分支

- **只用 `main`。** 不開 feature branch、不開 PR、不用 `claude/*` 命名。
- 直接 `git push origin main`。
- 想做實驗時也是直接改 main，因為使用者偏好「線性歷史 + 隨時可推」。

### 1.4 不要把 secret 寫進 commit

- PAT 放在父資料夾的 `ghp_*` 開頭檔案中（檔名與內容皆為 token）。已寫入 `origin` 的 push URL，一般 `git push` 即可。
- **絕對不要把 token、API key、密碼寫進任何被 commit 的檔案**（包括 CLAUDE.md、README、註解）。GitHub Secret Scanning 會擋下推送，而且 token 一旦進 git history 就要 rotate。
- 換 token 時：
  ```
  git remote set-url origin https://<NEW_TOKEN>@github.com/nicktim791113/kingdom-kitchen-magic-pan.git
  ```

### 1.5 不要主動做這些事

- ❌ `git push --force` 或 `--force-with-lease` 到 main（會弄丟東西）
- ❌ `git config --global` 任何設定（用 `-c` 帶 per-command 即可）
- ❌ 跳過 hook（`--no-verify`、`--no-gpg-sign`）
- ❌ 刪除遠端任何不是自己這次建立的東西
- ❌ 自動建立新的 GitHub repo / 改 repo 設定 / 改權限

### 1.6 何時要先問使用者

只有遇到以下情況才停下來問：
- 要做**不可逆**的破壞操作（force push、刪 main 上的東西、reset 掉使用者的 commit）
- 使用者的需求**模糊到有多種合理解讀**（且差異會影響大量工作）
- 要花錢（額外服務、付費 API）

其他狀況**直接做**，不要問「要繼續嗎？」。使用者已經多次說「你就是幫我做」。

---

## 2. 溝通風格

- **用繁體中文**回覆使用者（程式碼註解可中可英，commit 訊息英文較簡潔，但兩者都可）。
- 報告結果時用**表格或 bullet 列重點**，避免長篇大論。
- 改了什麼、影響什麼、推上去沒，三件事必須清楚交代。
- 不要在每次回應都重複「我會……」「接下來……」的旁白，做就對了。

---

## 3. 專案技術參考

### 3.1 Repo

- **遠端：** https://github.com/nicktim791113/kingdom-kitchen-magic-pan
- **唯一分支：** `main`
- **目標族群：** 2-3 歲幼兒
- **部署：** GitHub Pages（每次 push main 都會自動發布）

### 3.2 程式碼架構

- **單檔遊戲：** 整個遊戲畫在 `<canvas>` 上，邏輯與樣式都 inline 在 `index.html`（~3300 行）。**沒有 `js/` 或 `css/` 拆檔**（之前有人嘗試拆過然後放棄，現在 main 就是回到 inline 版本）。
- **PWA：** `manifest.json` + `sw.js` 提供安裝與離線。
- **PWA 圖示：** `assets/icons/`
- **遊戲美術：** `assets/sprites/{characters,environment,fruit,prep}/` 水彩風 sprite
- **音訊：** `assets/sounds/sunny_kitchen_prep.mp3`（背景音樂 loop）

### 3.3 狀態存檔（`localStorage`）

| Key | 內容 |
|---|---|
| `kingdomKitchenStickers` | 貼紙簿進度，每水果 `{ count: number }` |
| `kingdomKitchenAudio` | 音訊偏好 `{ mute, bgmMute }` |

### 3.4 音訊系統

- `state.mute` — 旁白＋音效靜音（畫布右上「聲/靜」按鈕，hit rect `hit.mute`）
- `state.bgmMute` — 背景音樂靜音（畫布右上「♪」按鈕，hit rect `hit.bgm`，在 mute 左邊）
- `audio.beep(...)` — 音效（震動 / 滴聲，Web Audio Oscillator）
- `audio.startBgm()` / `audio.toggleBgm()` — BGM 透過 Web Audio + GainNode，0.8 s 淡入、0.25 s 淡出
- `speak(text)` — SpeechSynthesis；偏好挑 zh-TW Premium → Enhanced → Google → 其他，rate=0.95、pitch=1.1
- 首次 `pointerDown` 時嘗試啟動 BGM（瀏覽器 autoplay 政策限制）

### 3.5 測試

`*.cjs` 是 Puppeteer 腳本（`_shot.cjs`、`test-full-flow.cjs`、`test-responsive.cjs`），會讀 canvas 透過 `window.__gameState` 之類管道暴露的 payload。**新增任何 UI 互動按鈕時，記得在 `interactiveTargets` 物件裡導出新的 rect**，否則測試流程無法定位。範例：
```js
interactiveTargets: {
  ...
  muteButton: hit.mute,
  bgmButton: hit.bgm
}
```

### 3.6 改動時的小檢查

- 新增按鈕 → 同時加 `hit.xxx` rect、`draw 函式`、`pointerDown` 處理、`interactiveTargets` 導出
- 新增 `state.xxx` 偏好 → 同時更新 `loadAudioPrefs` / `saveAudioPrefs`（或對應的 storage 函式）
- 新增 sprite 資產 → 放在 `assets/sprites/<類別>/` 並在 `fruitSprites` / `kitchenSprites` 註冊
- 改美術後檢查所有 mode（menu / order / wash / cut / cook / stir / reward / book）都能正常顯示

---

## 4. 出包時的處理

| 狀況 | 處理 |
|---|---|
| Push 被 secret scanning 擋 | 把含 secret 的 commit `--amend` 掉（commit 還沒進遠端，安全），重推 |
| Push 被 non-fast-forward 擋 | `git fetch origin && git rebase origin/main`，解 conflict 後重推 |
| Commit 後發現拼錯字 | 直接 `--amend`（如果還沒 push）或新 commit（如果已 push） |
| 不小心 commit 了不該進 repo 的檔案 | `git reset --soft HEAD~1`、unstage、再 commit 一次（push 前） |
| 測試失敗 | 不要 push，先修，修完再 push |

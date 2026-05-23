# Magic Kitchen — Claude 操作說明

## 推送設定（使用者明示偏好）

- **目標 repo：** https://github.com/nicktim791113/kingdom-kitchen-magic-pan
- **目標分支：永遠是 `main`。直接 `git push origin main`，不開 feature branch、不開 PR。**
- **PAT 位置：** 父資料夾 `..\` 下有一個 `ghp_*` 開頭的檔案，檔名與內容皆為 token（內容已寫入 `origin` 的 push URL，所以一般 `git push` 即可）。**請不要把 token 內容寫進任何 commit**，會被 GitHub secret scanning 擋下來。
  - 換 token 時：`git remote set-url origin https://<NEW_TOKEN>@github.com/nicktim791113/kingdom-kitchen-magic-pan.git`

## Git author identity

之前的 commit 都用 `chiwei <nicktim1113@hotmail.com>`。沒設 global config，commit 時用：
```
git -c user.name="chiwei" -c user.email="nicktim1113@hotmail.com" commit -m "..."
```

## 程式碼架構（main 分支）

- **單檔遊戲：** 整個遊戲畫在 `<canvas>` 上，邏輯與樣式都 inline 在 `index.html`（~3300 行）。沒有 `js/`、`css/` 拆檔。
- **PWA：** `manifest.json` + `sw.js` 提供安裝與離線。
- **資產：**
  - `assets/icons/` — PWA 圖示
  - `assets/sprites/{characters,environment,fruit,prep}/` — 遊戲水彩美術
  - `assets/sounds/sunny_kitchen_prep.mp3` — 背景音樂（loop）
- **狀態存檔：** `localStorage`
  - `kingdomKitchenStickers` — 貼紙簿進度
  - `kingdomKitchenAudio` — 音訊偏好 `{ mute, bgmMute }`

## 音訊系統重點

- `state.mute` — 旁白與音效靜音（畫布右上「聲/靜」按鈕）
- `state.bgmMute` — 背景音樂靜音（畫布右上「♪」按鈕，在 mute 左邊）
- `audio.beep(...)` — 音效（震動 / 滴聲）
- `audio.startBgm()` / `audio.toggleBgm()` — BGM 透過 Web Audio + GainNode 控制，含 0.8 秒淡入、0.25 秒淡出
- `speak(text)` — SpeechSynthesis；偏好挑 zh-TW Premium / Enhanced / Google 語音，rate=0.95、pitch=1.1
- 首次 `pointerDown` 時嘗試啟動 BGM（瀏覽器自動播放政策限制）

## 測試

`*.cjs` 是 Puppeteer 腳本，會讀 canvas 暴露給 window 的 payload。新增 UI 按鈕時記得在 `interactiveTargets` 裡導出新的 rect（範例：`bgmButton: hit.bgm`）。

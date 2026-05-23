#!/usr/bin/env bash
# Mac/Linux 版本的推送腳本（push.ps1 的 bash 對應版）。
# 用法：
#   bash scripts/push.sh                                # 自動帶日期當 commit 訊息
#   bash scripts/push.sh "你的 commit 訊息"             # 自訂 commit 訊息
#
# 流程：
#   1. cd 到專案根目錄
#   2. git status 顯示目前修改
#   3. git add . 把所有變更加入暫存
#   4. 若有變更：commit（用傳入的訊息或自動產生的時間戳）
#   5. git pull --rebase origin main 拉取遠端最新
#   6. git push origin main 推上去
#
# 失敗時會立即停下並顯示錯誤。

set -e

# 切到專案根（這個腳本所在的上層）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

MESSAGE="${1:-}"
if [ -z "$MESSAGE" ]; then
  MESSAGE="Update game $(date '+%Y-%m-%d %H:%M')"
fi

echo "==> Current status:"
git status --short

echo ""
echo "==> Staging all changes..."
git add .

STAGED="$(git diff --cached --name-only)"
if [ -z "$STAGED" ]; then
  echo "No staged changes to commit."
else
  echo ""
  echo "==> Committing with message: $MESSAGE"
  git commit -m "$MESSAGE"
fi

echo ""
echo "==> Pulling latest from origin/main (rebase)..."
# 在拉之前先把任何剩下的工作目錄修改藏起來，避免 OneDrive 即時觸發的小改動把 rebase 擋下來。
NEED_STASH=0
if [ -n "$(git status --porcelain)" ]; then
  NEED_STASH=1
  git stash push -u -m "auto-stash before push.sh rebase" >/dev/null
fi
git pull --rebase origin main
if [ "$NEED_STASH" = "1" ]; then
  git stash pop >/dev/null || true
fi

echo ""
echo "==> Pushing to origin/main..."
git push origin main

echo ""
echo "Pushed to GitHub. GitHub Pages will redeploy automatically after the workflow finishes."

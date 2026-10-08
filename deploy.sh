#!/usr/bin/env bash
# Multi-platform deployment helper for portfolieo.
# Usage: ./deploy.sh [--all | --vercel | --firebase | --github]
set -euo pipefail
cd "$(dirname "$0")"

TARGET="${1:---all}"

echo "==> Installing dependencies"
npm ci

echo "==> Building production bundle"
npm run build

[ -f dist/index.html ] || { echo "ERROR: dist/index.html missing"; exit 1; }

deploy_vercel() {
  echo "==> Deploying to Vercel"
  if [ ! -d .vercel ]; then
    vercel link --yes
  fi
  vercel --prod
}

deploy_firebase() {
  echo "==> Deploying to Firebase Hosting"
  firebase deploy --only hosting
}

deploy_github() {
  echo "==> Pushing to GitHub"
  git add -A
  git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S')"
  git push origin HEAD
}

case "$TARGET" in
  --vercel)   deploy_vercel ;;
  --firebase) deploy_firebase ;;
  --github)   deploy_github ;;
  --all)
    deploy_github
    deploy_vercel
    deploy_firebase
    ;;
  *)
    echo "Unknown option: $TARGET"
    echo "Usage: $0 [--all | --vercel | --firebase | --github]"
    exit 1
    ;;
esac

echo "==> Done: $TARGET"
#!/usr/bin/env bash
# انتشار APK و به‌روزرسانی لینک‌های دانلود در README
#
#   bash tools/apk/publish.sh
#
# این اسکریپت:
#   1. اطمینان از وجود فایل APK نسخهٔ ۲.۰.۰ در releases/
#   2. به‌روزرسانی لینک‌های دانلود در README.md (نام فایل + شاخهٔ جاری)
#   3. commit و push شاخهٔ جاری
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

APK_SRC="releases/windows-simulator.apk"
APK_DST="releases/Windows-in-Mobile-v2.0.0.apk"
BRANCH="$(git branch --show-current)"

if [[ -z "$BRANCH" ]]; then
  echo "❌ شاخهٔ جاری مشخص نیست (detached HEAD)."
  exit 1
fi

# ۱) اطمینان از وجود APK
if [[ ! -f "$APK_DST" ]]; then
  if [[ -f "$APK_SRC" ]]; then
    cp "$APK_SRC" "$APK_DST"
    echo "   APK از $APK_SRC کپی شد."
  else
    echo "❌ هیچ فایل APK یافت نشد ($APK_SRC / $APK_DST)."
    exit 1
  fi
fi
echo "   APK: $APK_DST ($(du -h "$APK_DST" | cut -f1))"

# ۲) به‌روزرسانی لینک‌های دانلود در README.md
python3 - "$BRANCH" <<'PY'
import sys
branch = sys.argv[1]
p = "README.md"
s = open(p, encoding="utf-8").read()
# نام فایل جدید
s = s.replace("releases/windows-simulator.apk", "releases/Windows-in-Mobile-v2.0.0.apk")
# اشارهٔ لینک‌های raw/cdn به شاخهٔ جاری (تا دانلود بلافاصله کار کند)
s = s.replace("app/raw/main/releases/Windows-in-Mobile-v2.0.0.apk",
              f"app/raw/{branch}/releases/Windows-in-Mobile-v2.0.0.apk")
s = s.replace("app@main/releases/Windows-in-Mobile-v2.0.0.apk",
              f"app@{branch}/releases/Windows-in-Mobile-v2.0.0.apk")
open(p, "w", encoding="utf-8").write(s)
PY

echo "   README.md به‌روزرسانی شد."

# ۳) commit و push
git add "$APK_DST" README.md tools/apk/publish.sh
if git diff --cached --quiet; then
  echo "   تغییری برای commit وجود ندارد."
else
  git commit -m "release: انتشار APK نسخهٔ ۲.۰.۰ (Windows-in-Mobile-v2.0.0.apk) و به‌روزرسانی لینک‌های دانلود"
fi

git push origin "$BRANCH"
echo "✅ انتشار انجام شد: شاخهٔ $BRANCH"

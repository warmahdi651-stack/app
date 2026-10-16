#!/usr/bin/env bash
# ساخت فایل نصبی (APK) «ویندوز در موبایل» بدون نیاز به Android Studio یا Gradle.
#
#   bash tools/apk/build.sh [--skip-export]
#
# ابزارهای لازم (خودکار دانلود می‌شوند):
#   - apktool + apksigner : از npm (@postar/apktool-node)
#   - android.jar (framework) : از مخزن Sable/android-platforms در GitHub
#   - JDK : از PyPI (jdk4py) در صورت نبود java در سیستم
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS="$ROOT/tools/apk/.tools"
PROJECT="$ROOT/tools/apk/android"
OUT_DIR="$ROOT/apps/mobile/dist-android"
APK_NAME="windows-simulator.apk"

SKIP_EXPORT=0
for arg in "$@"; do
  [[ "$arg" == "--skip-export" ]] && SKIP_EXPORT=1
done

mkdir -p "$TOOLS" "$OUT_DIR"

log() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

# ───────────────────────── ۱) جاوا ─────────────────────────
log "آماده‌سازی Java"
if command -v java >/dev/null 2>&1; then
  JAVA_BIN="$(command -v java)"
  KEYTOOL_BIN="$(command -v keytool || true)"
elif python3 -c "import jdk4py" >/dev/null 2>&1; then
  JAVA_BIN="$(python3 -c "import jdk4py,os;print(os.path.join(jdk4py.JAVA_HOME,'bin','java'))")"
  KEYTOOL_BIN="$(python3 -c "import jdk4py,os;print(os.path.join(jdk4py.JAVA_HOME,'bin','keytool'))")"
else
  echo "نصب jdk4py از PyPI ..."
  pip install --quiet --break-system-packages jdk4py
  JAVA_BIN="$(python3 -c "import jdk4py,os;print(os.path.join(jdk4py.JAVA_HOME,'bin','java'))")"
  KEYTOOL_BIN="$(python3 -c "import jdk4py,os;print(os.path.join(jdk4py.JAVA_HOME,'bin','keytool'))")"
fi
echo "   java: $JAVA_BIN"
"$JAVA_BIN" -version 2>&1 | head -1

# ───────────────────────── ۲) apktool و apksigner ─────────────────────────
log "دریافت apktool و apksigner"
if [[ ! -f "$TOOLS/apktool.jar" || ! -f "$TOOLS/apksigner.jar" ]]; then
  pushd "$TOOLS" >/dev/null
  # نام پوشه با «.» شروع می‌شود و npm init با آن خطا می‌دهد؛ پروژه را دستی می‌سازیم
  [[ -f package.json ]] || printf '{\n  "name": "wim-apk-tools",\n  "private": true,\n  "version": "1.0.0"\n}\n' > package.json
  npm install --no-audit --no-fund --silent @postar/apktool-node@0.3.4
  cp node_modules/@postar/apktool-node/lib/apktool.jar "$TOOLS/apktool.jar"
  cp node_modules/@postar/apktool-node/lib/apksigner.jar "$TOOLS/apksigner.jar"
  popd >/dev/null
fi
ls -la "$TOOLS"/*.jar

# ───────────────────────── ۳) framework (android.jar) ─────────────────────────
log "دریافت android.jar (فریم‌ورک اندروید ۱۴)"
FRAMEWORK="$TOOLS/android.jar"
if [[ ! -f "$FRAMEWORK" ]]; then
  SHA="923bafccf73aef996495c559e919ad8be3cabd58"
  curl -sL -H "Accept: application/vnd.github.raw+json" \
    "https://api.github.com/repos/Sable/android-platforms/git/blobs/$SHA" -o "$FRAMEWORK"
fi
[[ -s "$FRAMEWORK" ]] || { echo "❌ دریافت android.jar ناموفق بود"; exit 1; }
echo "   $FRAMEWORK ($(du -h "$FRAMEWORK" | cut -f1))"

# ───────────────────────── ۴) کلید امضا ─────────────────────────
log "کلید امضا (release.jks)"
KEYSTORE="$TOOLS/release.jks"
STOREPASS="windowssim"
if [[ ! -f "$KEYSTORE" ]]; then
  "$KEYTOOL_BIN" -genkeypair -v -keystore "$KEYSTORE" -storetype JKS \
    -alias windowssim -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$STOREPASS" -keypass "$STOREPASS" \
    -dname "CN=Windows Simulator, OU=Arena, O=WindowsInMobile, C=IR" >/dev/null 2>&1
  echo "   کلید تازه ساخته شد."
else
  echo "   کلید موجود استفاده می‌شود."
fi

# ───────────────────────── ۵) خروجی وب اپ ─────────────────────────
if [[ $SKIP_EXPORT -eq 0 ]]; then
  log "ساخت خروجی وب (expo export)"
  (cd "$ROOT/apps/mobile" && npx expo export --platform web --output-dir dist --clear >/dev/null)
fi

log "کپی دارایی‌ها به پروژهٔ apktool و اصلاح مسیرها"
node "$ROOT/tools/apk/scripts/patch-web-assets.mjs"

log "ساخت آیکون‌های لانچر"
python3 -c "import PIL" 2>/dev/null || pip install --quiet --break-system-packages pillow
python3 "$ROOT/tools/apk/scripts/make-icons.py"

# ───────────────────────── ۶) بیلد با apktool ─────────────────────────
log "بیلد با apktool"
UNSIGNED="$TOOLS/unsigned.apk"
rm -rf "$PROJECT/build" "$PROJECT/dist"
# نصب فریم‌ورک اندروید برای apktool (اگر قبلاً نصب نشده)
"$JAVA_BIN" -jar "$TOOLS/apktool.jar" if -p "$TOOLS" "$FRAMEWORK" >/dev/null 2>&1 || true
"$JAVA_BIN" -jar "$TOOLS/apktool.jar" b -f -p "$TOOLS" "$PROJECT" -o "$UNSIGNED"

# ───────────────────────── ۷) بازسازی (بدون فشرده‌سازی + هم‌ترازی) ─────────────────────────
log "بازسازی APK (منابع بدون فشرده‌سازی و هم‌تراز)"
ALIGNED="$TOOLS/aligned.apk"
node "$ROOT/tools/apk/scripts/repack.mjs" "$UNSIGNED" "$ALIGNED"

# ───────────────────────── ۸) امضا ─────────────────────────
log "امضای APK (v1 + v2 + v3)"
FINAL="$OUT_DIR/$APK_NAME"
"$JAVA_BIN" -jar "$TOOLS/apksigner.jar" sign \
  --ks "$KEYSTORE" --ks-key-alias windowssim \
  --ks-pass "pass:$STOREPASS" --key-pass "pass:$STOREPASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --min-sdk-version 21 --out "$FINAL" "$ALIGNED" 2>/dev/null

# ───────────────────────── ۹) بررسی ─────────────────────────
log "بررسی نهایی"
"$JAVA_BIN" -jar "$TOOLS/apksigner.jar" verify --verbose "$FINAL" 2>/dev/null | sed 's/^/   /'
echo
ls -la "$FINAL"
echo
DOWNLOAD_APK="$ROOT/apps/mobile/dist/Windows-in-Mobile-v2.0.1.apk"
mkdir -p "$(dirname "$DOWNLOAD_APK")"
cp "$FINAL" "$DOWNLOAD_APK"
echo "✅ APK ready: $FINAL"
echo "📥 Download copy: $DOWNLOAD_APK ($(wc -c < "$DOWNLOAD_APK") bytes)"

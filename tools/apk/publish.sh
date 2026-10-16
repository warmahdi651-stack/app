#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APK="$ROOT/apps/mobile/dist/Windows-in-Mobile-v2.0.0.apk"
SOURCE="$ROOT/apps/mobile/dist-android/windows-simulator.apk"
if [[ ! -s "$APK" && -s "$SOURCE" ]]; then
  mkdir -p "$(dirname "$APK")"
  cp "$SOURCE" "$APK"
fi
if [[ ! -s "$APK" ]]; then
  echo "APK missing. Run: bash tools/apk/build.sh" >&2
  exit 1
fi
SIZE=$(wc -c < "$APK" | tr -d ' ')
cat > "$ROOT/apps/mobile/dist/download.html" <<'HTML'
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#081629"><title>Windows in Mobile — Download</title>
<style>body{margin:0;background:radial-gradient(circle at 15% 10%,#153f70,#071426 60%);color:#f5f8ff;font:16px/1.6 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}.card{width:min(620px,calc(100% - 40px));box-sizing:border-box;padding:34px;border:1px solid #315176;border-radius:24px;background:#10233bdd;box-shadow:0 24px 80px #0008}h1{line-height:1.15;margin:10px 0}.logo{width:56px;height:56px;border-radius:16px;background:#1687e8;display:grid;place-items:center;font-size:30px}.muted{color:#b4c3d8}.btn{display:block;text-align:center;text-decoration:none;background:#1687e8;color:white;font-weight:700;padding:14px;border-radius:12px;margin:22px 0}.links{display:grid;gap:8px;margin-top:22px}.links a{color:#9dccff;overflow-wrap:anywhere}.pill{display:inline-block;border:1px solid #48627f;border-radius:100px;padding:3px 10px;color:#d2e8ff;font-size:13px}</style></head>
<body><main class="card"><div class="logo">⊞</div><p class="pill">VERSION 2.0.0 · ANDROID APK</p><h1>Windows in Mobile</h1><p class="muted">A Windows-inspired mobile desktop with Windows 7, 8, 10 and 11 launch tiles. English interface, independent virtual disks, and WebView crash recovery.</p><a class="btn" href="./Windows-in-Mobile-v2.0.0.apk" download>Download APK</a><p class="muted">APK size: <strong id="size">APK_SIZE</strong> bytes · Android 5.0+</p><section class="links"><strong>Alternate sources</strong><a href="https://warmahdi651-stack.github.io/app/Windows-in-Mobile-v2.0.0.apk">GitHub Pages</a><a href="https://github.com/warmahdi651-stack/app/raw/arena/3fb7149b-app/releases/Windows-in-Mobile-v2.0.0.apk">GitHub raw (session branch)</a><a href="https://cdn.jsdelivr.net/gh/warmahdi651-stack/app@arena/3fb7149b-app/releases/Windows-in-Mobile-v2.0.0.apk">jsDelivr CDN (session branch)</a></section></main><script>document.getElementById('size').textContent='APK_SIZE'</script></body></html>
HTML
sed -i "s/APK_SIZE/$SIZE/g" "$ROOT/apps/mobile/dist/download.html"
printf 'Download page: %s\nAPK bytes: %s\n' "$ROOT/apps/mobile/dist/download.html" "$SIZE"

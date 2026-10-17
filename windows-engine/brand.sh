#!/usr/bin/env bash
# Applies the "Windows in Mobile" branding and release settings to a checkout of
# brunodev85/winlator-app (pinned commit in .github/workflows/engine-apk.yml).
#   bash windows-engine/brand.sh <path-to-winlator-app>
set -euo pipefail
DIR="${1:?usage: brand.sh <winlator-app dir>}"

python3 - "$DIR" <<'PY'
import pathlib, re, sys

root = pathlib.Path(sys.argv[1])

def patch(rel, pairs):
    p = root / rel
    text = p.read_text(encoding="utf-8")
    for old, new in pairs:
        if old not in text:
            raise SystemExit(f"[brand] anchor not found in {rel}: {old[:60]!r}")
        text = text.replace(old, new, 1)
    p.write_text(text, encoding="utf-8")
    print(f"[brand] patched {rel}")

# 1) Gradle: own application id, versioning, arm64-only release build with release signing.
patch("app/build.gradle", [
    ("applicationId 'com.winlator'", "applicationId 'com.arena.windowsinmobile.engine'"),
    ("versionCode 33", "versionCode 100"),
    ('versionName "11.2"', 'versionName "2.1.0-wim"'),
    ("    buildTypes {\n        debug {",
     "    buildTypes {\n        release {\n            signingConfig signingConfigs.debug\n            minifyEnabled false\n            ndk {\n                abiFilters 'arm64-v8a'\n            }\n        }\n        debug {"),
])

# 1b) FileProvider authority must be unique per application id, otherwise Android refuses
#     to install next to the original Winlator (INSTALL_FAILED_CONFLICTING_PROVIDER).
for rel in ["app/src/main/AndroidManifest.xml", "app/src/main/java/com/winlator/core/FileUtils.java"]:
    p = root / rel
    text = p.read_text(encoding="utf-8")
    if "com.winlator.FileProvider" not in text:
        raise SystemExit(f"[brand] FileProvider authority not found in {rel}")
    p.write_text(text.replace("com.winlator.FileProvider", "com.arena.windowsinmobile.engine.FileProvider"), encoding="utf-8")
    print(f"[brand] FileProvider authority -> new id in {rel}")

# 2) App name (default + Portuguese + Russian resources) -> English.
for lang_dir in ["values", "values-pt", "values-ru"]:
    f = f"app/src/main/res/{lang_dir}/strings.xml"
    text = (root / f).read_text(encoding="utf-8")
    text2 = re.sub(r'(<string name="app_name">)[^<]*(</string>)', r"\1Windows in Mobile\2", text, count=1)
    if text2 == text and "Windows in Mobile" not in text:
        raise SystemExit(f"[brand] app_name not found in {f}")
    (root / f).write_text(text2, encoding="utf-8")
    print(f"[brand] app_name -> Windows in Mobile in {f}")

print("[brand] done")
PY

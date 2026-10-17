#!/usr/bin/env bash
# Applies the Gamelator branding and release settings to a checkout of
# brunodev85/winlator-app (pinned commit in .github/workflows/engine-apk.yml).
#   bash windows-engine/brand.sh <path-to-winlator-app>
set -euo pipefail
DIR="${1:?usage: brand.sh <winlator-app dir>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS="$HERE/gamelator-icons"
HERE_SOUNDS="$HERE/gamelator-sounds"

python3 - "$DIR" "$ICONS" "$HERE_SOUNDS" <<'PY'
import pathlib, re, shutil, sys

root = pathlib.Path(sys.argv[1])
icons = pathlib.Path(sys.argv[2])
HERE_SOUNDS = pathlib.Path(sys.argv[3])
APP_ID = "com.arena.gamelator"

def read(rel):
    return (root / rel).read_text(encoding="utf-8")

def write(rel, text):
    (root / rel).write_text(text, encoding="utf-8")

def replace_once(rel, old, new):
    text = read(rel)
    if old not in text:
        raise SystemExit(f"[brand] anchor not found in {rel}: {old[:70]!r}")
    write(rel, text.replace(old, new, 1))
    print(f"[brand] {rel}: {old[:50]!r} -> {new[:50]!r}")

# 1) Gradle: own application id, versioning, arm64-only release build with release signing.
replace_once("app/build.gradle", "applicationId 'com.winlator'", f"applicationId '{APP_ID}'")
replace_once("app/build.gradle", "versionCode 33", "versionCode 100")
replace_once("app/build.gradle", 'versionName "11.2"', 'versionName "1.0.0-gamelator"')
replace_once("app/build.gradle", "    buildTypes {\n        debug {",
    "    buildTypes {\n        release {\n            signingConfig signingConfigs.debug\n            minifyEnabled false\n            ndk {\n                abiFilters 'arm64-v8a'\n            }\n        }\n        debug {")

# 1b) FileProvider authority must be unique per application id (Android rejects duplicates).
for rel in ["app/src/main/AndroidManifest.xml", "app/src/main/java/com/winlator/core/FileUtils.java"]:
    text = read(rel)
    if "com.winlator.FileProvider" not in text:
        raise SystemExit(f"[brand] FileProvider authority not found in {rel}")
    write(rel, text.replace("com.winlator.FileProvider", f"{APP_ID}.FileProvider"))
    print(f"[brand] FileProvider authority -> {APP_ID}.FileProvider in {rel}")

# 1c) Asset compression needs a larger JVM heap.
gp = root / "gradle.properties"
lines = [l for l in (gp.read_text(encoding="utf-8").splitlines() if gp.exists() else []) if not l.startswith("org.gradle.jvmargs")]
lines.append("org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8")
gp.write_text("\n".join(lines) + "\n", encoding="utf-8")

# 2) App name in every locale -> Gamelator.
for lang_dir in ["values", "values-pt", "values-ru"]:
    rel = f"app/src/main/res/{lang_dir}/strings.xml"
    text = read(rel)
    new, n = re.subn(r'(<string name="app_name">)[^<]*(</string>)', r"\1Gamelator\2", text, count=1)
    if n != 1:
        raise SystemExit(f"[brand] app_name not found in {rel}")
    write(rel, new)
    print(f"[brand] app_name -> Gamelator in {rel}")

# 3) Own launcher icons (generated, see make-gamelator-icons.py) and adaptive background colour.
for dens_dir in sorted(icons.glob("mipmap-*")):
    dst = root / "app/src/main/res" / dens_dir.name
    dst.mkdir(parents=True, exist_ok=True)
    for png in dens_dir.glob("*.png"):
        shutil.copyfile(png, dst / png.name)
print("[brand] launcher icons replaced")
replace_once("app/src/main/res/values/ic_launcher_background.xml",
    '<color name="ic_launcher_background">#FFFFFF</color>',
    '<color name="ic_launcher_background">#0B0F1A</color>')

# 4) Colour palette: dark "night arcade" theme (not Winlator's grey/blue palette).
palette = {
    "colorAccent": "#FF3D7F",
    "colorPrimary": "#101827",
    "colorPrimaryDark": "#070A12",
    "colorControlNormal": "#3A4766",
    "colorPrimaryText": "#F2F5FF",
    "colorSecondaryText": "#8FA0C6",
    "colorPrimarySurface": "#0B0F1A",
    "colorSecondarySurface": "#151D33",
    "colorPrimaryVariant": "#1F2A48",
    "colorSecondaryVariant": "#243156",
    "colorError": "#FF5C7A",
}
styles = "app/src/main/res/values/styles.xml"
text = read(styles)
dark = re.search(r'<style name="AppThemeDark".*?</style>', text, re.S)
if not dark:
    raise SystemExit("[brand] AppThemeDark not found")
block = dark.group(0)
for name, value in palette.items():
    block, n = re.subn(rf'(<item name="{name}">)[^<]*(</item>)', rf"\g<1>{value}\2", block, count=1)
    if n != 1:
        raise SystemExit(f"[brand] palette item {name} not found in AppThemeDark")
text = text.replace(dark.group(0), block)
# Typography: system condensed face for text (no external font files needed).
text, n = re.subn(r'(<style name="TextView" parent="@android:style/Widget.TextView">)',
    r'\1\n        <item name="android:fontFamily">sans-serif-condensed</item>', text, count=1)
if n != 1:
    raise SystemExit("[brand] TextView style not found")
write(styles, text)
print("[brand] dark palette + condensed system font applied")

# 5) Own sound effects + startup chime (original audio, see make-gamelator-sounds.py).
raw = root / "app/src/main/res/raw"
raw.mkdir(parents=True, exist_ok=True)
for wav in (HERE_SOUNDS).glob("*.wav"):
    shutil.copyfile(wav, raw / wav.name)
print("[brand] Gamelator sounds copied to res/raw")

(root / "app/src/main/java/com/winlator/core/GamelatorSound.java").write_text(
"""package com.winlator.core;

import android.content.Context;
import android.media.MediaPlayer;

import com.winlator.R;

/** Plays Gamelator's own startup chime. Failures are ignored so audio never blocks the app. */
public final class GamelatorSound {
    private static MediaPlayer player;

    private GamelatorSound() {}

    public static void playStartup(Context context) {
        try {
            if (player != null) player.release();
            player = MediaPlayer.create(context.getApplicationContext(), R.raw.gamelator_startup);
            if (player == null) return;
            player.setVolume(0.6f, 0.6f);
            player.setOnCompletionListener(MediaPlayer::release);
            player.start();
        } catch (Exception ignored) {
            player = null;
        }
    }
}
""", encoding="utf-8")
print("[brand] GamelatorSound.java added")

# MainActivity: play the chime once the activity is created.
replace_once("app/src/main/java/com/winlator/MainActivity.java",
    "import com.winlator.core.Callback;",
    "import com.winlator.core.Callback;\nimport com.winlator.core.GamelatorSound;")
replace_once("app/src/main/java/com/winlator/MainActivity.java",
    "super.onCreate(savedInstanceState);",
    "super.onCreate(savedInstanceState);\n        GamelatorSound.playStartup(this);")

# Resource lookup must use the resource package (namespace), not the application id.
replace_once("app/src/main/java/com/winlator/core/StringUtils.java",
    'getIdentifier(resName, "string", context.getPackageName())',
    'getIdentifier(resName, "string", "com.winlator")')

print("[brand] done")
PY

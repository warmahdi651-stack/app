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

# 6) User-visible product names: Winlator -> Gamelator (technical component names such as
#    Wine, Box64, DXVK stay as they are; the About dialog keeps the upstream credit).
def sub_all(rel, pairs):
    text = read(rel)
    for old, new in pairs:
        if old not in text:
            raise SystemExit(f"[brand] visible name anchor missing in {rel}: {old[:60]!r}")
        text = text.replace(old, new)
    write(rel, text)
    print(f"[brand] visible names updated in {rel}")

for lang_dir in ["values", "values-pt", "values-ru"]:
    rel = f"app/src/main/res/{lang_dir}/strings.xml"
    text = read(rel)
    if "Winlator" in text:
        write(rel, text.replace("Winlator", "Gamelator"))
        print(f"[brand] Winlator -> Gamelator in {rel}")

sub_all("app/src/main/java/com/winlator/services/ForegroundService.java", [
    ('"Winlator:ForegroundService"', '"Gamelator:ForegroundService"'),
    ('"Winlator",', '"Gamelator",'),
    ('"Winlator is running in the background"', '"Gamelator is running in the background"'),
    ('"winlator.FGS"', '"gamelator.FGS"'),
])
sub_all("app/src/main/java/com/winlator/services/NotificationUtils.java", [
    ('"winlator_foreground_service"', '"gamelator_foreground_service"'),
    ('"Winlator Foreground Service"', '"Gamelator Foreground Service"'),
    ('"Allows to display Winlator foreground notifications"', '"Allows to display Gamelator foreground notifications"'),
])
sub_all("app/src/main/java/com/winlator/inputcontrols/InputControlsManager.java", [
    ('"Winlator/profiles/"', '"Gamelator/profiles/"'),
])
sub_all("app/src/main/java/com/winlator/widget/LogView.java", [
    ('DIRECTORY_DOCUMENTS), "Winlator")', 'DIRECTORY_DOCUMENTS), "Gamelator")'),
])
# Real data directory of the app is /data/data/<applicationId>; the hard-coded path must match it.
sub_all("app/src/main/java/com/winlator/core/AppUtils.java", [
    ('"/data/data/com.winlator/storage"', '"/data/data/com.arena.gamelator/storage"'),
])

# 7) Device tuning section (Samsung / Xiaomi): recommended settings + shortcuts to system pages.
(root / "app/src/main/java/com/winlator/core/GamelatorDeviceTuning.java").write_text(
"""package com.winlator.core;

import android.app.ActivityManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;

import java.util.Locale;

/**
 * Gamelator device tuning: recommended settings for Samsung and Xiaomi phones and shortcuts
 * to the system pages that most often block background games. System page class names differ
 * between firmware versions, so every shortcut falls back to the next option when it is missing.
 */
public final class GamelatorDeviceTuning {
    private static final String SAMSUNG_BATTERY = "com.samsung.android.lool/com.samsung.android.sm.ui.battery.BatteryActivity";
    private static final String XIAOMI_AUTOSTART = "com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity";

    private GamelatorDeviceTuning() {}

    /** Adds the "Device tuning" entry at the top of the Settings screen. */
    public static void addEntry(View root, Context context) {
        try {
            ViewGroup scroll = (ViewGroup) ((ViewGroup) root).getChildAt(0);
            ViewGroup column = (ViewGroup) scroll.getChildAt(0);
            Button button = new Button(context);
            button.setText("Device tuning (Samsung / Xiaomi)");
            button.setAllCaps(false);
            button.setOnClickListener(v -> show(context));
            column.addView(button, 0);
        } catch (Exception ignored) {
            // Settings still works without the shortcut.
        }
    }

    public static void show(Context context) {
        String brand = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase(Locale.ROOT);
        long ramGb = totalRamGb(context);
        boolean samsung = brand.contains("samsung");
        boolean xiaomi = brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco");

        LinearLayout column = new LinearLayout(context);
        column.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(context, 16);
        column.setPadding(pad, pad, pad, pad);

        addText(context, column, "Device: " + Build.MANUFACTURER + " " + Build.MODEL
            + " | Android " + Build.VERSION.RELEASE + " | RAM about " + ramGb + " GB");
        addText(context, column, "");
        addText(context, column, "Recommended Gamelator settings:");
        addText(context, column, recommendation(ramGb));
        addText(context, column, "");

        if (samsung) {
            addText(context, column, "Samsung: set Gamelator to 'Unrestricted' in Battery, and turn off 'Put unused apps to sleep' for it.");
        } else if (xiaomi) {
            addText(context, column, "Xiaomi / HyperOS: allow Autostart, set Battery saver to 'No restrictions', and lock Gamelator in Recents.");
        } else {
            addText(context, column, "Turn off battery optimization for Gamelator and keep it out of background restrictions.");
        }

        addButton(context, column, "Open battery settings", () -> openBattery(context, samsung));
        if (xiaomi) {
            addButton(context, column, "Open autostart settings", () -> openComponentOrAppInfo(context, XIAOMI_AUTOSTART));
        }
        addButton(context, column, "Open Gamelator app info", () -> openAppInfo(context));

        ScrollView scroll = new ScrollView(context);
        scroll.addView(column);
        new AlertDialog.Builder(context)
            .setTitle("Device tuning")
            .setView(scroll)
            .setPositiveButton("Close", null)
            .show();
    }

    private static String recommendation(long ramGb) {
        if (ramGb >= 8) return "Screen 1280x720, Box64 preset PERFORMANCE. Lower the resolution if a game lags.";
        if (ramGb >= 6) return "Screen 960x540 first, then 1280x720 if smooth. Box64 PERFORMANCE; use STABILITY if it crashes.";
        return "Screen 960x540, Box64 preset STABILITY. Close other apps before launching a game.";
    }

    private static void openBattery(Context context, boolean samsung) {
        if (samsung && tryComponent(context, SAMSUNG_BATTERY)) return;
        if (tryAction(context, Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) return;
        openAppInfo(context);
    }

    private static void openComponentOrAppInfo(Context context, String component) {
        if (tryComponent(context, component)) return;
        openAppInfo(context);
    }

    private static void openAppInfo(Context context) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + context.getPackageName()));
        if (!tryIntent(context, intent)) {
            tryAction(context, Settings.ACTION_SETTINGS);
        }
    }

    private static boolean tryComponent(Context context, String flattened) {
        Intent intent = new Intent();
        intent.setComponent(android.content.ComponentName.unflattenFromString(flattened));
        return tryIntent(context, intent);
    }

    private static boolean tryAction(Context context, String action) {
        return tryIntent(context, new Intent(action));
    }

    private static boolean tryIntent(Context context, Intent intent) {
        try {
            context.startActivity(intent);
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }

    private static long totalRamGb(Context context) {
        ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo info = new ActivityManager.MemoryInfo();
        if (am == null) return 0;
        am.getMemoryInfo(info);
        return Math.round(info.totalMem / (1024.0 * 1024.0 * 1024.0));
    }

    private static int dp(Context context, int value) {
        return (int) (value * context.getResources().getDisplayMetrics().density);
    }

    private static void addText(Context context, LinearLayout column, String text) {
        TextView tv = new TextView(context);
        tv.setText(text);
        tv.setTextSize(15);
        tv.setPadding(0, dp(context, 4), 0, dp(context, 4));
        column.addView(tv);
    }

    private static void addButton(Context context, LinearLayout column, String label, Runnable action) {
        Button button = new Button(context);
        button.setText(label);
        button.setAllCaps(false);
        button.setOnClickListener(v -> action.run());
        column.addView(button);
    }
}
""", encoding="utf-8")
print("[brand] GamelatorDeviceTuning.java added")

replace_once("app/src/main/java/com/winlator/SettingsFragment.java",
    "preferences = PreferenceManager.getDefaultSharedPreferences(context);",
    "preferences = PreferenceManager.getDefaultSharedPreferences(context);\n        com.winlator.core.GamelatorDeviceTuning.addEntry(view, context);")

print("[brand] done")
PY

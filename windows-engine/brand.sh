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
APP_ID = "com.gamlator"

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
replace_once("app/build.gradle", "versionCode 33", "versionCode 101")
replace_once("app/build.gradle", 'versionName "11.2"', 'versionName "1.1.0-gamelator"')
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
    "colorAccent": "#00E5FF",
    "colorPrimary": "#1B1140",
    "colorPrimaryDark": "#07050F",
    "colorControlNormal": "#3B3366",
    "colorPrimaryText": "#F4F1FF",
    "colorSecondaryText": "#A89BD6",
    "colorPrimarySurface": "#0A0716",
    "colorSecondarySurface": "#141029",
    "colorPrimaryVariant": "#2A1B5C",
    "colorSecondaryVariant": "#1F1A3D",
    "colorError": "#FF4D6D",
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
    ('"/data/data/com.winlator/storage"', '"/data/data/com.gamlator/storage"'),
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
            .setTitle("Device Tuning")
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

# 8) Gamelator's own drawables, layouts and drawer menu (windows-engine/gamelator-res).
res_src = icons.parent / "gamelator-res"
res_dst = root / "app/src/main/res"
for sub in ["drawable", "drawable-xxhdpi", "layout", "menu"]:
    src_dir = res_src / sub
    if not src_dir.is_dir():
        continue
    (res_dst / sub).mkdir(parents=True, exist_ok=True)
    for f in src_dir.iterdir():
        shutil.copyfile(f, res_dst / sub / f.name)
print("[brand] Gamelator drawables, layouts and drawer menu copied")

# 8b) Visible strings: navigation labels, loading text, device tuning entry.
STRINGS = [
    ("shortcuts", "Library"),
    ("containers", "Prefixes"),
    ("input_controls", "Controls"),
    ("starting_up", "Warming up the engine..."),
    ("device_tuning", "Device Tuning"),
    ("gamelator_tagline", "PLAY WINDOWS GAMES"),
    ("gamelator_tagline_short", "GAMELATOR"),
]
for lang_dir in ["values", "values-pt", "values-ru"]:
    rel = f"app/src/main/res/{lang_dir}/strings.xml"
    text = read(rel)
    for name, value in STRINGS:
        pat = re.compile(rf'<string name="{name}"[^>]*>[^<]*</string>')
        if pat.search(text):
            text = pat.sub(lambda _m, n=name, v=value: f'<string name="{n}">{v}</string>', text, count=1)
        else:
            text = text.replace("</resources>", f'    <string name="{name}">{value}</string>\n</resources>', 1)
    write(rel, text)
print("[brand] visible strings updated")

# 8c) Theme: gradient window, dialogs/panels/preloader and toolbar use Gamelator drawables.
def patch_block(text, style_name, pairs):
    m = re.search(rf'<style name="{style_name}".*?</style>', text, re.S)
    if not m:
        raise SystemExit(f"[brand] style {style_name} not found")
    block = m.group(0)
    new = block
    for old, repl in pairs:
        if old not in new:
            raise SystemExit(f"[brand] {style_name}: anchor missing {old[:60]!r}")
        new = new.replace(old, repl, 1)
    return text.replace(block, new, 1)

styles_rel = "app/src/main/res/values/styles.xml"
text = read(styles_rel)
text = patch_block(text, "AppThemeBase", [
    ('<item name="android:windowBackground">?attr/colorPrimarySurface</item>',
     '<item name="android:windowBackground">@drawable/gl_window_bg</item>'),
])
text = patch_block(text, "AppThemeDark", [
    ("@drawable/content_dialog_background_dark", "@drawable/gl_dialog_bg"),
    ("@drawable/toolbox_dark", "@drawable/gl_panel_bg"),
    ("@drawable/panel_background_dark", "@drawable/gl_panel_bg"),
    ("@drawable/preloader_background_dark", "@drawable/gl_preloader_bg"),
])
text = patch_block(text, "Toolbar", [
    ('<item name="android:background">?attr/colorPrimary</item>',
     '<item name="android:background">@drawable/gl_toolbar_bg</item>'),
])
write(styles_rel, text)
print("[brand] Gamelator theme drawables applied")

# 8d) Drawer: gradient background and a glowing selected-item pill.
replace_once("app/src/main/res/layout/main_activity.xml",
    'android:background="?attr/colorSecondarySurface"',
    'android:background="@drawable/gl_drawer_bg"\n        app:itemBackground="@drawable/gl_item_selected"')

# 9) Device Tuning opens from the drawer (its own menu entry), not from inside Settings.
replace_once("app/src/main/java/com/winlator/MainActivity.java",
    "            case R.id.menu_item_about:",
    "            case R.id.menu_item_device_tuning:\n"
    "                com.winlator.core.GamelatorDeviceTuning.show(this);\n"
    "                drawerLayout.closeDrawer(GravityCompat.START);\n"
    "                break;\n"
    "            case R.id.menu_item_about:")

# 10) Native renderers connect to the X11/Vortek sockets under the data directory.
for rel in ["app/src/main/cpp/gladiorenderer/include/gladio.h",
            "app/src/main/cpp/vortekrenderer/include/vortek.h"]:
    text = read(rel)
    if "/data/data/com.winlator/" not in text:
        raise SystemExit(f"[brand] socket path not found in {rel}")
    write(rel, text.replace("/data/data/com.winlator/", "/data/data/com.gamlator/"))
    print(f"[brand] socket path -> com.gamlator in {rel}")

# 12) Per-Windows-version desktop: original wallpapers and boot cues, FPS on startup.
shell = icons.parent / "gamelator-shell"
assets_wall = root / "app/src/main/assets/wallpapers"
for old in ["wallpaper-1", "wallpaper-2", "wallpaper-3"]:
    if (assets_wall / old).exists():
        shutil.rmtree(assets_wall / old)
for src_dir in sorted((shell / "wallpapers").iterdir()):
    dst_dir = assets_wall / src_dir.name
    if dst_dir.exists():
        shutil.rmtree(dst_dir)
    shutil.copytree(src_dir, dst_dir)
print("[brand] Gamelator wallpapers installed (auto, win7, win8, win10, win11)")

raw_dst = root / "app/src/main/res/raw"
raw_dst.mkdir(parents=True, exist_ok=True)
for wav in (shell / "raw").glob("*.wav"):
    shutil.copyfile(wav, raw_dst / wav.name)
print("[brand] Gamelator boot cues copied to res/raw")

WTM = "app/src/main/java/com/winlator/core/WineThemeManager.java"
replace_once(WTM, 'DEFAULT_WALLPAPER_ID = "wallpaper-1";', 'DEFAULT_WALLPAPER_ID = "wallpaper-auto";')
replace_once(WTM,
    "public static void apply(Context context, ThemeInfo themeInfo, ScreenInfo screenInfo) {",
    "public static void apply(Context context, ThemeInfo themeInfo, ScreenInfo screenInfo, String winVersion) {")
replace_once(WTM,
    "createWallpaperBMPFile(context, themeInfo.wallpaperId, screenInfo);",
    "createWallpaperBMPFile(context, resolveWallpaperId(themeInfo.wallpaperId, winVersion), screenInfo);")
replace_once(WTM,
    "    public static File getUserWallpaperFile(Context context) {",
    r'''    /** The default ("auto") wallpaper follows the container's Windows version. */
    public static String resolveWallpaperId(String wallpaperId, String winVersion) {
        if (!wallpaperId.equals(DEFAULT_WALLPAPER_ID) && !wallpaperId.equals("wallpaper-1")) return wallpaperId;
        String family;
        switch (winVersion == null ? "" : winVersion) {
            case "win11": family = "win11"; break;
            case "win81":
            case "win8": family = "win8"; break;
            case "win7":
            case "win2008r2": family = "win7"; break;
            default: family = "win10"; break;
        }
        return "wallpaper-" + family;
    }

    public static File getUserWallpaperFile(Context context) {''')

replace_once("app/src/main/java/com/winlator/widget/ImagePickerView.java",
    'Arrays.asList("wallpaper-1", "wallpaper-2", "wallpaper-3")',
    'Arrays.asList("wallpaper-auto", "wallpaper-win7", "wallpaper-win8", "wallpaper-win10", "wallpaper-win11")')

XSDA = "app/src/main/java/com/winlator/XServerDisplayActivity.java"
replace_once(XSDA,
    "WineThemeManager.apply(this, new WineThemeManager.ThemeInfo(desktopTheme), xServer.screenInfo);",
    'WineThemeManager.apply(this, new WineThemeManager.ThemeInfo(desktopTheme), xServer.screenInfo, container.getExtra("winVersion"));')
replace_once(XSDA,
    'if (!(desktopTheme+","+xServer.screenInfo).equals(container.getExtra("desktopTheme"))) {',
    'if (!(desktopTheme+","+xServer.screenInfo+","+container.getExtra("winVersion")).equals(container.getExtra("desktopTheme"))) {')
replace_once(XSDA,
    'container.putExtra("desktopTheme", desktopTheme+","+xServer.screenInfo);',
    'container.putExtra("desktopTheme", desktopTheme+","+xServer.screenInfo+","+container.getExtra("winVersion"));')
replace_once(XSDA,
    "        preloaderDialog.show(R.string.starting_up);",
    '        preloaderDialog.show(R.string.starting_up);\n'
    '        com.winlator.core.GamelatorSound.playBoot(this, container != null ? container.getExtra("winVersion") : "");')
replace_once(XSDA,
    "        setupUI();\n",
    r'''        setupUI();

        final android.os.Handler startupFpsHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        final float[] startupFps = {0f};
        final long[] startupFpsTime = {0L};
        final int[] startupFpsFrames = {0};
        startupFpsHandler.post(new Runnable() {
            @Override
            public void run() {
                if (xServerView == null || !preloaderDialog.isShowing()) return;
                int frames = xServerView.getRenderer().drawnFrames.get();
                long now = android.os.SystemClock.elapsedRealtime();
                if (startupFpsTime[0] > 0 && now > startupFpsTime[0]) {
                    float instant = (frames - startupFpsFrames[0]) * 1000f / (now - startupFpsTime[0]);
                    startupFps[0] = startupFps[0] <= 0 ? instant : startupFps[0] * 0.6f + instant * 0.4f;
                    preloaderDialog.setFps(Math.round(startupFps[0]) + " FPS");
                }
                startupFpsFrames[0] = frames;
                startupFpsTime[0] = now;
                startupFpsHandler.postDelayed(this, 300);
            }
        });
''')
replace_once(XSDA,
    "            if (frameRatingWindow != null) {",
    "            if (frameRatingWindow == null && viewable && window.isSurface()) frameRatingWindow = window;\n"
    "            if (frameRatingWindow != null) {")

GLR = "app/src/main/java/com/winlator/renderer/GLRenderer.java"
replace_once(GLR,
    "    private final float[] tmpXForm1 = XForm.getInstance();",
    "    public final java.util.concurrent.atomic.AtomicInteger drawnFrames = new java.util.concurrent.atomic.AtomicInteger();\n"
    "    private final float[] tmpXForm1 = XForm.getInstance();")
replace_once(GLR,
    "    public void onDrawFrame(GL10 gl) {",
    "    public void onDrawFrame(GL10 gl) {\n        drawnFrames.incrementAndGet();")

FR = "app/src/main/java/com/winlator/widget/FrameRating.java"
replace_once(FR,
    "        addView(view);\n        setupPanels();",
    "        addView(view);\n        setupPanels();\n        setPivotX(0);\n        setPivotY(0);\n        setScaleX(0.78f);\n        setScaleY(0.78f);")
replace_once(FR, "if (time >= lastTime + 500) {", "if (time >= lastTime + 250) {")
replace_once(FR,
    "            lastFPS = ((float)(frameCount * 1000) / (time - lastTime));",
    "            float instant = ((float)(frameCount * 1000) / (time - lastTime));\n"
    "            lastFPS = lastFPS <= 0 ? instant : lastFPS * 0.6f + instant * 0.4f;")

replace_once("app/src/main/java/com/winlator/container/Container.java",
    "private byte hudMode = (byte)FrameRating.Mode.DISABLED.ordinal();",
    "private byte hudMode = (byte)FrameRating.Mode.SIMPLE.ordinal();")

replace_once("app/src/main/java/com/winlator/core/WineUtils.java",
    "        WinVersions.WinVersion winVersion = WinVersions.getWinVersions()[winVersionIdx];",
    "        WinVersions.WinVersion winVersion = WinVersions.getWinVersions()[winVersionIdx];\n"
    '        container.putExtra("winVersion", winVersion.version);\n'
    "        container.saveData();")

PD = "app/src/main/java/com/winlator/core/PreloaderDialog.java"
replace_once(PD, "import android.widget.TextView;", "import android.view.View;\nimport android.widget.TextView;")
replace_once(PD, "    public boolean isShowing() {",
    "    public synchronized void setFps(String text) {\n"
    "        if (dialog == null) return;\n"
    "        TextView tv = dialog.findViewById(R.id.FPSText);\n"
    "        if (tv == null) return;\n"
    "        tv.setVisibility(text == null ? View.GONE : View.VISIBLE);\n"
    "        tv.setText(text);\n"
    "    }\n\n"
    "    public boolean isShowing() {")

SND = "app/src/main/java/com/winlator/core/GamelatorSound.java"
replace_once(SND, "    public static void playStartup(Context context) {",
    r'''    /** Plays the boot cue of the container's Windows family (original audio). */
    public static void playBoot(Context context, String winVersion) {
        int resId;
        switch (winVersion == null ? "" : winVersion) {
            case "win7":
            case "win2008r2": resId = R.raw.gamelator_boot_win7; break;
            case "win81":
            case "win8": resId = R.raw.gamelator_boot_win8; break;
            case "win11": resId = R.raw.gamelator_boot_win11; break;
            default: resId = R.raw.gamelator_boot_win10; break;
        }
        try {
            if (player != null) player.release();
            player = MediaPlayer.create(context.getApplicationContext(), resId);
            if (player == null) return;
            player.setVolume(0.7f, 0.7f);
            player.setOnCompletionListener(MediaPlayer::release);
            player.start();
        } catch (Exception ignored) {
            player = null;
        }
    }

    public static void playStartup(Context context) {''')
print("[brand] done")
PY

# 11) Bundled archives (rootfs, Wine, container pattern, ...) contain the old data path in
#     binaries and config files. Rewrite com.winlator -> com.gamlator. Both names are 12 bytes,
#     so ELF offsets and tar sizes stay valid. Symlink targets may change length safely.
if ! python3 -c "import zstandard" >/dev/null 2>&1; then
  python3 -m pip install --quiet --user --break-system-packages zstandard
fi
python3 - "$DIR/app/src/main/assets" <<'PY'
import io, os, pathlib, sys, tarfile
import zstandard

OLD, NEW = b"com.winlator", b"com.gamlator"
assert len(OLD) == len(NEW)
root = pathlib.Path(sys.argv[1])
for path in sorted(root.rglob("*.tzst")):
    tmp = path.with_name(path.name + ".tmp")
    changed = 0
    with path.open("rb") as src, \
         zstandard.ZstdDecompressor().stream_reader(src) as reader, \
         tarfile.open(fileobj=reader, mode="r|") as tin, \
         tmp.open("wb") as out, \
         zstandard.ZstdCompressor(level=19).stream_writer(out) as writer, \
         tarfile.open(fileobj=writer, mode="w|") as tout:
        for m in tin:
            data = None
            if m.isreg():
                data = tin.extractfile(m).read()
                if OLD in data:
                    data = data.replace(OLD, NEW)
                    changed += 1
            if OLD.decode() in m.name:
                m.name = m.name.replace(OLD.decode(), NEW.decode())
                changed += 1
            if (m.issym() or m.islnk()) and OLD.decode() in m.linkname:
                m.linkname = m.linkname.replace(OLD.decode(), NEW.decode())
                changed += 1
            if data is not None:
                m.size = len(data)
                tout.addfile(m, io.BytesIO(data))
            else:
                tout.addfile(m)
    if changed:
        os.replace(tmp, path)
        print(f"[brand] {path.relative_to(root)}: {changed} data-path entries rewritten")
    else:
        tmp.unlink()
PY

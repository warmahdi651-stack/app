#!/usr/bin/env python3
"""ساخت آیکون‌های لانچر از دارایی‌های اپ (برای پروژهٔ apktool)."""
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ASSETS = os.path.join(ROOT, "apps", "mobile", "assets")
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "android", "res"))

# (پوشهٔ mipmap, اندازهٔ آیکون قدیمی, اندازهٔ foreground تطبیقی)
DENSITIES = [
    ("mdpi", 48, 108),
    ("hdpi", 72, 162),
    ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324),
    ("xxxhdpi", 192, 432),
]


def save(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  ✔ {os.path.relpath(path, ROOT)}")


def main() -> int:
    icon = Image.open(os.path.join(ASSETS, "icon.png")).convert("RGBA")
    foreground = Image.open(os.path.join(ASSETS, "android-icon-foreground.png")).convert("RGBA")
    background = Image.open(os.path.join(ASSETS, "android-icon-background.png")).convert("RGBA")

    for folder, legacy_size, fg_size in DENSITIES:
        target = os.path.join(OUT, f"mipmap-{folder}")
        save(icon.resize((legacy_size, legacy_size), Image.LANCZOS), os.path.join(target, "ic_launcher.png"))

        # foreground تطبیقی: تصویر روی پس‌زمینهٔ اصلی خودش قرار می‌گیرد
        fg = foreground.resize((fg_size, fg_size), Image.LANCZOS)
        save(fg, os.path.join(target, "ic_launcher_foreground.png"))

        bg = background.resize((fg_size, fg_size), Image.LANCZOS)
        save(bg, os.path.join(target, "ic_launcher_background.png"))

    return 0


if __name__ == "__main__":
    sys.exit(main())

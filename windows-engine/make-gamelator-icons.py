#!/usr/bin/env python3
"""Generates the original Gamelator launcher icon (dark background + neon gamepad).
Run once; output PNGs are committed under windows-engine/gamelator-icons/."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

OUT = Path(__file__).resolve().parent / "gamelator-icons"
OUT.mkdir(parents=True, exist_ok=True)

def gamepad(size, pad=0.0):
    S = 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # soft glow layer
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    body = [(230, 330), (794, 330), (900, 640), (830, 780), (700, 760), (620, 640), (404, 640), (324, 760), (194, 780), (124, 640)]
    gd.polygon(body, fill=(255, 61, 127, 255))
    glow = glow.filter(ImageFilter.GaussianBlur(38))
    img.alpha_composite(glow)
    d = ImageDraw.Draw(img)
    d.polygon(body, fill=(242, 245, 255, 255))
    # d-pad (accent)
    d.rectangle([250, 450, 340, 620], fill=(0, 229, 255, 255))
    d.rectangle([205, 495, 385, 575], fill=(0, 229, 255, 255))
    # buttons (accent)
    for cx, cy, col in [(700, 470, (255, 61, 127)), (780, 540, (124, 77, 255)), (620, 540, (0, 229, 255)), (700, 610, (255, 196, 0))]:
        d.ellipse([cx - 32, cy - 32, cx + 32, cy + 32], fill=col + (255,))
    return img.resize((size, size), Image.LANCZOS)

def background(size):
    bg = Image.new("RGBA", (size, size), (11, 15, 26, 255))
    d = ImageDraw.Draw(bg)
    step = size // 8
    for i in range(-size, size * 2, step):
        d.line([(i, 0), (i + size, size)], fill=(21, 29, 51, 255), width=max(1, size // 300))
    return bg

def full_icon(size):
    img = background(size)
    fg = gamepad(int(size * 0.78))
    img.alpha_composite(fg, ((size - fg.width) // 2, (size - fg.height) // 2))
    return img.convert("RGB")

def foreground(size):
    # adaptive-icon foreground: content must fit the 66% safe zone
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fg = gamepad(int(size * 0.5))
    canvas.alpha_composite(fg, ((size - fg.width) // 2, (size - fg.height) // 2))
    return canvas

legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fgsize = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for dens, px in legacy.items():
    d = OUT / f"mipmap-{dens}"
    d.mkdir(parents=True, exist_ok=True)
    full = full_icon(px)
    full.save(d / "ic_launcher.png")
    full.save(d / "ic_launcher_round.png")
    foreground(fgsize[dens]).save(d / "ic_launcher_foreground.png")
full_icon(512).save(OUT / "play-store-512.png")
print("icons written to", OUT)

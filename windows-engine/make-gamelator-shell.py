#!/usr/bin/env python3
"""Generates Gamelator's original desktop wallpapers and boot sounds.

Everything here is drawn or synthesized from scratch in Gamelator's own style.
It does not reuse any Microsoft or upstream Winlator artwork or audio.

Outputs (committed under windows-engine/gamelator-shell/):
  wallpapers/wallpaper-<id>/image.png + config.json   one per Windows family
  raw/gamelator_boot_<id>.wav                          one boot cue per family

brand.sh copies them into the app: wallpapers replace the upstream ones, and the
cues go to res/raw. Run once; re-run only when the designs change.
"""
import json
import math
import random
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent / "gamelator-shell"
WALL = HERE / "wallpapers"
RAW = HERE / "raw"
SIZE = 1080
SR = 44100


def lerp(a, b, t):
    return a + (b - a) * t


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    t_rgb, b_rgb = hex_rgb(top), hex_rgb(bottom)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(lerp(t_rgb[i], b_rgb[i], t)) for i in range(3)))
    return img.convert("RGBA")


def save_wallpaper(name, img, edge, comment):
    out = WALL / f"wallpaper-{name}"
    out.mkdir(parents=True, exist_ok=True)
    img.convert("RGBA").save(out / "image.png", optimize=True)
    config = {
        "primaryColor": edge,
        "secondaryColor": edge,
        "orientation": "horizontal",
        "scale": 1.0,
        "note": comment,
    }
    (out / "config.json").write_text(json.dumps(config, indent=4) + "\n", encoding="utf-8")
    print("wrote wallpaper", name)


def wallpaper_win7():
    """Glass ribbons over a teal-to-blue sky (original curves, not the Aero hill)."""
    base = vertical_gradient(SIZE, "#0f3b4a", "#1d6f8f")
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(7):
        pts = []
        phase = i * 0.55
        for x in range(0, SIZE + 1, 12):
            y = SIZE * (0.30 + 0.06 * i) + 120 * math.sin(x / 210.0 + phase) + 40 * math.sin(x / 75.0 - phase)
            pts.append((x, y))
        band = pts + [(x, y + 58) for x, y in reversed(pts)]
        gd.polygon(band, fill=(190, 240, 235, 26 + i * 4))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    base.alpha_composite(glow)
    orb = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(orb).ellipse([620, 130, 900, 410], fill=(255, 255, 255, 70))
    base.alpha_composite(orb.filter(ImageFilter.GaussianBlur(40)))
    save_wallpaper("win7", base, "#0f3b4a", "Gamelator original: glass ribbons")


def wallpaper_win8():
    """Flat colour tiles on a deep navy field (own palette and tile layout)."""
    img = Image.new("RGBA", (SIZE, SIZE), hex_rgb("#14213d") + (255,))
    d = ImageDraw.Draw(img)
    palette = ["#2a9df4", "#3ccf91", "#f5b041", "#e8593c", "#8e7cc3", "#1f6fb2"]
    rnd = random.Random(8)
    cell, gap = 150, 18
    for row in range(6):
        for col in range(6):
            if rnd.random() < 0.28:
                continue
            x0 = 40 + col * (cell + gap) - (row % 2) * 60
            y0 = 40 + row * (cell + gap)
            w = cell * (2 if rnd.random() < 0.2 else 1)
            color = hex_rgb(rnd.choice(palette))
            d.rounded_rectangle([x0, y0, x0 + w, y0 + cell], radius=12, fill=color + (255,))
    save_wallpaper("win8", img, "#14213d", "Gamelator original: flat tile field")


def wallpaper_win10():
    """Light rays from a low horizon over a midnight blue gradient (original geometry)."""
    img = vertical_gradient(SIZE, "#0b2545", "#1a4a7a")
    rays = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    cx, cy = SIZE / 2, SIZE * 0.92
    for i in range(18):
        a0 = math.radians(-165 + i * 10)
        a1 = a0 + math.radians(4.5)
        r = SIZE * 1.6
        rd.polygon([(cx, cy), (cx + r * math.cos(a0), cy + r * math.sin(a0)),
                    (cx + r * math.cos(a1), cy + r * math.sin(a1))], fill=(120, 200, 255, 34))
    img.alpha_composite(rays.filter(ImageFilter.GaussianBlur(3)))
    sun = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(sun).ellipse([cx - 170, cy - 170, cx + 170, cy + 170], fill=(150, 220, 255, 90))
    img.alpha_composite(sun.filter(ImageFilter.GaussianBlur(45)))
    save_wallpaper("win10", img, "#0b2545", "Gamelator original: light rays")


def wallpaper_win11():
    """Soft pastel orbs on graphite (original shapes, no Microsoft swirl)."""
    img = vertical_gradient(SIZE, "#1c1f2e", "#2b2f47")
    orbs = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    od = ImageDraw.Draw(orbs)
    od.ellipse([120, 180, 620, 680], fill=(122, 162, 247, 120))
    od.ellipse([430, 360, 960, 890], fill=(187, 154, 247, 110))
    od.ellipse([640, 90, 900, 350], fill=(158, 206, 106, 90))
    img.alpha_composite(orbs.filter(ImageFilter.GaussianBlur(70)))
    save_wallpaper("win11", img, "#1c1f2e", "Gamelator original: soft orbs")


def wallpaper_auto():
    """Thumbnail for the 'Auto (by Windows version)' choice: a 2x2 preview."""
    tiles = [WALL / f"wallpaper-{n}" / "image.png" for n in ("win7", "win8", "win10", "win11")]
    img = Image.new("RGBA", (SIZE, SIZE), (16, 16, 24, 255))
    half = SIZE // 2
    for i, path in enumerate(tiles):
        tile = Image.open(path).convert("RGBA").resize((half - 8, half - 8), Image.LANCZOS)
        img.paste(tile, ((i % 2) * half + 4, (i // 2) * half + 4))
    save_wallpaper("auto", img, "#101018", "Gamelator: auto choice by Windows version")


def synth_cue(path, notes, duration, tail=0.8, noise_sweep=False):
    """Writes a short original cue: soft bell-like tones, optional filtered sweep."""
    n = int(SR * duration)
    samples = [0.0] * n
    for freq, start, length, amp in notes:
        s0 = int(SR * start)
        for i in range(int(SR * length)):
            idx = s0 + i
            if idx >= n:
                break
            t = i / SR
            env = (1 - math.exp(-t * 60)) * math.exp(-t * (1.0 / max(0.05, length)) * tail * 4)
            v = (math.sin(2 * math.pi * freq * t)
                 + 0.35 * math.sin(2 * math.pi * freq * 2.01 * t)
                 + 0.12 * math.sin(2 * math.pi * freq * 3.02 * t)) * env * amp
            samples[idx] += v
    if noise_sweep:
        seed = 7
        lp = 0.0
        for i in range(n):
            seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
            noise = seed / 0x7FFFFFFF * 2 - 1
            t = i / n
            cutoff = lerp(0.02, 0.25, t)
            lp += cutoff * (noise - lp)
            env = math.sin(math.pi * min(1.0, t * 1.2)) ** 2
            samples[i] += lp * env * 0.35
    peak = max(1e-6, max(abs(s) for s in samples))
    gain = 0.8 / peak
    RAW.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for s in samples:
            v = max(-1.0, min(1.0, s * gain))
            frames += int(v * 32767).to_bytes(2, "little", signed=True)
        w.writeframes(bytes(frames))
    print("wrote sound", path.name)


def cues():
    # Each family has its own note order and timbre; none is taken from Windows sounds.
    synth_cue(RAW / "gamelator_boot_win7.wav", [
        (293.66, 0.00, 1.1, 0.5), (440.00, 0.22, 1.0, 0.45), (554.37, 0.46, 1.0, 0.4), (659.25, 0.74, 1.6, 0.42),
    ], duration=3.0, tail=0.9)
    synth_cue(RAW / "gamelator_boot_win8.wav", [
        (523.25, 0.55, 1.2, 0.35), (783.99, 0.85, 1.5, 0.3),
    ], duration=2.6, tail=1.0, noise_sweep=True)
    synth_cue(RAW / "gamelator_boot_win10.wav", [
        (523.25, 0.00, 0.9, 0.45), (783.99, 0.30, 0.9, 0.42), (1046.50, 0.60, 1.4, 0.4),
    ], duration=2.4, tail=0.9)
    synth_cue(RAW / "gamelator_boot_win11.wav", [
        (164.81, 0.00, 2.2, 0.35), (246.94, 0.10, 2.2, 0.28), (329.63, 0.20, 2.2, 0.25),
        (987.77, 1.10, 1.0, 0.18), (1318.51, 1.35, 1.0, 0.14),
    ], duration=3.2, tail=0.7)


if __name__ == "__main__":
    WALL.mkdir(parents=True, exist_ok=True)
    wallpaper_win7()
    wallpaper_win8()
    wallpaper_win10()
    wallpaper_win11()
    wallpaper_auto()
    cues()

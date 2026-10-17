#!/usr/bin/env python3
"""Generates Gamelator's own UI artwork (drawer icons and the header logo).

Run once; the PNGs are committed under windows-engine/gamelator-res/ and copied
into the Winlator-based app by windows-engine/brand.sh.
Icons are white on transparent so the navigation view can tint them.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path

OUT = Path(__file__).resolve().parent / "gamelator-res" / "drawable-xxhdpi"
OUT.mkdir(parents=True, exist_ok=True)

BIG = 288   # draw at 4x, then downscale to 72px (24dp at xxhdpi)
SMALL = 72
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def save(img, name):
    img.resize((SMALL, SMALL), Image.LANCZOS).save(OUT / f"{name}.png")
    print("wrote", name)


def icon_library():
    img = Image.new("RGBA", (BIG, BIG), CLEAR)
    d = ImageDraw.Draw(img)
    for x, y in [(40, 40), (156, 40), (40, 156), (156, 156)]:
        d.rounded_rectangle([x, y, x + 92, y + 92], radius=22, fill=WHITE)
    save(img, "gl_nav_library")


def icon_prefix():
    img = Image.new("RGBA", (BIG, BIG), CLEAR)
    d = ImageDraw.Draw(img)
    top = [(144, 30), (250, 86), (250, 204), (144, 260), (38, 204), (38, 86)]
    d.polygon(top, outline=WHITE, width=0)
    d.line(top + [top[0]], fill=WHITE, width=22, joint="curve")
    d.line([(38, 86), (144, 144), (250, 86)], fill=WHITE, width=22, joint="curve")
    d.line([(144, 144), (144, 260)], fill=WHITE, width=22)
    save(img, "gl_nav_prefix")


def icon_controls():
    img = Image.new("RGBA", (BIG, BIG), CLEAR)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([20, 84, 268, 226], radius=70, fill=WHITE)
    d.rounded_rectangle([60, 130, 112, 146], radius=6, fill=CLEAR)   # d-pad cut-outs
    d.rounded_rectangle([78, 112, 96, 164], radius=6, fill=CLEAR)
    d.ellipse([186, 118, 210, 142], fill=CLEAR)                       # buttons
    d.ellipse([214, 146, 238, 170], fill=CLEAR)
    save(img, "gl_nav_controls")


def icon_tuning():
    img = Image.new("RGBA", (BIG, BIG), CLEAR)
    d = ImageDraw.Draw(img)
    d.arc([30, 40, 258, 268], start=180, end=360, fill=WHITE, width=24)
    d.line([(144, 160), (206, 96)], fill=WHITE, width=20)
    d.ellipse([122, 138, 166, 182], fill=WHITE)
    d.line([(60, 232), (228, 232)], fill=WHITE, width=20)
    save(img, "gl_nav_tuning")


def icon_settings():
    import math
    img = Image.new("RGBA", (BIG, BIG), CLEAR)
    d = ImageDraw.Draw(img)
    cx = cy = BIG / 2
    pts = []
    teeth = 8
    for i in range(teeth * 4):
        a = (2 * math.pi / (teeth * 4)) * i
        r = 128 if (i % 4) in (0, 1) else 100
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=WHITE)
    d.ellipse([cx - 44, cy - 44, cx + 44, cy + 44], fill=CLEAR)
    save(img, "gl_nav_settings")


def icon_about():
    img = Image.new("RGBA", (BIG, BIG), CLEAR)
    d = ImageDraw.Draw(img)
    d.ellipse([28, 28, 260, 260], outline=WHITE, width=22)
    d.ellipse([124, 66, 164, 106], fill=WHITE)
    d.rounded_rectangle([124, 124, 164, 226], radius=14, fill=WHITE)
    save(img, "gl_nav_about")


def logo():
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 190)
    text = "GAMELATOR"
    W, H = 1100, 330
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).text((30, 20), text, font=font, fill=255)
    box = mask.getbbox()
    mask = mask.crop(box)
    w, h = mask.size
    grad = Image.new("RGBA", (w, h))
    gd = ImageDraw.Draw(grad)
    for x in range(w):
        t = x / max(1, w - 1)
        r = int(0 + (168 - 0) * t)
        g = int(229 + (85 - 229) * t)
        b = int(255 + (247 - 255) * t)
        gd.line([(x, 0), (x, h)], fill=(r, g, b, 255))
    glow = Image.new("RGBA", (w + 80, h + 80), CLEAR)
    glow.paste(grad, (40, 40), mask)
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    out = Image.new("RGBA", (w + 80, h + 120), CLEAR)
    out.alpha_composite(glow)
    body = Image.new("RGBA", (w, h), CLEAR)
    body.paste(grad, (0, 0), mask)
    out.alpha_composite(body, (40, 40))
    bar = ImageDraw.Draw(out)
    bar.rounded_rectangle([40, h + 62, w + 40, h + 74], radius=6, fill=(255, 255, 255, 230))
    target = OUT / "gl_logo.png"
    out.save(target)
    print("wrote gl_logo", out.size)


if __name__ == "__main__":
    icon_library()
    icon_prefix()
    icon_controls()
    icon_tuning()
    icon_settings()
    icon_about()
    logo()

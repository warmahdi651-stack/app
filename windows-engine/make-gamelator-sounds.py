#!/usr/bin/env python3
"""Synthesizes Gamelator's own sound effects (original, generated with plain math).
Run once; outputs are committed under windows-engine/gamelator-sounds/."""
import math, struct, wave
from pathlib import Path

OUT = Path(__file__).resolve().parent / "gamelator-sounds"
OUT.mkdir(parents=True, exist_ok=True)
RATE = 22050

def write(name, samples):
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        frames = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 26000)) for s in samples)
        w.writeframes(frames)

def tone(freq, t, dur, vol=1.0):
    env = min(1.0, t / 0.01) * math.exp(-3.5 * t / dur)
    return vol * env * (0.7 * math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(2 * math.pi * 2 * freq * t))

# Startup: four rising notes (C5 E5 G5 C6), a short bright chime.
notes = [523.25, 659.25, 783.99, 1046.5]
samples = []
for i, f in enumerate(notes):
    n = int(RATE * 0.28)
    for k in range(n):
        samples.append(tone(f, k / RATE, 0.28, 0.8))
    # tiny gap between notes
    samples.extend([0.0] * int(RATE * 0.03))
tail = int(RATE * 0.6)
samples.extend(tone(1046.5, k / RATE, 0.6, 0.6) for k in range(tail))
write("gamelator_startup.wav", samples)

# UI click: very short high tick.
click = [tone(1800, k / RATE, 0.03, 0.5) for k in range(int(RATE * 0.04))]
write("gamelator_click.wav", click)
print("sounds written to", OUT)

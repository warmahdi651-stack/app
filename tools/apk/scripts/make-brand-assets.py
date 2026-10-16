#!/usr/bin/env python3
"""Generate the branded launcher resources used by the APK pipeline.

The project already keeps a deterministic icon renderer in make-icons.py; this entry
point is intentionally the single command used by release builders and also writes
an English release marker consumed by the download page.
"""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
try:
    import PIL  # noqa: F401
except ImportError:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', '--break-system-packages', 'pillow'], check=True)
subprocess.run([sys.executable, str(root / 'tools/apk/scripts/make-icons.py')], check=True)
(root / 'tools/apk/android/assets').mkdir(parents=True, exist_ok=True)
(root / 'tools/apk/android/assets' / 'release-v2.txt').write_text(
    'Windows in Mobile 2.0.0\nEnglish • Left-to-right • WebView renderer recovery enabled\n',
    encoding='utf-8',
)
print('Brand launcher resources prepared for Windows in Mobile v2.0.0.')

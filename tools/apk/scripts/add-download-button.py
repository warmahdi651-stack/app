#!/usr/bin/env python3
"""افزودن دکمهٔ دانلود APK به صفحهٔ منتشرشده روی GitHub Pages."""
import sys

path = sys.argv[1]
html = open(path, encoding="utf-8").read()

button = """
    <a href="./windows-simulator.apk" download="windows-simulator.apk"
       style="position:fixed;left:12px;bottom:12px;z-index:9999;direction:rtl;
              background:rgba(11,18,32,.92);color:#e8eefc;border:1px solid #2b3a57;
              border-radius:12px;padding:9px 14px;font:600 13px/1.6 system-ui,sans-serif;
              text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.45)">دانلود APK</a>
"""

if "windows-simulator.apk" in html:
    print("دکمه از قبل هست.")
else:
    html = html.replace("</body>", button + "  </body>")
    open(path, "w", encoding="utf-8").write(html)
    print("دکمهٔ دانلود اضافه شد.")

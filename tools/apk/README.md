# ساخت APK «ویندوز در موبایل» — بدون Android Studio

این پوشه یک خط لولهٔ کامل برای ساخت **فایل نصبی اندروید (APK)** از همان کد اپ React Native/Expo
است، ولی بدون نیاز به Android Studio، Gradle یا دانلود Android SDK.

## یک دستور

```bash
bash tools/apk/build.sh
```

خروجی: `apps/mobile/dist-android/windows-simulator.apk` (امضا شده با v1 + v2 + v3، آمادهٔ نصب).

## این خط لوله چه می‌کند؟

| مرحله | ابزار | توضیح |
|---|---|---|
| خروجی وب | `expo export --platform web` | همان رابطی که در پیش‌نمایش می‌بینید |
| اصلاح مسیرها | `scripts/patch-web-assets.mjs` | تبدیل مسیرهای مطلق به نسبی برای اجرای `file:///android_asset` |
| آیکون‌ها | `scripts/make-icons.py` | ساخت آیکون تطبیقی از `apps/mobile/assets` |
| کامپایل منابع | **apktool 2.9.3** (aapt2 داخلی) | تبدیل `AndroidManifest.xml` و منابع به فرمت باینری |
| اسمبل dex | **smali** (داخل apktool) | تبدیل `MainActivity.smali` به `classes.dex` |
| بازسازی | `scripts/repack.mjs` | `resources.arsc` و `AndroidManifest.xml` بدون فشرده‌سازی + هم‌ترازی ۴ بایتی (الزام اندروید ۱۱+) |
| امضا | **apksigner** | امضای v1 (JAR) + v2 + v3 با کلید `release.jks` |
| بررسی | `apksigner verify` | تأیید نهایی امضا |

## ابزارها چطور تأمین می‌شوند؟

همه به‌صورت خودکار و فقط از سه مبدأ در دسترس دانلود می‌شوند:

- **npm** → `@postar/apktool-node` (شامل `apktool.jar` و `apksigner.jar` با aapt2 داخلی)
- **GitHub** → `Sable/android-platforms` برای `android.jar` فریم‌ورک اندروید ۱۴
- **PyPI** → `jdk4py` (فقط اگر `java` روی سیستم نباشد) و `pillow` برای آیکون‌ها

## ساختار پروژه

```
tools/apk/
├── build.sh                     خط لولهٔ کامل
├── android/
│   ├── AndroidManifest.xml      پکیج com.arena.windowsinmobile
│   ├── apktool.yml              پیکربندی پروژهٔ apktool
│   ├── res/values/              نام برنامه، رنگ‌ها و تم
│   ├── res/mipmap-anydpi-v26/   آیکون تطبیقی (اندروید ۸+)
│   └── smali/com/arena/windowsinmobile/
│       ├── MainActivity.smali         میزبان WebView
│       └── MainActivity$WebViewClient.smali
└── scripts/
    ├── make-icons.py
    ├── patch-web-assets.mjs
    └── repack.mjs
```

## نکته‌ها

- برنامه در حالت **آفلاین/مهمان** کار می‌کند: داده‌ها در حافظهٔ محلی گوشی (`localStorage`) می‌مانند.
  برای ورود و همگام‌سازی با PostgreSQL باید آدرس سرور در دسترس باشد.
- کلید امضا در `tools/apk/.tools/release.jks` ساخته می‌شود (رمز: `windowssim`).
  این پوشه در گیت نیست؛ برای انتشار در فروشگاه باید کلید را نگه دارید.
- برای ساخت نسخهٔ EAS (تولید AAB) همچنان `apps/mobile/eas.json` در دسترس است.

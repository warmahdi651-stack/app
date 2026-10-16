# 🪟 ویندوز در موبایل

یک **شبیه‌ساز محیط دسکتاپ ویندوز** که داخل گوشی اجرا می‌شود: دسکتاپ با پس‌زمینه، پنجره‌های قابل
جابه‌جایی و تغییر اندازه، نوار وظیفه (تسک‌بار) و منوی استارت — همه با رابط کاربری **فارسی و راست‌به‌چپ**
و **تقویم هجری شمسی**.

داده‌ها (فایل‌های مجازی، یادداشت‌ها و چیدمان پنجره‌ها) روی **PostgreSQL** ذخیره می‌شوند و در صورت
نداشتن حساب کاربری، به‌صورت محلی روی دستگاه نگهداری می‌شوند.

---

## معماری

```
app/
├── apps/
│   ├── mobile/     # اپ موبایل: React Native + Expo (خروجی وب و بومی)
│   └── server/     # بک‌اند: Fastify + PostgreSQL (با PGlite به‌عنوان جایگزین سبک)
├── docker-compose.yml
└── package.json    # اسکریپت‌های راه‌اندازی در ریشه
```

| بخش | تکنولوژی |
| --- | --- |
| رابط کاربری | React Native 0.88 + Expo SDK 58 + react-native-web |
| مدیریت پنجره | کامپوننت اختصاصی (کشیدن، تغییر اندازه، کمینه/بیشینه، z-index) |
| فونت و تاریخ | Vazirmatn + پیاده‌سازی تقویم هجری شمسی (الگوریتم ۳۳ ساله) |
| ذخیره‌سازی محلی | AsyncStorage (وب: localStorage) |
| بک‌اند | Fastify 5 + Zod + scrypt برای رمز عبور |
| پایگاه‌داده | PostgreSQL ۱۶ یا PGlite (PostgreSQL کامپایل‌شده به WASM) |

---

## راه‌اندازی سریع

```bash
# ۱) نصب وابستگی‌ها
npm run install:all

# ۲) ساخت نسخهٔ وب اپ (سرور همین خروجی را سرو می‌کند)
npm run build:web

# ۳) اجرای سرور (API + نسخهٔ وب) روی http://localhost:4000
npm start
```

برای توسعهٔ زندهٔ اپ:

```bash
npm run dev:api     # سرور با بارگذاری مجدد خودکار
npm run dev:web     # اپ در حالت توسعه (Metro)
```

### تست‌ها

```bash
npm test                # تست‌های واحد (تقویم جلالی، ابزارهای فارسی) + تست‌های API
npm --prefix apps/mobile run test:e2e   # تست دود روی نسخهٔ وب ساخته‌شده
npm run typecheck       # بررسی تایپ‌ها در هر دو بسته
```

---

## پایگاه‌داده

سرور به‌صورت پیش‌فرض بدون نصب هیچ‌چیز کار می‌کند و از **PGlite** استفاده می‌کند
(خودِ PostgreSQL کامپایل‌شده به WASM که داده‌ها را در `apps/server/.data/pgdata` ذخیره می‌کند).

برای استفاده از یک PostgreSQL واقعی:

```bash
docker compose up -d          # PostgreSQL 16 روی پورت ۵۴۳۲
export DATABASE_URL=postgres://windows:windows@localhost:5432/windows_sim
npm start
```

طرح‌وارهٔ جداول به‌صورت خودکار در شروع سرور ساخته می‌شود
(`users`, `sessions`, `fs_nodes`, `notes`, `desktop_states`).

---

## API

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/api/health` | وضعیت سرویس و نوع درایور پایگاه‌داده |
| `POST` | `/api/auth/register` | ساخت حساب (`username`, `password`, `displayName`) |
| `POST` | `/api/auth/login` | ورود و دریافت توکن نشست |
| `POST` | `/api/auth/logout` | پایان نشست |
| `GET` | `/api/auth/me` | کاربر جاری |
| `GET` | `/api/fs/tree` | درخت کامل فایل‌های مجازی |
| `GET` | `/api/fs/trash` | محتوای سطل زباله |
| `POST` | `/api/fs/folders` | ساخت پوشه |
| `POST` | `/api/fs/files` | ساخت فایل |
| `PATCH` | `/api/fs/nodes/:id` | تغییر نام یا جابه‌جایی |
| `PUT` | `/api/fs/nodes/:id/content` | ذخیرهٔ محتوای فایل |
| `DELETE` | `/api/fs/nodes/:id` | انتقال به سطل زباله (یا حذف همیشگی با `?permanent=true`) |
| `POST` | `/api/fs/nodes/:id/restore` | بازیابی از سطل زباله |
| `GET/POST/PUT/DELETE` | `/api/notes` | یادداشت‌های چسبان |
| `GET/PUT` | `/api/desktop` | وضعیت دسکتاپ (تنظیمات + چیدمان پنجره‌ها) |

همهٔ مسیرها به‌جز `health` و ورود/ثبت‌نام، هدر `Authorization: Bearer <token>` می‌خواهند.

---

## برنامه‌های داخل شبیه‌ساز

| برنامه | توضیح |
| --- | --- |
| **مدیر فایل** | پیمایش پوشه‌ها، جست‌وجو، ساخت پوشه، تغییر نام و حذف |
| **Notepad** | ویرایش متن با ذخیره در سیستم‌فایل مجازی و نوار وضعیت |
| **Terminal** | خط فرمان واقعی: `dir`, `cd`, `cat`, `mkdir`, `tree`, `neofetch`, `start` و… |
| **ماشین‌حساب** | حسابگر با کلیدهای عملگر، درصد، ریشه و معکوس |
| **مرورگر** | مرورگر داخلی با صفحه‌های آفلاین (`win.local`, `news.local`, `mail.local`) |
| **نقاشی** | بوم نقاشی با ذخیره در فایل `.paint` |
| **تصاویر** | گالری تصاویر تولیدشده |
| **یادداشت‌ها** | یادداشت‌های چسبان با ذخیره روی سرور |
| **تنظیمات** | تم روشن/تاریک، پس‌زمینه، رنگ تأکیدی، حساب کاربری و همگام‌سازی |
| **سطل زباله** | بازیابی یا حذف همیشگی فایل‌های حذف‌شده |
| **درباره** | اطلاعات سیستم |

---

## نکات پیاده‌سازی

- **مدیریت پنجره**: هر پنجره یک رکورد در `WindowProvider` است که مختصات، اندازه، z-index و وضعیت
  کمینه/بیشینه را نگه می‌دارد. جابه‌جایی با `PanResponder` انجام می‌شود تا روی وب و بومی یکسان کار کند.
- **راست‌به‌چپ**: به‌جای `I18nManager` (که نیاز به ری‌استارت دارد) از `row-reverse` و
  `writingDirection: 'rtl'` به‌صورت صریح استفاده شده تا رفتار در همهٔ پلتفرم‌ها یکسان باشد.
- **تقویم شمسی**: تبدیل گروهی/شمسی بر پایهٔ الگوریتم چرخهٔ ۳۳ ساله و روز ژولیَن
  (تست‌شده با تاریخ‌های مرجع مانند ۲۲ بهمن ۱۳۵۷ و ۱۱ دی ۱۳۷۸).
- **حالت آفلاین**: همهٔ عملیات ابتدا محلی انجام می‌شوند و در صورت ورود، به‌صورت همگام با سرور
  ذخیره می‌شوند؛ قطع سرور باعث از دست رفتن داده نمی‌شود.
- **آدرس API در بومی**: مقدار `EXPO_PUBLIC_API_URL` را تنظیم کنید
  (مثلاً `http://192.168.1.20:4000` برای گوشی روی شبکهٔ محلی).

---

## اجرا روی گوشی

```bash
npm --prefix apps/mobile run start
# سپس با Expo Go اسکن کنید یا:
npm --prefix apps/mobile run android
npm --prefix apps/mobile run ios
```

برای اتصال به سرور روی کامپیوتر:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npm --prefix apps/mobile run start
```

---

## ساخت فایل نصبی (APK) برای گوشی

### 📥 دانلود فایل نصبی آماده

| لینک | توضیح |
|---|---|
| `https://warmahdi651-stack.github.io/app/windows-simulator.apk` | از سایت منتشرشده (پیشنهادی) |
| `https://github.com/warmahdi651-stack/app/raw/arena/1db484ac-app/releases/Windows-in-Mobile-v2.0.0.apk` | از مخزن گیت‌هاب |
| `https://cdn.jsdelivr.net/gh/warmahdi651-stack/app@arena/1db484ac-app/releases/Windows-in-Mobile-v2.0.0.apk` | از CDN |

- پکیج: `com.arena.windowsinmobile` — امضای v1 + v2 + v3 — اندروید ۵ به بالا — حدود ۳٫۳ مگابایت
- پس از دانلود، در تنظیمات گوشی به فایل‌منیجر اجازهٔ **«نصب از منابع ناشناس»** بدهید.
- اپ در حالت **آفلاین/مهمان** اجرا می‌شود و داده‌ها را در حافظهٔ محلی گوشی نگه می‌دارد.
  برای ورود و همگام‌سازی با PostgreSQL باید آدرس یک سرور در دسترس باشد.

### 🛠 ساخت مستقیم APK در همین ریپو (بدون Android Studio و بدون Gradle)

```bash
bash tools/apk/build.sh
```

خروجی: `apps/mobile/dist-android/windows-simulator.apk` — یک APK واقعی، امضاشده (v1+v2+v3)،
قابل نصب روی هر گوشی اندروید ۵ به بالا (نام پکیج: `com.arena.windowsinmobile`).

ابزارهای لازم (apktool، apksigner، android.jar و JDK) به‌صورت خودکار از npm، GitHub و PyPI
دانلود می‌شوند؛ جزئیات در [`tools/apk/README.md`](tools/apk/README.md) آمده است.

### راه‌های دیگر

این پروژه یک اپ Expo است، پس این راه‌ها هم در دسترس‌اند:

### ۱) تست سریع بدون نصب — Expo Go

```bash
cd apps/mobile
npm install
npx expo start
```

سپس با اپ **Expo Go** (اندروید/آی‌اس) کد QR را اسکن کنید. اگر گوشی و کامپیوتر روی یک شبکه نیستند:

```bash
npx expo start --tunnel
```

> برای اتصال به سرور روی کامپیوتر خودتان:
> `EXPO_PUBLIC_API_URL=http://<آی‌پی-کامپیوتر>:4000 npx expo start`

### ۲) ساخت APK از طریق EAS Build (خروجی قابل دانلود)

پیکربندی از قبل در `apps/mobile/eas.json` آماده است:

```bash
cd apps/mobile
npm install -g eas-cli
eas login                 # یک‌بار برای ورود به حساب Expo
eas build -p android --profile preview
```

خروجی یک فایل APK است که لینک دانلودش از طریق ایمیل/پنل EAS برایتان ارسال می‌شود.
(پروفایل `production` خروجی AAB برای انتشار در فروشگاه می‌سازد.)

### ۳) ساخت محلی APK (نیازمند Android Studio)

```bash
cd apps/mobile
npx expo prebuild --platform android   # تولید پوشهٔ android/
cd android && ./gradlew assembleDebug  # خروجی: android/app/build/outputs/apk/debug/app-debug.apk
```

### ۴) بدون نصب هیچ‌چیز — نسخهٔ وب

```bash
npm run install:all
npm run build:web
npm start        # سپس در مرورگر: http://localhost:4000
```

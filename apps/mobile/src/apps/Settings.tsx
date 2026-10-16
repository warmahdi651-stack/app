import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Field, Row, SectionTitle, Toggle } from '../components/ui';
import { toPersianDigits } from '../lib/fa';
import { useAuth } from '../state/AuthProvider';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { fonts, radius, typeScale, wallpapers } from '../theme';
import type { AppProps } from '../registry';

type Section = 'personal' | 'system' | 'account' | 'about';

const SECTIONS: { id: Section; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'personal', label: 'شخصی‌سازی', icon: 'color-palette-outline' },
  { id: 'system', label: 'سیستم', icon: 'settings-outline' },
  { id: 'account', label: 'حساب کاربری', icon: 'person-circle-outline' },
  { id: 'about', label: 'درباره', icon: 'information-circle-outline' },
];

const ACCENTS = ['#4c9aff', '#0a6cff', '#7f5af0', '#e05d8c', '#f2b544', '#2fb575', '#e0523c'];

export function SettingsApp(_props: AppProps) {
  const { palette, settings, updateSettings } = useShell();
  const auth = useAuth();
  const vfs = useVfs();
  const [section, setSection] = useState<Section>('personal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const fileCount = vfs.nodes.filter((n) => !n.deletedAt).length;
  const totalSize = vfs.nodes.reduce((sum, n) => sum + n.content.length, 0);

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.sidebar, { backgroundColor: palette.surfaceAlt, borderLeftColor: palette.border }]}>
        {SECTIONS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSection(item.id)}
            style={({ pressed }) => [
              styles.navItem,
              {
                backgroundColor:
                  section === item.id ? palette.accentSoft : pressed ? palette.surfaceHover : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={15}
              color={section === item.id ? palette.accent : palette.textMuted}
            />
            <Text
              style={[
                styles.navLabel,
                { color: section === item.id ? palette.accent : palette.text },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {section === 'personal' ? (
          <>
            <SectionTitle text="حالت نمایش" palette={palette} />
            <Row
              icon="moon-outline"
              title="تم تیره"
              subtitle="ظاهر ویندوز را تیره کنید"
              palette={palette}
              right={
                <Toggle
                  value={settings.theme === 'dark'}
                  onChange={(v) => updateSettings({ theme: v ? 'dark' : 'light' })}
                  palette={palette}
                />
              }
            />
            <Row
              icon="time-outline"
              title="ساعت ۲۴ ساعته"
              palette={palette}
              right={
                <Toggle
                  value={settings.use24Hour}
                  onChange={(v) => updateSettings({ use24Hour: v })}
                  palette={palette}
                />
              }
            />
            <Row
              icon="timer-outline"
              title="نمایش ثانیه"
              palette={palette}
              right={
                <Toggle
                  value={settings.showSeconds}
                  onChange={(v) => updateSettings({ showSeconds: v })}
                  palette={palette}
                />
              }
            />

            <SectionTitle text="پس‌زمینه" palette={palette} />
            <View style={styles.wallpaperGrid}>
              {wallpapers.map((wallpaper) => {
                const active = settings.wallpaper === wallpaper.id;
                return (
                  <Pressable
                    key={wallpaper.id}
                    onPress={() => updateSettings({ wallpaper: wallpaper.id })}
                    style={[
                      styles.wallpaperTile,
                      {
                        backgroundColor: wallpaper.colors[0],
                        borderColor: active ? palette.accent : palette.border,
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.wallpaperStrip, { backgroundColor: wallpaper.colors[1] }]} />
                    <View style={[styles.wallpaperStrip, { backgroundColor: wallpaper.colors[2] }]} />
                    {active ? (
                      <View style={[styles.wallpaperCheck, { backgroundColor: palette.accent }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    ) : null}
                    <Text style={styles.wallpaperLabel}>{wallpaper.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionTitle text="رنگ تأکیدی" palette={palette} />
            <View style={styles.accentRow}>
              {ACCENTS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => updateSettings({ accentColor: color })}
                  style={[
                    styles.accentDot,
                    {
                      backgroundColor: color,
                      borderColor: settings.accentColor === color ? palette.text : 'transparent',
                      borderWidth: settings.accentColor === color ? 2 : 0,
                    },
                  ]}
                />
              ))}
            </View>

            <SectionTitle text="نام کاربر" palette={palette} />
            <Field
              value={settings.userName}
              onChangeText={(text) => updateSettings({ userName: text })}
              placeholder="نام کاربر"
              palette={palette}
              autoCapitalize="words"
            />
          </>
        ) : null}

        {section === 'system' ? (
          <>
            <SectionTitle text="وضعیت سیستم" palette={palette} />
            <Row icon="hardware-chip-outline" title="نسخه" subtitle="ویندوز ۱۱ — نسخهٔ شبیه‌سازی‌شده ۱٫۰٫۰" palette={palette} />
            <Row
              icon="server-outline"
              title="فضای ذخیره‌سازی"
              subtitle={`${toPersianDigits(fileCount)} مورد — ${toPersianDigits(totalSize)} نویسه`}
              palette={palette}
            />
            <Row
              icon="cloud-done-outline"
              title="همگام‌سازی با سرور"
              subtitle={
                auth.status === 'authenticated'
                  ? vfs.offline
                    ? 'آفلاین — تغییرات به‌صورت محلی ذخیره می‌شود'
                    : 'متصل — داده‌ها در PostgreSQL ذخیره می‌شوند'
                  : 'برای فعال‌سازی، وارد حساب کاربری شوید'
              }
              palette={palette}
            />
            <Row
              icon="trash-outline"
              title="پاک‌سازی فایل‌های حذف‌شده"
              palette={palette}
              right={
                <AppButton
                  label="خالی کردن"
                  variant="ghost"
                  palette={palette}
                  onPress={() => void vfs.emptyTrash()}
                />
              }
            />
            <View style={{ height: 14 }} />
            <AppButton
              label="بازنشانی فایل‌های پیش‌فرض"
              icon="refresh"
              palette={palette}
              variant="ghost"
              onPress={() => void vfs.resetToDefault()}
            />
          </>
        ) : null}

        {section === 'account' ? (
          <>
            <SectionTitle text="حساب کاربری" palette={palette} />
            {auth.status === 'authenticated' && auth.user ? (
              <>
                <Row
                  icon="person-circle"
                  title={auth.user.displayName}
                  subtitle={`@${auth.user.username}`}
                  palette={palette}
                />
                <View style={{ height: 10 }} />
                <AppButton
                  label="خروج از حساب"
                  icon="log-out-outline"
                  palette={palette}
                  variant="danger"
                  onPress={() => void auth.logout()}
                />
              </>
            ) : (
              <>
                <View style={styles.modeRow}>
                  <AppButton
                    label="ورود"
                    palette={palette}
                    variant={mode === 'login' ? 'primary' : 'ghost'}
                    onPress={() => setMode('login')}
                    style={styles.modeButton}
                  />
                  <AppButton
                    label="ثبت‌نام"
                    palette={palette}
                    variant={mode === 'register' ? 'primary' : 'ghost'}
                    onPress={() => setMode('register')}
                    style={styles.modeButton}
                  />
                </View>
                {mode === 'register' ? (
                  <View style={{ marginBottom: 8 }}>
                    <Field
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="نام نمایشی"
                      palette={palette}
                      autoCapitalize="words"
                    />
                  </View>
                ) : null}
                <Field
                  value={username}
                  onChangeText={setUsername}
                  placeholder="نام کاربری"
                  palette={palette}
                />
                <View style={{ height: 8 }} />
                <Field
                  value={password}
                  onChangeText={setPassword}
                  placeholder="رمز عبور"
                  palette={palette}
                  secureTextEntry
                />
                {auth.error ? (
                  <Text style={[styles.error, { color: palette.danger }]}>{auth.error}</Text>
                ) : null}
                <View style={{ height: 12 }} />
                <AppButton
                  label={mode === 'login' ? 'ورود به حساب' : 'ساخت حساب'}
                  icon="log-in-outline"
                  variant="primary"
                  palette={palette}
                  disabled={auth.busy || !username || !password}
                  onPress={async () => {
                    if (mode === 'login') await auth.login(username, password);
                    else await auth.register(username, password, displayName || username);
                  }}
                />
                <Text style={[styles.hint, { color: palette.textMuted }]}>
                  با ورود به حساب، پنجره‌ها، فایل‌ها و تنظیمات شما روی سرور (PostgreSQL) ذخیره می‌شود.
                </Text>
              </>
            )}
          </>
        ) : null}

        {section === 'about' ? (
          <>
            <SectionTitle text="درباره" palette={palette} />
            <View style={styles.aboutHeader}>
              <Ionicons name="logo-windows" size={38} color={palette.accent} />
              <Text style={[styles.aboutTitle, { color: palette.text }]}>ویندوز در موبایل</Text>
              <Text style={[styles.aboutSubtitle, { color: palette.textMuted }]}>
                شبیه‌ساز محیط دسکتاپ ویندوز برای گوشی — نسخهٔ ۱٫۰٫۰
              </Text>
            </View>
            <Row icon="phone-portrait-outline" title="ساخته‌شده با" subtitle="React Native + Expo" palette={palette} />
            <Row icon="server-outline" title="بک‌اند" subtitle="Fastify + PostgreSQL" palette={palette} />
            <Row icon="language-outline" title="زبان" subtitle="فارسی — راست‌به‌چپ با تقویم هجری شمسی" palette={palette} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  sidebar: {
    width: 108,
    padding: 6,
    gap: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  navItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  navLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    writingDirection: 'rtl',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 12,
    gap: 2,
  },
  wallpaperGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  wallpaperTile: {
    width: '30%',
    aspectRatio: 1.4,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  wallpaperStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '34%',
    opacity: 0.9,
  },
  wallpaperCheck: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallpaperLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    color: '#fff',
    writingDirection: 'rtl',
  },
  accentRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingVertical: 6,
  },
  accentDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  modeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    marginTop: 8,
    writingDirection: 'rtl',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    marginTop: 10,
    lineHeight: 18,
    writingDirection: 'rtl',
  },
  aboutHeader: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  aboutTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.heading,
    writingDirection: 'rtl',
  },
  aboutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

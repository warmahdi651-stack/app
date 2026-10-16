import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Row, SectionTitle } from '../components/ui';
import { formatJalaliLong } from '../lib/jalali';
import { toPersianDigits } from '../lib/fa';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { fonts, typeScale } from '../theme';
import type { AppProps } from '../registry';

export function AboutApp(_props: AppProps) {
  const { palette, settings } = useShell();
  const vfs = useVfs();
  const files = vfs.nodes.filter((n) => !n.deletedAt);

  return (
    <ScrollView style={{ backgroundColor: palette.surface }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="logo-windows" size={44} color={palette.accent} />
        <Text style={[styles.title, { color: palette.text }]}>ویندوز در موبایل</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          نسخهٔ ۱٫۰٫۰ — ساخته‌شده با React Native و Expo
        </Text>
      </View>

      <SectionTitle text="دستگاه" palette={palette} />
      <Row icon="phone-portrait-outline" title="نام کاربر" subtitle={settings.userName || 'کاربر'} palette={palette} />
      <Row icon="time-outline" title="تاریخ امروز" subtitle={formatJalaliLong(new Date())} palette={palette} />
      <Row
        icon="server-outline"
        title="فضای ذخیره‌سازی"
        subtitle={`${toPersianDigits(files.length)} مورد در دیسک مجازی`}
        palette={palette}
      />
      <Row
        icon="cloud-outline"
        title="وضعیت ذخیره‌سازی"
        subtitle={vfs.offline ? 'آفلاین — فقط روی دستگاه' : 'ذخیره‌سازی ابری فعال است'}
        palette={palette}
      />

      <SectionTitle text="برنامه‌های نصب‌شده" palette={palette} />
      <Row icon="folder-open-outline" title="File Explorer" subtitle="مدیریت فایل‌ها" palette={palette} />
      <Row icon="document-text-outline" title="Notepad" subtitle="ویرایشگر متن" palette={palette} />
      <Row icon="terminal-outline" title="Terminal" subtitle="خط فرمان" palette={palette} />
      <Row icon="calculator-outline" title="Calculator" subtitle="ماشین‌حساب" palette={palette} />
      <Row icon="color-palette-outline" title="Paint" subtitle="نقاشی" palette={palette} />
      <Row icon="globe-outline" title="Browser" subtitle="مرورگر داخلی" palette={palette} />
      <Row icon="images-outline" title="Photos" subtitle="گالری تصاویر" palette={palette} />
      <Row icon="reader-outline" title="Sticky Notes" subtitle="یادداشت‌ها" palette={palette} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 2,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typeScale.heading,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

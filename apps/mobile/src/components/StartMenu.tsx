import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APPS, GROUP_LABELS, type AppGroup } from '../registry';
import { Field } from './ui';
import { useAuth } from '../state/AuthProvider';
import { useShell } from '../state/ShellProvider';
import { fonts, radius, typeScale } from '../theme';

export function StartMenu({
  onOpenApp,
  onClose,
  onOpenSettings,
}: {
  onOpenApp: (appId: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const { palette } = useShell();
  const auth = useAuth();
  const [query, setQuery] = useState('');
  const [powerOpen, setPowerOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return APPS;
    const q = query.trim().toLowerCase();
    return APPS.filter((app) =>
      [app.title, app.id, ...(app.keywords ?? [])].some((k) => k.toLowerCase().includes(q)),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups = new Map<AppGroup, typeof APPS>();
    for (const app of filtered) {
      const list = groups.get(app.group) ?? [];
      list.push(app);
      groups.set(app.group, list);
    }
    return [...groups.entries()];
  }, [filtered]);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: palette.menu,
          borderColor: palette.menuBorder,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={styles.searchRow}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="جست‌وجوی برنامه‌ها..."
          palette={palette}
        />
      </View>

      <Pressable
        onPress={onOpenSettings}
        style={({ pressed }) => [
          styles.account,
          { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: palette.accent }]}>
          <Ionicons name="person" size={16} color={palette.textOnAccent} />
        </View>
        <View style={styles.accountText}>
          <Text style={[styles.accountName, { color: palette.text }]}>
            {auth.user?.displayName ?? 'کاربر مهمان'}
          </Text>
          <Text style={[styles.accountStatus, { color: palette.textMuted }]}>
            {auth.status === 'authenticated' ? 'وارد شده — همگام با سرور' : 'حساب مهمان — داده‌ها محلی ذخیره می‌شود'}
          </Text>
        </View>
        <Ionicons name="chevron-back" size={14} color={palette.textMuted} />
      </Pressable>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {query.trim() ? (
          <>
            <Text style={[styles.groupTitle, { color: palette.textMuted }]}>نتایج</Text>
            {filtered.length === 0 ? (
              <Text style={[styles.noResult, { color: palette.textMuted }]}>برنامه‌ای پیدا نشد.</Text>
            ) : (
              <View style={styles.pinnedGrid}>
                {filtered.map((app) => (
                  <AppTile key={app.id} app={app} palette={palette} onPress={() => onOpenApp(app.id)} />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.groupTitle, { color: palette.textMuted }]}>پیوست‌شده‌ها</Text>
            <View style={styles.pinnedGrid}>
              {APPS.slice(0, 8).map((app) => (
                <AppTile key={app.id} app={app} palette={palette} onPress={() => onOpenApp(app.id)} />
              ))}
            </View>

            {grouped.map(([group, apps]) => (
              <View key={group}>
                <Text style={[styles.groupTitle, { color: palette.textMuted }]}>
                  {GROUP_LABELS[group]}
                </Text>
                {apps.map((app) => (
                  <Pressable
                    key={app.id}
                    onPress={() => onOpenApp(app.id)}
                    style={({ pressed }) => [
                      styles.appRow,
                      { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
                    ]}
                  >
                    <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                      <Ionicons name={app.icon} size={14} color="#fff" />
                    </View>
                    <Text style={[styles.appRowText, { color: palette.text }]}>{app.title}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Pressable onPress={() => setPowerOpen((v) => !v)} style={styles.powerButton}>
          <Ionicons name="power" size={17} color={palette.text} />
        </Pressable>
        {powerOpen ? (
          <View style={[styles.powerMenu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <PowerItem
              icon="log-out-outline"
              label="خروج از حساب"
              palette={palette}
              onPress={() => {
                void auth.logout();
                setPowerOpen(false);
              }}
            />
            <PowerItem
              icon="desktop-outline"
              label="نمایش همهٔ پنجره‌ها"
              palette={palette}
              onPress={() => {
                setPowerOpen(false);
                onClose();
              }}
            />
            <PowerItem
              icon="settings-outline"
              label="تنظیمات"
              palette={palette}
              onPress={() => {
                setPowerOpen(false);
                onOpenSettings();
              }}
            />
          </View>
        ) : null}
        <Text style={[styles.footerText, { color: palette.textMuted }]}>ویندوز در موبایل</Text>
      </View>
    </View>
  );
}

function AppTile({
  app,
  palette,
  onPress,
}: {
  app: (typeof APPS)[number];
  palette: ReturnType<typeof useShell>['palette'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: app.color }]}>
        <Ionicons name={app.icon} size={20} color="#fff" />
      </View>
      <Text numberOfLines={1} style={[styles.tileLabel, { color: palette.text }]}>
        {app.title}
      </Text>
    </Pressable>
  );
}

function PowerItem({
  icon,
  label,
  palette,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  palette: ReturnType<typeof useShell>['palette'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.powerItem,
        { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={14} color={palette.text} />
      <Text style={[styles.powerItemText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 46,
    right: 8,
    width: '86%',
    maxWidth: 340,
    maxHeight: '74%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  searchRow: {
    marginBottom: 8,
  },
  account: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: radius.md,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    fontFamily: fonts.medium,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
  accountStatus: {
    fontFamily: fonts.regular,
    fontSize: typeScale.caption + 1,
    writingDirection: 'rtl',
  },
  scroll: {
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.caption + 1,
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  pinnedGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.caption + 1,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  appRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radius.md,
  },
  appIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRowText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
  noResult: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    writingDirection: 'rtl',
  },
  footer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  powerButton: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.caption + 1,
    writingDirection: 'rtl',
  },
  powerMenu: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    minWidth: 160,
    elevation: 8,
  },
  powerItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  powerItemText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
});

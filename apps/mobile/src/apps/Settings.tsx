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
  { id: 'personal', label: 'Personalization', icon: 'color-palette-outline' },
  { id: 'system', label: 'System', icon: 'settings-outline' },
  { id: 'account', label: 'Account', icon: 'person-circle-outline' },
  { id: 'about', label: 'About', icon: 'information-circle-outline' },
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
            <SectionTitle text="Display mode" palette={palette} />
            <Row
              icon="moon-outline"
              title="Dark theme"
              subtitle="Use a dark Windows appearance"
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
              title="24-hour clock"
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
              title="Show seconds"
              palette={palette}
              right={
                <Toggle
                  value={settings.showSeconds}
                  onChange={(v) => updateSettings({ showSeconds: v })}
                  palette={palette}
                />
              }
            />

            <SectionTitle text="Wallpaper" palette={palette} />
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

            <SectionTitle text="Accent color" palette={palette} />
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

            <SectionTitle text="User name" palette={palette} />
            <Field
              value={settings.userName}
              onChangeText={(text) => updateSettings({ userName: text })}
              placeholder="User name"
              palette={palette}
              autoCapitalize="words"
            />
          </>
        ) : null}

        {section === 'system' ? (
          <>
            <SectionTitle text="System status" palette={palette} />
            <Row icon="hardware-chip-outline" title="Version" subtitle={`Windows ${settings.shellVersion?.replace('win', '') ?? '11'} — Simulator 2.0.1`} palette={palette} />
            <Row
              icon="server-outline"
              title="Storage"
              subtitle={`${fileCount} items — ${totalSize} characters`}
              palette={palette}
            />
            <Row
              icon="cloud-done-outline"
              title="Server sync"
              subtitle={
                auth.status === 'authenticated'
                  ? vfs.offline
                    ? 'Offline — changes are saved locally'
                    : 'Connected — data is synced to PostgreSQL'
                  : 'Sign in to enable sync'
              }
              palette={palette}
            />
            <Row
              icon="trash-outline"
              title="Clean up deleted files"
              palette={palette}
              right={
                <AppButton
                  label="Empty"
                  variant="ghost"
                  palette={palette}
                  onPress={() => void vfs.emptyTrash()}
                />
              }
            />
            <View style={{ height: 14 }} />
            <AppButton
              label="Restore default files"
              icon="refresh"
              palette={palette}
              variant="ghost"
              onPress={() => void vfs.resetToDefault()}
            />
          </>
        ) : null}

        {section === 'account' ? (
          <>
            <SectionTitle text="Account" palette={palette} />
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
                  label="Sign out"
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
                    label="Sign in"
                    palette={palette}
                    variant={mode === 'login' ? 'primary' : 'ghost'}
                    onPress={() => setMode('login')}
                    style={styles.modeButton}
                  />
                  <AppButton
                    label="Sign up"
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
                      placeholder="Display name"
                      palette={palette}
                      autoCapitalize="words"
                    />
                  </View>
                ) : null}
                <Field
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  palette={palette}
                />
                <View style={{ height: 8 }} />
                <Field
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  palette={palette}
                  secureTextEntry
                />
                {auth.error ? (
                  <Text style={[styles.error, { color: palette.danger }]}>{auth.error}</Text>
                ) : null}
                <View style={{ height: 12 }} />
                <AppButton
                  label={mode === 'login' ? 'Sign in' : 'Create account'}
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
                  Sign in to sync your windows, files, and settings with the server (PostgreSQL).
                </Text>
              </>
            )}
          </>
        ) : null}

        {section === 'about' ? (
          <>
            <SectionTitle text="About" palette={palette} />
            <View style={styles.aboutHeader}>
              <Ionicons name="logo-windows" size={38} color={palette.accent} />
              <Text style={[styles.aboutTitle, { color: palette.text }]}>Windows in Mobile</Text>
              <Text style={[styles.aboutSubtitle, { color: palette.textMuted }]}>
                A Windows-inspired mobile desktop — Version 2.0.1
              </Text>
            </View>
            <Row icon="phone-portrait-outline" title="Built with" subtitle="React Native + Expo" palette={palette} />
            <Row icon="server-outline" title="Backend" subtitle="Fastify + PostgreSQL" palette={palette} />
            <Row icon="language-outline" title="Language" subtitle="English — left-to-right" palette={palette} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 108,
    padding: 6,
    gap: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  navLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    writingDirection: 'ltr',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 12,
    gap: 2,
  },
  wallpaperGrid: {
    flexDirection: 'row',
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
    writingDirection: 'ltr',
  },
  accentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  accentDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  modeRow: {
    flexDirection: 'row',
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
    writingDirection: 'ltr',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    marginTop: 10,
    lineHeight: 18,
    writingDirection: 'ltr',
  },
  aboutHeader: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  aboutTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.heading,
    writingDirection: 'ltr',
  },
  aboutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
});

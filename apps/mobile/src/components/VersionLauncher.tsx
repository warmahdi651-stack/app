import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ShellVersion } from '../state/types';
import { useShell } from '../state/ShellProvider';

const EDITIONS: { id: ShellVersion; name: string; caption: string; accent: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'win7', name: 'Windows 7', caption: 'Classic • Aero glass', accent: '#3a9bd9', icon: 'logo-windows' },
  { id: 'win8', name: 'Windows 8', caption: 'Modern • Live tiles', accent: '#08a6c2', icon: 'grid' },
  { id: 'win10', name: 'Windows 10', caption: 'Familiar • Start menu', accent: '#0878d1', icon: 'logo-windows' },
  { id: 'win11', name: 'Windows 11', caption: 'Refined • Centered taskbar', accent: '#5865d8', icon: 'logo-windows' },
];

export function VersionLauncher({ onChoose }: { onChoose?: (version: ShellVersion) => void }) {
  const { settings, updateSettings } = useShell();
  const choose = (id: ShellVersion) => {
    updateSettings({ shellVersion: id });
    onChoose?.(id);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <View style={styles.logo}><Ionicons name="logo-windows" size={30} color="#fff" /></View>
        <Text style={styles.title}>Choose your Windows</Text>
        <Text style={styles.subtitle}>Each edition has its own look and a separate virtual drive.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {EDITIONS.map((edition) => {
          const selected = settings.shellVersion === edition.id;
          return (
            <Pressable key={edition.id} onPress={() => choose(edition.id)} style={[styles.tile, { backgroundColor: edition.accent }, selected && styles.selected]}>
              <Ionicons name={edition.icon} size={30} color="#fff" />
              <Text style={styles.edition}>{edition.name}</Text>
              <Text style={styles.caption}>{edition.caption}</Text>
              <Text style={styles.launch}>{selected ? 'Current edition' : 'Launch edition'}  ›</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.footer}>Windows in Mobile • Version 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', zIndex: 9999, left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#071426', paddingHorizontal: 22, paddingTop: 38, paddingBottom: 16 },
  heading: { alignItems: 'center', marginBottom: 26 },
  logo: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#1687e8', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: '#fff', fontSize: 23, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#b7c4d7', fontSize: 13, textAlign: 'center', marginTop: 8, maxWidth: 360 },
  grid: { gap: 12, paddingBottom: 12, alignItems: 'center' },
  tile: { width: '100%', maxWidth: 460, minHeight: 120, borderRadius: 14, padding: 16, justifyContent: 'center', elevation: 4 },
  selected: { borderWidth: 2, borderColor: '#fff' },
  edition: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 7 },
  caption: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2 },
  launch: { color: '#fff', fontWeight: '600', fontSize: 12, position: 'absolute', right: 15, bottom: 15 },
  footer: { color: '#9aabc2', textAlign: 'center', fontSize: 11, marginTop: 'auto', paddingTop: 8 },
});

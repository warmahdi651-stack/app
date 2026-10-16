import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Row, SectionTitle } from '../components/ui';
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
        <Text style={[styles.title, { color: palette.text }]}>Windows in Mobile</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Version 2.0.1 — Built with React Native and Expo
        </Text>
      </View>

      <SectionTitle text="Device" palette={palette} />
      <Row icon="phone-portrait-outline" title="User name" subtitle={settings.userName || 'User'} palette={palette} />
      <Row icon="time-outline" title="Today" subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} palette={palette} />
      <Row
        icon="server-outline"
        title="Storage"
        subtitle={`${files.length} items on the virtual disk`}
        palette={palette}
      />
      <Row
        icon="cloud-outline"
        title="Storage status"
        subtitle={vfs.offline ? 'Offline — on this device only' : 'Cloud storage is enabled'}
        palette={palette}
      />

      <SectionTitle text="Installed apps" palette={palette} />
      <Row icon="folder-open-outline" title="File Explorer" subtitle="File management" palette={palette} />
      <Row icon="document-text-outline" title="Notepad" subtitle="Text editor" palette={palette} />
      <Row icon="terminal-outline" title="Terminal" subtitle="Command line" palette={palette} />
      <Row icon="calculator-outline" title="Calculator" subtitle="Calculator" palette={palette} />
      <Row icon="color-palette-outline" title="Paint" subtitle="Paint" palette={palette} />
      <Row icon="globe-outline" title="Browser" subtitle="Built-in browser" palette={palette} />
      <Row icon="images-outline" title="Photos" subtitle="Photo gallery" palette={palette} />
      <Row icon="reader-outline" title="Sticky Notes" subtitle="Notes" palette={palette} />
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
    writingDirection: 'ltr',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field } from '../components/ui';
import { useShell } from '../state/ShellProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; target: string }
  | { kind: 'tiles' };

type Page = { title: string; blocks: Block[] };

const PAGES: Record<string, Page> = {
  'home://': {
    title: 'Home',
    blocks: [
      { kind: 'heading', text: 'Welcome' },
      { kind: 'text', text: 'This is a simulated browser for local pages only.' },
      { kind: 'tiles' },
    ],
  },
  'win.local': {
    title: 'Welcome to Windows',
    blocks: [
      { kind: 'heading', text: 'Windows on your phone' },
      { kind: 'text', text: 'Open apps from the taskbar and drag windows just like on a Windows PC.' },
      { kind: 'text', text: 'To get started, open Documents and read Welcome.txt.' },
      { kind: 'link', text: 'Go Home', target: 'home://' },
    ],
  },
  'news.local': {
    title: 'News',
    blocks: [
      { kind: 'heading', text: 'Latest technology news' },
      { kind: 'text', text: '• Windows desktop simulation on mobile is growing.' },
      { kind: 'text', text: '• Cloud computing reached a new record.' },
      { kind: 'text', text: '• Built-in browsers replace the real internet.' },
      { kind: 'link', text: 'Back Home', target: 'home://' },
    ],
  },
  'mail.local': {
    title: 'Mail',
    blocks: [
      { kind: 'heading', text: 'Inbox' },
      { kind: 'text', text: '1) Your new project is ready — we will schedule a meeting soon.' },
      { kind: 'text', text: '2) The monthly report is ready for review.' },
      { kind: 'text', text: '3) Reminder: do not forget to back up your files.' },
      { kind: 'link', text: 'Back Home', target: 'home://' },
    ],
  },
  'about:blank': {
    title: 'Blank page',
    blocks: [{ kind: 'text', text: '' }],
  },
};

const TILES = [
  { label: 'Welcome', target: 'win.local', icon: 'logo-windows' as const, color: '#0a6cff' },
  { label: 'News', target: 'news.local', icon: 'newspaper-outline' as const, color: '#e0523c' },
  { label: 'Mail', target: 'mail.local', icon: 'mail-outline' as const, color: '#7f5af0' },
];

export function BrowserApp(_props: AppProps) {
  const { palette } = useShell();
  const [url, setUrl] = useState('home://');
  const [history, setHistory] = useState<string[]>(['home://']);
  const [index, setIndex] = useState(0);
  const [addressDraft, setAddressDraft] = useState('home://');

  const page = useMemo(() => PAGES[url] ?? PAGES['about:blank']!, [url]);

  const navigate = (target: string) => {
    const next = PAGES[target] ? target : 'about:blank';
    setUrl(next);
    setAddressDraft(next);
    setHistory((prev) => [...prev.slice(0, index + 1), next]);
    setIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (index <= 0) return;
    const next = index - 1;
    setIndex(next);
    setUrl(history[next] ?? 'home://');
    setAddressDraft(history[next] ?? 'home://');
  };

  const goForward = () => {
    if (index >= history.length - 1) return;
    const next = index + 1;
    setIndex(next);
    setUrl(history[next] ?? 'home://');
    setAddressDraft(history[next] ?? 'home://');
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.toolbar, { borderBottomColor: palette.border }]}>
        <Pressable onPress={goBack} style={styles.navButton}>
          <Ionicons name="arrow-back" size={16} color={palette.textMuted} />
        </Pressable>
        <Pressable onPress={goForward} style={styles.navButton}>
          <Ionicons name="arrow-forward" size={16} color={palette.textMuted} />
        </Pressable>
        <Pressable onPress={() => navigate(url)} style={styles.navButton}>
          <Ionicons name="refresh" size={15} color={palette.textMuted} />
        </Pressable>
        <View style={[styles.address, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Ionicons name="lock-closed-outline" size={11} color={palette.textMuted} />
          <Field
            value={addressDraft}
            onChangeText={setAddressDraft}
            palette={palette}
            style={styles.addressInput}
            onSubmitEditing={() => navigate(addressDraft)}
          />
        </View>
        <Pressable onPress={() => navigate('home://')} style={styles.navButton}>
          <Ionicons name="home-outline" size={15} color={palette.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={[styles.pageTitle, { color: palette.text }]}>{page.title}</Text>
        {page.blocks.map((block, i) => {
          if (block.kind === 'heading') {
            return (
              <Text key={i} style={[styles.heading, { color: palette.text }]}>
                {block.text}
              </Text>
            );
          }
          if (block.kind === 'text') {
            if (!block.text) return null;
            return (
              <Text key={i} style={[styles.paragraph, { color: palette.textMuted }]}>
                {block.text}
              </Text>
            );
          }
          if (block.kind === 'link') {
            return (
              <Pressable key={i} onPress={() => navigate(block.target)}>
                <Text style={[styles.link, { color: palette.accent }]}>{block.text} ←</Text>
              </Pressable>
            );
          }
          return (
            <View key={i} style={styles.tiles}>
              {TILES.map((tile) => (
                <Pressable
                  key={tile.target}
                  onPress={() => navigate(tile.target)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: tile.color, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name={tile.icon} size={22} color="#fff" />
                  <Text style={styles.tileLabel}>{tile.label}</Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addressInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 22,
    paddingVertical: 0,
    fontSize: typeScale.small + 1,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    gap: 8,
  },
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.heading,
    writingDirection: 'ltr',
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: typeScale.title,
    writingDirection: 'ltr',
  },
  paragraph: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    lineHeight: 21,
    writingDirection: 'ltr',
  },
  link: {
    fontFamily: fonts.medium,
    fontSize: typeScale.body,
    writingDirection: 'ltr',
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tileLabel: {
    fontFamily: fonts.medium,
    fontSize: typeScale.small + 1,
    color: '#fff',
    writingDirection: 'ltr',
  },
});

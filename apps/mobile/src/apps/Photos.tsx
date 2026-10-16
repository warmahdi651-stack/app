import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Circle } from 'react-native-svg';
import { useShell } from '../state/ShellProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

type Photo = { id: string; title: string; colors: [string, string]; accent: string };

const PHOTOS: Photo[] = [
  { id: 'p1', title: 'Mountains', colors: ['#1e3c72', '#7f7fd5'], accent: '#f2b544' },
  { id: 'p2', title: 'Sunset', colors: ['#d76d77', '#ffaf7b'], accent: '#3a1c71' },
  { id: 'p3', title: 'Forest', colors: ['#093028', '#5fbb8b'], accent: '#c9f7d3' },
  { id: 'p4', title: 'Night', colors: ['#0f2027', '#2c5364'], accent: '#8be9fd' },
  { id: 'p5', title: 'Poppy', colors: ['#2f0743', '#c471ed'], accent: '#ffd6f5' },
  { id: 'p6', title: 'Ocean', colors: ['#0b486b', '#f8b500'], accent: '#fdf6b2' },
  { id: 'p7', title: 'Dew', colors: ['#237a57', '#93f9b9'], accent: '#0b486b' },
  { id: 'p8', title: 'Brick', colors: ['#870000', '#190a05'], accent: '#f7b733' },
  { id: 'p9', title: 'Indigo', colors: ['#141e30', '#243b55'], accent: '#64ffda' },
];

function PhotoArt({ photo, size }: { photo: Photo; size: number }) {
  const id = `grad-${photo.id}-${size}`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={photo.colors[0]} />
          <Stop offset="1" stopColor={photo.colors[1]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
      <Circle cx={size * 0.72} cy={size * 0.28} r={size * 0.12} fill={photo.accent} opacity={0.85} />
      <Rect x="0" y={size * 0.66} width={size} height={size * 0.34} fill="#000" opacity={0.18} />
    </Svg>
  );
}

export function PhotosApp(_props: AppProps) {
  const { palette } = useShell();
  const [selected, setSelected] = useState<Photo | null>(null);

  if (selected) {
    return (
      <View style={[styles.root, { backgroundColor: palette.surface }]}>
        <Pressable onPress={() => setSelected(null)} style={styles.viewer}>
          <View style={styles.viewerImage}>
            <PhotoArt photo={selected} size={260} />
          </View>
          <Text style={[styles.viewerTitle, { color: palette.text }]}>{selected.title}</Text>
          <Text style={[styles.viewerHint, { color: palette.textMuted }]}>Tap the image to go back.</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <ScrollView contentContainerStyle={styles.grid}>
        {PHOTOS.map((photo) => (
          <Pressable
            key={photo.id}
            onPress={() => setSelected(photo)}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.thumb, { borderColor: palette.border }]}>
              <PhotoArt photo={photo} size={120} />
            </View>
            <Text numberOfLines={1} style={[styles.caption, { color: palette.text }]}>
              {photo.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  item: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'ltr',
  },
  viewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  viewerImage: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  viewerTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.title,
    writingDirection: 'ltr',
  },
  viewerHint: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'ltr',
  },
});

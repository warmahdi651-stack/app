import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

type Point = { x: number; y: number };
type Stroke = { color: string; width: number; points: Point[] };

const COLORS = [
  '#1b1b1b',
  '#e0523c',
  '#f2b544',
  '#2fb575',
  '#0a6cff',
  '#7f5af0',
  '#e05d8c',
  '#ffffff',
];

const SIZES = [2, 5, 10, 18];

export function PaintApp(_props: AppProps) {
  const { palette } = useShell();
  const vfs = useVfs();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[4]!);
  const [size, setSize] = useState(SIZES[1]!);
  const [erasing, setErasing] = useState(false);
  const [size_, setSizeBox] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState('');
  const current = useRef<Stroke | null>(null);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          current.current = {
            color: erasing ? palette.surface : color,
            width: size,
            points: [{ x: locationX, y: locationY }],
          };
          setStrokes((prev) => [...prev, current.current!]);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          if (!current.current) return;
          current.current.points.push({ x: locationX, y: locationY });
          const points = [...current.current.points];
          setStrokes((prev) => {
            if (prev.length === 0) return prev;
            const copy = [...prev];
            copy[copy.length - 1] = { ...current.current!, points };
            return copy;
          });
        },
        onPanResponderRelease: () => {
          current.current = null;
        },
      }),
    [color, erasing, palette.surface, size],
  );

  const save = async () => {
    const payload = JSON.stringify({ width: size_.width, height: size_.height, strokes });
    const name = `نقاشی-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.paint`;
    const home = vfs.root?.id ?? null;
    await vfs.createFile(home, name, payload);
    setStatus(`«${name}» ذخیره شد.`);
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.toolbar, { borderBottomColor: palette.border }]}>
        {COLORS.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setColor(item);
              setErasing(false);
            }}
            style={[
              styles.swatch,
              {
                backgroundColor: item,
                borderColor: color === item && !erasing ? palette.accent : palette.border,
                borderWidth: color === item && !erasing ? 2 : 1,
              },
            ]}
          />
        ))}
        <View style={styles.divider} />
        {SIZES.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setSize(item);
              setErasing(false);
            }}
            style={[
              styles.sizeButton,
              {
                borderColor: size === item && !erasing ? palette.accent : palette.border,
                backgroundColor: size === item && !erasing ? palette.accentSoft : 'transparent',
              },
            ]}
          >
            <View
              style={{
                width: Math.min(item, 14),
                height: Math.min(item, 14),
                borderRadius: 7,
                backgroundColor: palette.text,
              }}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.toolbarSecondary}>
        <Pressable
          onPress={() => setErasing((v) => !v)}
          style={[
            styles.action,
            {
              backgroundColor: erasing ? palette.accentSoft : 'transparent',
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons name="backspace-outline" size={13} color={erasing ? palette.accent : palette.textMuted} />
          <Text style={[styles.actionText, { color: erasing ? palette.accent : palette.textMuted }]}>پاک‌کن</Text>
        </Pressable>
        <Pressable
          onPress={() => setStrokes([])}
          style={[styles.action, { backgroundColor: 'transparent', borderColor: palette.border }]}
        >
          <Ionicons name="trash-outline" size={13} color={palette.textMuted} />
          <Text style={[styles.actionText, { color: palette.textMuted }]}>پاک کردن بوم</Text>
        </Pressable>
        <Pressable
          onPress={save}
          style={[styles.action, { backgroundColor: palette.accent, borderColor: palette.accent }]}
        >
          <Ionicons name="save-outline" size={13} color={palette.textOnAccent} />
          <Text style={[styles.actionText, { color: palette.textOnAccent }]}>ذخیره</Text>
        </Pressable>
      </View>

      <View
        {...responder.panHandlers}
        onLayout={(e) => setSizeBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        style={[styles.canvas, { backgroundColor: palette.inputBg, borderColor: palette.border }]}
      >
        <Svg width={size_.width} height={size_.height}>
          {strokes.map((stroke, index) => (
            <Path
              key={index}
              d={stroke.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ')}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>

      {status ? (
        <Text style={[styles.status, { color: palette.success }]}>{status}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarSecondary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginHorizontal: 2,
  },
  sizeButton: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
  },
  canvas: {
    flex: 1,
    margin: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  status: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    textAlign: 'center',
    paddingBottom: 6,
    writingDirection: 'rtl',
  },
});

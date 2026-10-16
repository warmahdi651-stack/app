import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, typeScale } from '../theme';
import type { WindowBounds, WindowInstance } from '../state/types';
import type { Palette } from '../theme';

type Props = {
  win: WindowInstance;
  active: boolean;
  palette: Palette;
  animations: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (bounds: WindowBounds) => void;
  children: React.ReactNode;
};

export function WindowFrame({
  win,
  active,
  palette,
  animations,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  children,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const startBounds = useRef<WindowBounds>(win.bounds);

  useEffect(() => {
    if (!animations) {
      progress.setValue(1);
      return;
    }
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 190 }).start();
  }, [animations, progress]);

  // مرجع به‌روز برای اینکه PanResponder در حین کشیدن دوباره ساخته نشود
  const latest = useRef({ bounds: win.bounds, onMove, onFocus, onResize });
  latest.current = { bounds: win.bounds, onMove, onFocus, onResize };

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        startBounds.current = { ...latest.current.bounds };
        latest.current.onFocus();
      },
      onPanResponderMove: (_evt, gesture) => {
        latest.current.onMove(startBounds.current.x + gesture.dx, startBounds.current.y + gesture.dy);
      },
    }),
  ).current;

  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startBounds.current = { ...latest.current.bounds };
        latest.current.onFocus();
      },
      onPanResponderMove: (_evt, gesture) => {
        const base = startBounds.current;
        latest.current.onResize({
          x: base.x,
          y: base.y,
          width: base.width + gesture.dx,
          height: base.height + gesture.dy,
        });
      },
    }),
  ).current;

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          left: win.bounds.x,
          top: win.bounds.y,
          width: win.bounds.width,
          height: win.bounds.height,
          zIndex: win.zIndex,
          opacity: progress,
          transform: [{ scale }],
        },
      ]}
    >
      <View
        style={[
          styles.frame,
          {
            backgroundColor: palette.window,
            borderColor: active ? palette.accent : palette.windowBorder,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <View
          {...dragResponder.panHandlers}
          style={[
            styles.titleBar,
            {
              backgroundColor: active ? palette.windowHeaderActive : palette.windowHeader,
              borderBottomColor: palette.border,
            },
          ]}
        >
          <View style={styles.captionButtons}>
            <CaptionButton icon="close" color={palette.danger} onPress={onClose} />
            <CaptionButton
              icon={win.maximized ? 'contract-outline' : 'expand-outline'}
              color={palette.textMuted}
              onPress={onToggleMaximize}
            />
            <CaptionButton icon="remove" color={palette.textMuted} onPress={onMinimize} />
          </View>

          <View style={styles.titleRow} pointerEvents="none">
            <Ionicons name="apps" size={13} color={palette.textMuted} />
            <Text
              numberOfLines={1}
              style={[styles.title, { color: active ? palette.text : palette.textMuted }]}
            >
              {win.title}
            </Text>
          </View>
        </View>

        <View style={styles.content}>{children}</View>

        {!win.maximized && (
          <View
            {...resizeResponder.panHandlers}
            style={[
              styles.resizeHandle,
              { borderBottomColor: palette.borderStrong, borderLeftColor: palette.borderStrong },
            ]}
          />
        )}
      </View>
    </Animated.View>
  );
}

function CaptionButton({
  icon,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.captionButton, pressed && styles.captionButtonPressed]}
    >
      <Ionicons name={icon} size={13} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  frame: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  titleBar: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  captionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  captionButton: {
    width: 22,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: typeScale.small + 1,
    writingDirection: 'ltr',
  },
  content: {
    flex: 1,
  },
  resizeHandle: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
});

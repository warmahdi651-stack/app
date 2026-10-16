import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatClock, formatClockWithSeconds } from '../lib/fa';
import { formatJalaliNumeric } from '../lib/jalali';
import { useShell } from '../state/ShellProvider';
import { useWindows } from '../state/WindowProvider';
import { fonts, radius, typeScale } from '../theme';
import { APPS } from '../registry';

export function Taskbar({
  startOpen,
  onToggleStart,
  onOpenApp,
}: {
  startOpen: boolean;
  onToggleStart: () => void;
  onOpenApp: (appId: string) => void;
}) {
  const { palette, settings } = useShell();
  const { windows, minimizeWindow, focusWindow, restoreAll } = useWindows();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const running = windows.filter((w) => !w.minimized);
  const pinnedIds = ['explorer', 'browser', 'notepad', 'terminal'];

  return (
    <View
      style={[
        styles.taskbar,
        {
          backgroundColor: palette.taskbar,
          borderTopColor: palette.taskbarBorder,
        },
      ]}
    >
      <Pressable
        onPress={onToggleStart}
        style={({ pressed }) => [
          styles.startButton,
          {
            backgroundColor: startOpen ? palette.accentSoft : pressed ? palette.surfaceHover : 'transparent',
          },
        ]}
      >
        <Ionicons name="logo-windows" size={19} color={startOpen ? palette.accent : palette.text} />
      </Pressable>

      <Pressable
        onPress={() => onOpenApp('explorer')}
        style={({ pressed }) => [styles.quickButton, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="search" size={16} color={palette.text} />
      </Pressable>

      <View style={styles.taskButtons}>
        {pinnedIds.map((id) => {
          const app = APPS.find((a) => a.id === id);
          if (!app) return null;
          const isRunning = windows.some((w) => w.appId === id);
          return (
            <Pressable
              key={id}
              onPress={() => onOpenApp(id)}
              style={({ pressed }) => [
                styles.taskButton,
                {
                  backgroundColor: isRunning ? palette.accentSoft : pressed ? palette.surfaceHover : 'transparent',
                },
              ]}
            >
              <Ionicons name={app.icon} size={17} color={isRunning ? palette.accent : palette.textMuted} />
              {isRunning ? <View style={[styles.indicator, { backgroundColor: palette.accent }]} /> : null}
            </Pressable>
          );
        })}

        {running
          .filter((w) => !pinnedIds.includes(w.appId))
          .map((w) => (
            <Pressable
              key={w.id}
              onPress={() => {
                if (w.minimized) restoreAll();
                focusWindow(w.id);
              }}
              onLongPress={() => minimizeWindow(w.id)}
              style={({ pressed }) => [
                styles.taskButton,
                { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
              ]}
            >
              <Ionicons name="apps" size={16} color={palette.accent} />
              <View style={[styles.indicator, { backgroundColor: palette.accent }]} />
            </Pressable>
          ))}
      </View>

      <View style={styles.tray}>
        <Ionicons name="wifi" size={13} color={palette.text} />
        <Ionicons name="battery-half" size={13} color={palette.text} />
        <View style={styles.clockBox}>
          <Text style={[styles.clock, { color: palette.text }]}>
            {settings.showSeconds
              ? formatClockWithSeconds(now, settings.use24Hour)
              : formatClock(now, settings.use24Hour)}
          </Text>
          <Text style={[styles.date, { color: palette.text }]}>{formatJalaliNumeric(now)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  startButton: {
    width: 36,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskButtons: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    overflow: 'hidden',
  },
  taskButton: {
    minWidth: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: 1,
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  tray: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  clockBox: {
    alignItems: 'center',
    minWidth: 58,
  },
  clock: {
    fontFamily: fonts.medium,
    fontSize: typeScale.small + 1,
    writingDirection: 'rtl',
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: typeScale.caption + 1,
    writingDirection: 'rtl',
  },
});

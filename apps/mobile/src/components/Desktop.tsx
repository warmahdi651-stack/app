import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getApp } from '../registry';
import { useShell } from '../state/ShellProvider';
import { useWindows } from '../state/WindowProvider';
import { useVfs } from '../state/VfsProvider';
import { formatClockTime } from '../lib/fa';
import { formatJalaliLong } from '../lib/jalali';
import { getWallpaper, fonts, radius, typeScale } from '../theme';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { StartMenu } from './StartMenu';
import { Taskbar } from './Taskbar';
import { WindowFrame } from './WindowFrame';

const DESKTOP_ICONS = [
  { id: 'explorer', label: 'این رایانه', icon: 'desktop-outline' as const },
  { id: 'recycle', label: 'سطل زباله', icon: 'trash-outline' as const },
  { id: 'photos', label: 'تصاویر', icon: 'images-outline' as const },
  { id: 'terminal', label: 'Terminal', icon: 'terminal-outline' as const },
];

export function Desktop() {
  const { palette, settings } = useShell();
  const vfs = useVfs();
  const {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    resizeWindow,
    setWindowTitle,
    setDesktopArea,
    restoreAll,
  } = useWindows();

  const [startOpen, setStartOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [now, setNow] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const wallpaper = useMemo(() => getWallpaper(settings.wallpaper), [settings.wallpaper]);

  const openApp = (appId: string, props: Record<string, unknown> = {}) => {
    const app = getApp(appId);
    if (!app) return;
    openWindow({
      appId,
      title: app.title,
      props,
      singleton: app.singleton,
      bounds: app.defaultSize,
    });
    setStartOpen(false);
  };

  const desktopMenu = (x: number, y: number) => {
    const items: ContextMenuItem[] = [
      {
        key: 'personalize',
        label: 'تغییر پس‌زمینه',
        icon: 'image-outline',
        onPress: () => openApp('settings'),
      },
      {
        key: 'allapps',
        label: 'همهٔ برنامه‌ها',
        icon: 'apps-outline',
        onPress: () => setStartOpen(true),
      },
      {
        key: 'restore',
        label: 'نمایش همهٔ پنجره‌ها',
        icon: 'desktop-outline',
        onPress: () => restoreAll(),
      },
      {
        key: 'refresh',
        label: 'تازه‌سازی',
        icon: 'refresh-outline',
        onPress: () => setMenu(null),
      },
    ];
    setMenu({ x: Math.max(4, Math.min(x, 190)), y: Math.max(4, Math.min(y, 240)), items });
  };

  const activeId = useMemo(() => {
    const sorted = [...windows].sort((a, b) => b.zIndex - a.zIndex);
    return sorted[0]?.id;
  }, [windows]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={wallpaper.colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={styles.area}
        onLayout={(event) =>
          setDesktopArea({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onTouchStart={() => setStartOpen(false)}
          onLongPress={(e) => desktopMenu(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        />

        <View style={styles.widget} pointerEvents="none">
          <Text style={[styles.widgetTime, { color: '#fff' }]}>
            {formatClockTime(now, settings.use24Hour)}
          </Text>
          <Text style={[styles.widgetDate, { color: 'rgba(255,255,255,0.85)' }]}>
            {formatJalaliLong(now)}
          </Text>
        </View>

        <View style={styles.iconColumn}>
          {DESKTOP_ICONS.map((icon) => (
            <Pressable
              key={icon.id}
              onPress={() => openApp(icon.id)}
              onLongPress={(e) => desktopMenu(e.nativeEvent.locationX, e.nativeEvent.locationY)}
              style={({ pressed }) => [styles.desktopIcon, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name={icon.icon} size={30} color="#fff" />
              <Text numberOfLines={1} style={styles.desktopIconLabel}>
                {icon.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {windows.map((win) => {
          const app = getApp(win.appId);
          if (!app) return null;
          const AppComponent = app.component;
          return (
            <WindowFrame
              key={win.id}
              win={win}
              active={win.id === activeId}
              palette={palette}
              animations={settings.animations}
              onFocus={() => {
                focusWindow(win.id);
                setStartOpen(false);
              }}
              onClose={() => closeWindow(win.id)}
              onMinimize={() => minimizeWindow(win.id)}
              onToggleMaximize={() => toggleMaximize(win.id)}
              onMove={(x, y) => moveWindow(win.id, x, y)}
              onResize={(bounds) => resizeWindow(win.id, bounds)}
            >
              <AppComponent
                windowId={win.id}
                props={win.props}
                key={`${win.id}-${win.appId}`}
              />
            </WindowFrame>
          );
        })}

        {startOpen ? (
          <StartMenu
            onOpenApp={(appId) => openApp(appId)}
            onClose={() => setStartOpen(false)}
            onOpenSettings={() => openApp('settings')}
          />
        ) : null}

        {menu ? <ContextMenu {...menu} palette={palette} onClose={() => setMenu(null)} /> : null}
      </View>

      <Taskbar
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((v) => !v)}
        onOpenApp={(appId) => openApp(appId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  area: {
    flex: 1,
  },
  widget: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  widgetTime: {
    fontFamily: fonts.bold,
    fontSize: typeScale.heading,
    writingDirection: 'rtl',
  },
  widgetDate: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'rtl',
  },
  iconColumn: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 74,
    gap: 10,
  },
  desktopIcon: {
    alignItems: 'center',
    gap: 3,
    padding: 4,
    borderRadius: radius.md,
  },
  desktopIconLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.caption + 1,
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

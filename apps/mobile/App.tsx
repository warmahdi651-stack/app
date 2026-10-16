import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
} from '@expo-google-fonts/vazirmatn';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Desktop } from './src/components/Desktop';
import { AuthProvider } from './src/state/AuthProvider';
import { ShellProvider, useShell } from './src/state/ShellProvider';
import { VfsProvider } from './src/state/VfsProvider';
import { WindowProvider } from './src/state/WindowProvider';
import { initDesktopState } from './src/state/desktopSync';

export default function App() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
  });
  const [stateReady, setStateReady] = useState(false);
  const [fontFallback, setFontFallback] = useState(false);

  useEffect(() => {
    // اگر فونت‌ها به هر دلیلی بارگذاری نشوند، اپ نباید بی‌نهایت روی اسپینر بماند
    const timer = setTimeout(() => setFontFallback(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // وضعیت دسکتاپ (چیدمان پنجره‌ها و تنظیمات) پیش از ساخت providerها بارگذاری می‌شود
      await initDesktopState(null);
      if (!cancelled) setStateReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if ((!fontsLoaded && !fontFallback) || !stateReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0a6cff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ShellProvider>
          <VfsProvider>
            <WindowProvider>
              <Shell />
            </WindowProvider>
          </VfsProvider>
        </ShellProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { palette } = useShell();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.desktop }]} edges={['top', 'bottom']}>
      <StatusBar style={palette.name === 'dark' ? 'light' : 'dark'} />
      <Desktop />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
});

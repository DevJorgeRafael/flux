import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';
import { UIProvider, useThemeMode } from '@/components/ui/theme';
import { initDatabase } from '@/infrastructure/database/db';
import { TranslationProvider } from '@/core/i18n/useTranslation';

function RootNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <TranslationProvider>
      <UIProvider insets={insets}>
        <RootWithTheme />
      </UIProvider>
    </TranslationProvider>
  );
}

function RootWithTheme() {
  const { isDark } = useThemeMode();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Failed to initialize database', e);
      } finally {
        setIsDbReady(true);
      }
    }
    prepare();
  }, []);

  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}

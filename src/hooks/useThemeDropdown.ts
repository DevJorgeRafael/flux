import { useState, useCallback } from 'react';
import { useThemeMode } from '@/components/ui/theme';

export function useThemeDropdown() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDark, toggleTheme } = useThemeMode();

  const isDevMode = process.env.EXPO_PUBLIC_ENV !== 'prod';

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((prev) => !prev);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  return {
    isSettingsOpen,
    isDevMode,
    isDark,
    toggleTheme,
    toggleSettings,
    closeSettings,
  };
}

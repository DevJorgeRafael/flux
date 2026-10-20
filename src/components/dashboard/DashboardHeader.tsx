import React from 'react';
import { StyleSheet, View, TouchableOpacity, Pressable } from 'react-native';
import { Sun, Moon, Settings, RotateCcw, Sparkles } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useColors } from '@/components/ui/theme';

interface DashboardHeaderProps {
  isSettingsOpen: boolean;
  isDevMode: boolean;
  isDark: boolean;
  toggleSettings: () => void;
  closeSettings: () => void;
  toggleTheme: () => void;
  handleSeedDemoData: () => void;
  handleResetAllData: () => void;
}

export function DashboardHeader({
  isSettingsOpen,
  isDevMode,
  isDark,
  toggleSettings,
  closeSettings,
  toggleTheme,
  handleSeedDemoData,
  handleResetAllData,
}: DashboardHeaderProps) {
  const colors = useColors();

  return (
    <>
      {/* Backdrop transparente para cerrar el menú desplegable al tocar fuera */}
      {isSettingsOpen && (
        <Pressable
          style={[styles.backdropPressable, { zIndex: 90 }]}
          onPress={closeSettings}
        />
      )}

      {/* Top Header con menú de Configuración / Engranaje */}
      <View style={[styles.topHeader, { zIndex: 100 }]}>
        <View style={styles.topHeaderSpacer} />
        <View style={styles.topHeaderActions}>
          {/* Botón Principal de Engranaje */}
          <TouchableOpacity
            style={[
              styles.gearMainBtn,
              {
                backgroundColor: isSettingsOpen ? colors.primarySoft : colors.surface,
                borderColor: isSettingsOpen ? colors.primary : colors.border,
              },
            ]}
            onPress={toggleSettings}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Settings
              size={20}
              color={isSettingsOpen ? colors.primaryText : colors.text}
              strokeWidth={2}
            />
          </TouchableOpacity>

          {/* Menú Desplegable Vertical hacia abajo (Dropdown) */}
          <MotiView
            animate={{
              scaleY: isSettingsOpen ? 1 : 0,
              opacity: isSettingsOpen ? 1 : 0,
              translateY: isSettingsOpen ? 0 : -20,
            }}
            transition={{
              type: 'timing',
              duration: 200,
            }}
            style={[
              styles.settingsDropdownVertical,
              {
                transformOrigin: 'top',
              },
            ]}
            pointerEvents={isSettingsOpen ? 'auto' : 'none'}
          >
            {/* Opción Modo Oscuro / Claro */}
            <TouchableOpacity
              style={[
                styles.gearOptionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                toggleTheme();
                closeSettings();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {isDark ? (
                <Sun size={18} color={colors.text} strokeWidth={2} />
              ) : (
                <Moon size={18} color={colors.text} strokeWidth={2} />
              )}
            </TouchableOpacity>

            {/* Opción Cargar Demo (Dev Only) */}
            {isDevMode && (
              <TouchableOpacity
                style={[
                  styles.gearOptionBtn,
                  { backgroundColor: colors.primarySoft, borderColor: colors.border },
                ]}
                onPress={() => {
                  handleSeedDemoData();
                  closeSettings();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Sparkles size={18} color={colors.primaryText} strokeWidth={2.2} />
              </TouchableOpacity>
            )}

            {/* Opción Reiniciar / Limpiar (Dev Only) */}
            {isDevMode && (
              <TouchableOpacity
                style={[
                  styles.gearOptionBtn,
                  { backgroundColor: colors.errorSoft, borderColor: colors.border },
                ]}
                onPress={() => {
                  closeSettings();
                  handleResetAllData();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <RotateCcw size={18} color={colors.errorText} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </MotiView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
    zIndex: 100,
  },
  topHeaderSpacer: {
    flex: 1,
  },
  topHeaderActions: {
    position: 'relative',
    alignItems: 'center',
    zIndex: 100,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  settingsDropdownVertical: {
    position: 'absolute',
    top: 48,
    right: 0,
    zIndex: 110,
    alignItems: 'center',
    gap: 8,
  },
  gearOptionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  gearMainBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

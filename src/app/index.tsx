import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useColors, useInsets } from '@/components/ui/theme';
import { TransactionType } from '@/core/models/transaction';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAccountFilters } from '@/hooks/useAccountFilters';
import { useThemeDropdown } from '@/hooks/useThemeDropdown';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { AccountCarousel } from '@/components/dashboard/AccountCarousel';
import { RecentTransactionsList } from '@/components/dashboard/RecentTransactionsList';
import { CreateAccountModal } from '@/components/dashboard/CreateAccountModal';
import { CreateTransactionModal } from '@/components/dashboard/CreateTransactionModal';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useInsets();

  // Custom Hooks
  const {
    accounts,
    categories,
    monthlyTotals,
    totalBalance,
    isLoading,
    isRefreshing,
    loadData,
    handleRefresh,
    handleSeedDemoData,
    handleResetAllData,
  } = useDashboardStats();

  const {
    selectedFilterAccountId,
    transactions,
    selectedAccountName,
    handleSelectAccountFilter,
    reloadTransactions,
  } = useAccountFilters(accounts);

  const {
    isSettingsOpen,
    isDevMode,
    isDark,
    toggleTheme,
    toggleSettings,
    closeSettings,
  } = useThemeDropdown();

  // Modal UI States
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('EXPENSE');

  const handleOpenTransactionModal = (type: TransactionType) => {
    setTxType(type);
    setIsTxModalVisible(true);
  };

  const handleDataChanged = () => {
    loadData();
    reloadTransactions();
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header con menú de Configuración / Engranaje */}
      <DashboardHeader
        isSettingsOpen={isSettingsOpen}
        isDevMode={isDevMode}
        isDark={isDark}
        toggleSettings={toggleSettings}
        closeSettings={closeSettings}
        toggleTheme={toggleTheme}
        handleSeedDemoData={handleSeedDemoData}
        handleResetAllData={handleResetAllData}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Balance Consolidado y Métricas */}
        <DashboardHero totalBalance={totalBalance} monthlyTotals={monthlyTotals} />

        {/* Acciones Rápidas (+ Ingreso / - Gasto con Moti feedback) */}
        <QuickActionsGrid onOpenTransactionModal={handleOpenTransactionModal} />

        {/* Carrusel de Cuentas */}
        <AccountCarousel
          accounts={accounts}
          totalBalance={totalBalance}
          selectedFilterAccountId={selectedFilterAccountId}
          onSelectAccountFilter={handleSelectAccountFilter}
          onOpenCreateAccountModal={() => setIsAccountModalVisible(true)}
        />

        {/* Últimos Movimientos con Stagger */}
        <RecentTransactionsList
          transactions={transactions}
          selectedFilterAccountId={selectedFilterAccountId}
          selectedAccountName={selectedAccountName}
          defaultAccountId={accounts[0]?.id}
        />
      </ScrollView>

      {/* Modal Registrar Movimiento */}
      <CreateTransactionModal
        visible={isTxModalVisible}
        initialType={txType}
        accounts={accounts}
        categories={categories}
        onClose={() => setIsTxModalVisible(false)}
        onTransactionCreated={handleDataChanged}
      />

      {/* Modal Crear Cuenta */}
      <CreateAccountModal
        visible={isAccountModalVisible}
        onClose={() => setIsAccountModalVisible(false)}
        onAccountCreated={handleDataChanged}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});

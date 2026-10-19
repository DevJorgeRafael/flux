import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import {
  Sun,
  Moon,
  Zap,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Calendar,
  X,
  CreditCard,
  ChevronRight,
  Layers,
  Settings,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { useColors, useThemeMode, useInsets } from '@/components/ui/theme';
import {
  SqliteAccountRepository,
  SqliteTransactionRepository,
  SqliteCategoryRepository,
} from '@/infrastructure/repositories';
import { Account, AccountType } from '@/core/models/account';
import { Transaction, TransactionType } from '@/core/models/transaction';
import { Category } from '@/core/models/category';
import { MonthlyTotals } from '@/core/repositories/ITransactionRepository';
import { DEFAULT_CATEGORIES } from '@/infrastructure/database/schema.sql';
import { getDatabase, resetDatabase } from '@/infrastructure/database/db';

const accountRepo = new SqliteAccountRepository();
const transactionRepo = new SqliteTransactionRepository();
const categoryRepo = new SqliteCategoryRepository();

export default function HomeScreen() {
  const colors = useColors();
  const { isDark, toggleTheme } = useThemeMode();
  const insets = useInsets();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals>({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
  });

  // Filtro interactivo de cuentas
  const [selectedFilterAccountId, setSelectedFilterAccountId] = useState<string | null>(null);

  // Menú de opciones de configuración (engranaje)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isDevMode =
    process.env.EXPO_PUBLIC_ENV !== 'production' &&
    process.env.EXPO_PUBLIC_ENV !== 'prod' &&
    process.env.NODE_ENV !== 'production';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Modal para registrar transacción
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para crear nueva cuenta
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('CHECKING');
  const [accBalance, setAccBalance] = useState('');
  const [accTNA, setAccTNA] = useState('');
  const [accTermMonths, setAccTermMonths] = useState('3');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const fetchAllData = useCallback(async (filterAccId?: string | null) => {
    const accFilter = filterAccId !== undefined ? filterAccId : selectedFilterAccountId;
    const [accs, txs, cats] = await Promise.all([
      accountRepo.getAll(),
      transactionRepo.getAll({
        accountId: accFilter || undefined,
        limit: 10,
      }),
      categoryRepo.getAll(),
    ]);

    const currentYearMonth = new Date().toISOString().substring(0, 7);
    const totals = await transactionRepo.getMonthlyTotals(currentYearMonth);

    setAccounts(accs);
    setTransactions(txs);
    setCategories(cats);
    setMonthlyTotals(totals);

    if (accs.length > 0) {
      setSelectedAccountId((prev) => prev || accs[0].id);
    }
    if (cats.length > 0) {
      setSelectedCategoryId((prev) => prev || cats[0].id);
    }
  }, [selectedFilterAccountId]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const [accs, txs, cats] = await Promise.all([
          accountRepo.getAll(),
          transactionRepo.getAll({ limit: 10 }),
          categoryRepo.getAll(),
        ]);
        const currentYearMonth = new Date().toISOString().substring(0, 7);
        const totals = await transactionRepo.getMonthlyTotals(currentYearMonth);

        if (active) {
          setAccounts(accs);
          setTransactions(txs);
          setCategories(cats);
          setMonthlyTotals(totals);
          if (accs.length > 0) setSelectedAccountId(accs[0].id);
          if (cats.length > 0) setSelectedCategoryId(cats[0].id);
        }
      } catch (err) {
        console.error('Error inicializando datos:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectAccountFilter = async (accId: string | null) => {
    setSelectedFilterAccountId(accId);
    try {
      const txs = await transactionRepo.getAll({
        accountId: accId || undefined,
        limit: 10,
      });
      setTransactions(txs);
    } catch (e) {
      console.error('Error filtrando movimientos:', e);
    }
  };

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const formatCurrency = (val: number, hide = false) => {
    if (hide && !isBalanceVisible) return '••••••';
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const handleSeedDemoData = async () => {
    try {
      setIsLoading(true);

      const db = await getDatabase();
      const existingCats = await db.getAllAsync<{ id: string }>('SELECT id FROM categories');
      if (existingCats.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          await db.runAsync(
            `INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.is_default]
          );
        }
      }

      // 1. Cuenta Principal / Corriente
      const checking = await accountRepo.create({
        name: 'Cuenta Principal',
        type: 'CHECKING',
        initialBalance: 2450.0,
      });

      // 2. Fondo Flexible con Rendimiento Diario
      await accountRepo.create({
        name: 'Fondo Rendimiento',
        type: 'FLEXIBLE_SAVINGS',
        initialBalance: 8120.5,
        annualRate: 0.085, // 8.5% TNA
      });

      // 3. Plazo Fijo
      await accountRepo.create({
        name: 'Plazo Fijo Trimestral',
        type: 'FIXED_TERM',
        initialBalance: 0,
        initialFixedTermDeposit: {
          principalAmount: 5000.0,
          annualRate: 0.11, // 11% TNA
          termMonths: 3,
        },
      });

      // Transacción de Salario
      const now = new Date();
      const todayISO = now.toISOString();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      await transactionRepo.createWithSplits({
        type: 'INCOME',
        totalAmount: 3200.0,
        description: 'Nómina mensual',
        date: todayISO,
        splits: [
          {
            accountId: checking.id,
            categoryId: 'cat_inc_salary',
            amount: 3200.0,
            notes: 'Sueldo base',
          },
        ],
      });

      // Gasto de Alquiler
      await transactionRepo.createWithSplits({
        type: 'EXPENSE',
        totalAmount: 650.0,
        description: 'Alquiler departamento',
        date: yesterday,
        splits: [
          {
            accountId: checking.id,
            categoryId: 'cat_exp_housing',
            amount: 650.0,
            notes: 'Pago mensual',
          },
        ],
      });

      // Gasto de Supermercado
      await transactionRepo.createWithSplits({
        type: 'EXPENSE',
        totalAmount: 145.8,
        description: 'Supermercado semanal',
        date: todayISO,
        splits: [
          {
            accountId: checking.id,
            categoryId: 'cat_exp_food',
            amount: 145.8,
            notes: 'Compras de la semana',
          },
        ],
      });

      await fetchAllData(null);
      setIsSettingsOpen(false);
    } catch (e) {
      console.error('Error seeding demo data:', e);
      Alert.alert('Error', 'No se pudieron generar los datos de prueba.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAllData = () => {
    Alert.alert(
      '¿Limpiar y reiniciar todo?',
      'Se borrarán permanentemente todas las cuentas, plazos fijos y transacciones registradas, volviendo al estado inicial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await resetDatabase();
              setSelectedFilterAccountId(null);
              await fetchAllData(null);
              setIsSettingsOpen(false);
              Alert.alert('Éxito', 'La base de datos fue reiniciada correctamente.');
            } catch (err) {
              console.error('Error al reiniciar base de datos:', err);
              Alert.alert('Error', 'No se pudo reiniciar la base de datos.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateTransaction = async () => {
    const amountNum = parseFloat(txAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero.');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Cuenta requerida', 'Por favor selecciona una cuenta.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Categoría requerida', 'Por favor selecciona una categoría.');
      return;
    }

    try {
      setIsSubmitting(true);
      await transactionRepo.createWithSplits({
        type: txType,
        totalAmount: amountNum,
        description: txDesc.trim() || (txType === 'INCOME' ? 'Ingreso registrado' : 'Gasto registrado'),
        date: new Date().toISOString(),
        splits: [
          {
            accountId: selectedAccountId,
            categoryId: selectedCategoryId,
            amount: amountNum,
          },
        ],
      });

      setTxAmount('');
      setTxDesc('');
      setIsTxModalVisible(false);
      await fetchAllData(selectedFilterAccountId);
    } catch (err) {
      console.error('Error al registrar transacción:', err);
      Alert.alert('Error', 'No se pudo guardar la transacción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    const trimmedName = accName.trim();
    if (!trimmedName) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para la cuenta.');
      return;
    }

    const initialBalanceNum = parseFloat(accBalance.replace(',', '.')) || 0;
    const tnaNum = accTNA ? parseFloat(accTNA.replace(',', '.')) / 100 : undefined;
    const termMonthsNum = parseInt(accTermMonths, 10) || 3;

    try {
      setIsCreatingAccount(true);

      if (accType === 'FIXED_TERM') {
        const principal = initialBalanceNum > 0 ? initialBalanceNum : 1000;
        await accountRepo.create({
          name: trimmedName,
          type: 'FIXED_TERM',
          initialBalance: 0,
          currency: 'USD',
          initialFixedTermDeposit: {
            principalAmount: principal,
            annualRate: tnaNum || 0.1,
            termMonths: termMonthsNum,
          },
        });
      } else if (accType === 'FLEXIBLE_SAVINGS') {
        await accountRepo.create({
          name: trimmedName,
          type: 'FLEXIBLE_SAVINGS',
          initialBalance: initialBalanceNum,
          currency: 'USD',
          annualRate: tnaNum,
        });
      } else {
        await accountRepo.create({
          name: trimmedName,
          type: 'CHECKING',
          initialBalance: initialBalanceNum,
          currency: 'USD',
        });
      }

      setAccName('');
      setAccBalance('');
      setAccTNA('');
      setAccTermMonths('3');
      setIsAccountModalVisible(false);
      await fetchAllData(null);
    } catch (err) {
      console.error('Error al crear cuenta:', err);
      Alert.alert('Error', 'No se pudo crear la cuenta.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'CHECKING':
        return 'Cuenta Corriente';
      case 'FLEXIBLE_SAVINGS':
        return 'Fondo Flexible';
      case 'FIXED_TERM':
        return 'Plazo Fijo';
      default:
        return 'Cuenta';
    }
  };

  const selectedAccountName = accounts.find((a) => a.id === selectedFilterAccountId)?.name;

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
      <View style={styles.topHeader}>
        <View style={styles.topHeaderSpacer} />
        <View style={styles.topHeaderActions}>
          {isSettingsOpen && (
            <View style={styles.expandedSettingsRow}>
              {/* Opción Reiniciar / Limpiar (Dev Only) */}
              {isDevMode && (
                <TouchableOpacity
                  style={[
                    styles.gearOptionBtn,
                    { backgroundColor: colors.errorSoft, borderColor: colors.border },
                  ]}
                  onPress={handleResetAllData}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <RotateCcw size={18} color={colors.errorText} strokeWidth={2.2} />
                </TouchableOpacity>
              )}

              {/* Opción Cargar Demo (Dev Only) */}
              {isDevMode && (
                <TouchableOpacity
                  style={[
                    styles.gearOptionBtn,
                    { backgroundColor: colors.primarySoft, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    handleSeedDemoData();
                    setIsSettingsOpen(false);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Sparkles size={18} color={colors.primaryText} strokeWidth={2.2} />
                </TouchableOpacity>
              )}

              {/* Opción Modo Oscuro / Claro */}
              <TouchableOpacity
                style={[
                  styles.gearOptionBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={toggleTheme}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isDark ? (
                  <Sun size={18} color={colors.text} strokeWidth={2} />
                ) : (
                  <Moon size={18} color={colors.text} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Botón Principal de Engranaje */}
          <TouchableOpacity
            style={[
              styles.gearMainBtn,
              {
                backgroundColor: isSettingsOpen ? colors.primarySoft : colors.surface,
                borderColor: isSettingsOpen ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setIsSettingsOpen(!isSettingsOpen)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Settings
              size={20}
              color={isSettingsOpen ? colors.primaryText : colors.text}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* HERO SECTION: Balance Consolidado al aire libre */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.heroContainer}
        >
          <View style={styles.heroLabelRow}>
            <Text style={[styles.heroLabel, { color: colors.textLight }]}>BALANCE CONSOLIDADO</Text>
            <TouchableOpacity
              onPress={() => setIsBalanceVisible(!isBalanceVisible)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {isBalanceVisible ? (
                <Eye size={18} color={colors.textLight} strokeWidth={2} />
              ) : (
                <EyeOff size={18} color={colors.textLight} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Importe Heroico Centrado Masivo */}
          <Text
            style={[styles.heroAmount, { color: colors.text }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatCurrency(totalBalance, true)}
          </Text>

          {/* Métricas flotantes sutiles con aire */}
          <View style={styles.pillsRow}>
            <View style={[styles.metricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricPillDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.metricPillLabel, { color: colors.textLight }]}>Ingresos</Text>
              <Text style={[styles.metricPillValue, { color: colors.successText }]}>
                {formatCurrency(monthlyTotals.totalIncome, true)}
              </Text>
            </View>

            <View style={[styles.metricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricPillDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.metricPillLabel, { color: colors.textLight }]}>Gastos</Text>
              <Text style={[styles.metricPillValue, { color: colors.errorText }]}>
                {formatCurrency(monthlyTotals.totalExpense, true)}
              </Text>
            </View>

            <View style={[styles.metricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.metricPillDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.metricPillLabel, { color: colors.textLight }]}>Neto</Text>
              <Text style={[styles.metricPillValue, { color: colors.primaryText }]}>
                {formatCurrency(monthlyTotals.netSavings, true)}
              </Text>
            </View>
          </View>
        </MotiView>

        {/* SymmetricGrid: Botones de Acción Primarios con feedback táctil (MotiPressable) */}
        <View style={styles.actionGrid}>
          {/* Botón Ingreso */}
          <MotiPressable
            containerStyle={{ flex: 1 }}
            style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
            animate={({ pressed }) => {
              'worklet';
              return {
                scale: pressed ? 0.96 : 1,
              };
            }}
            transition={{
              type: 'timing',
              duration: 100,
            }}
            onPress={() => {
              setTxType('INCOME');
              setIsTxModalVisible(true);
            }}
          >
            <View style={styles.actionIconCircle}>
              <Plus size={20} color={colors.onSuccess} strokeWidth={2.5} />
            </View>
            <Text style={[styles.primaryActionText, { color: colors.onSuccess }]}>Ingreso</Text>
          </MotiPressable>

          {/* Botón Gasto */}
          <MotiPressable
            containerStyle={{ flex: 1 }}
            style={[styles.primaryActionBtn, { backgroundColor: colors.error }]}
            animate={({ pressed }) => {
              'worklet';
              return {
                scale: pressed ? 0.96 : 1,
              };
            }}
            transition={{
              type: 'timing',
              duration: 100,
            }}
            onPress={() => {
              setTxType('EXPENSE');
              setIsTxModalVisible(true);
            }}
          >
            <View style={styles.actionIconCircle}>
              <Minus size={20} color={colors.onError} strokeWidth={2.5} />
            </View>
            <Text style={[styles.primaryActionText, { color: colors.onError }]}>Gasto</Text>
          </MotiPressable>
        </View>


        {/* Sección Cuentas */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Mis Cuentas</Text>
            <View style={[styles.counterBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.counterBadgeText, { color: colors.textLight }]}>{accounts.length}</Text>
            </View>
          </View>

          {/* Botón Nueva Cuenta en Cabecera */}
          <TouchableOpacity
            style={[styles.addAccountHeaderBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setIsAccountModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={15} color={colors.primaryText} strokeWidth={2.5} />
            <Text style={[styles.addAccountHeaderText, { color: colors.primaryText }]}>Nueva Cuenta</Text>
          </TouchableOpacity>
        </View>

        {accounts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ marginBottom: 12 }}>
              <CreditCard size={36} color={colors.textLight} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyHeading, { color: colors.text }]}>Sin cuentas registradas</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              Crea tu primera cuenta corriente, fondo flexible o plazo fijo para comenzar a gestionar tus finanzas.
            </Text>
            <TouchableOpacity
              style={[styles.createAccountPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsAccountModalVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={18} color={colors.onPrimary} strokeWidth={2.5} />
              <Text style={[styles.createAccountPrimaryBtnText, { color: colors.onPrimary }]}>
                Crear mi primera cuenta
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardsTrack}
          >
            {/* Chip/Tarjeta "Todas" */}
            <TouchableOpacity
              style={[
                styles.modernAccountCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedFilterAccountId === null ? colors.primary : colors.border,
                  borderWidth: selectedFilterAccountId === null ? 2 : 1,
                },
              ]}
              onPress={() => handleSelectAccountFilter(null)}
              activeOpacity={0.8}
            >
              <View style={styles.accountCardHeader}>
                <Text style={[styles.accountTypeHeader, { color: colors.textLight }]}>VISTA GLOBAL</Text>
                <View
                  style={[
                    styles.tnaBadge,
                    {
                      backgroundColor:
                        selectedFilterAccountId === null ? colors.primarySoft : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tnaBadgeText,
                      {
                        color:
                          selectedFilterAccountId === null ? colors.primaryText : colors.textLight,
                      },
                    ]}
                  >
                    {selectedFilterAccountId === null ? 'Activo' : 'Todas'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Layers size={16} color={colors.text} />
                <Text style={[styles.accountCardTitle, { color: colors.text, marginBottom: 0 }]} numberOfLines={1}>
                  Todas las Cuentas
                </Text>
              </View>

              <Text style={[styles.accountCardBalance, { color: colors.text }]}>
                {formatCurrency(totalBalance, true)}
              </Text>

              <View
                style={[
                  styles.filterNoticeBadge,
                  {
                    backgroundColor:
                      selectedFilterAccountId === null ? colors.primarySoft : colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterNoticeText,
                    {
                      color:
                        selectedFilterAccountId === null ? colors.primaryText : colors.textLight,
                    },
                  ]}
                >
                  {selectedFilterAccountId === null ? 'Mostrando todo' : 'Toca para ver todo'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Tarjetas individuales de Cuentas */}
            {accounts.map((acc) => {
              const isFlexible = acc.type === 'FLEXIBLE_SAVINGS';
              const isFixed = acc.type === 'FIXED_TERM';
              const isSelected = selectedFilterAccountId === acc.id;

              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.modernAccountCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelectAccountFilter(acc.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.accountCardHeader}>
                    <Text style={[styles.accountTypeHeader, { color: colors.textLight }]}>
                      {getAccountTypeLabel(acc.type)}
                    </Text>

                    {isSelected ? (
                      <View style={[styles.tnaBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.tnaBadgeText, { color: colors.primaryText }]}>Filtrando</Text>
                      </View>
                    ) : isFlexible && acc.annualRate ? (
                      <View style={[styles.tnaBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.tnaBadgeText, { color: colors.primaryText }]}>
                          {(acc.annualRate * 100).toFixed(1)}% TNA
                        </Text>
                      </View>
                    ) : isFixed ? (
                      <View style={[styles.fixedBadge, { backgroundColor: colors.warningSoft }]}>
                        <Text style={[styles.fixedBadgeText, { color: colors.warningText }]}>Plazo Fijo</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.accountCardTitle, { color: colors.text }]} numberOfLines={1}>
                    {acc.name}
                  </Text>

                  <Text style={[styles.accountCardBalance, { color: colors.text }]}>
                    {formatCurrency(acc.balance, true)}
                  </Text>

                  {/* Indicador de Rendimiento */}
                  {isFlexible && (
                    <View style={[styles.yieldHighlightBadge, { backgroundColor: colors.successSoft, borderColor: colors.successText }]}>
                      <Zap size={13} color={colors.successText} strokeWidth={2.5} />
                      <Text style={[styles.yieldHighlightText, { color: colors.successText }]}>
                        Rendimiento diario activo
                      </Text>
                    </View>
                  )}

                  {isFixed && acc.fixedTermDeposits && acc.fixedTermDeposits.length > 0 && (
                    <View style={[styles.fixedDateBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Calendar size={12} color={colors.textLight} strokeWidth={2} />
                      <Text style={[styles.fixedDateText, { color: colors.textLight }]}>
                        Vence: {acc.fixedTermDeposits[0].maturityDate}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Tarjeta para Añadir Otra Cuenta */}
            <TouchableOpacity
              style={[
                styles.addAccountDashedCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setIsAccountModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.addAccountIconCircle, { backgroundColor: colors.primarySoft }]}>
                <Plus size={20} color={colors.primaryText} strokeWidth={2.5} />
              </View>
              <Text style={[styles.addAccountDashedTitle, { color: colors.text }]}>Nueva Cuenta</Text>
              <Text style={[styles.addAccountDashedSubtext, { color: colors.textLight }]}>
                Añadir otra
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Sección Últimos Movimientos con botón 'Ver más →' */}
        <View style={[styles.sectionHeaderRow, { marginTop: 32 }]}>
          <View>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Últimos Movimientos</Text>
            {selectedAccountName && (
              <Text style={[styles.sectionSubfilter, { color: colors.primaryText }]}>
                Filtrado por: {selectedAccountName}
              </Text>
            )}
          </View>

          {/* Botón Ver más en lugar del número */}
          <TouchableOpacity
            style={[styles.seeMoreBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              const targetId = selectedFilterAccountId || accounts[0]?.id;
              if (targetId) {
                router.push({
                  pathname: '/account/[id]',
                  params: { id: targetId },
                });
              } else {
                Alert.alert('Sin cuentas', 'Crea una cuenta para ver su historial detallado.');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.seeMoreText, { color: colors.text }]}>Ver más</Text>
            <ChevronRight size={14} color={colors.textLight} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              {selectedFilterAccountId
                ? 'Esta cuenta no tiene movimientos registrados.'
                : 'No hay movimientos registrados en este período.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.transactionsCardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {transactions.map((tx, idx) => {
              const isIncome = tx.type === 'INCOME';
              const isLast = idx === transactions.length - 1;
              const dateFormatted = new Date(tx.date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <MotiView
                  key={tx.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 350, delay: idx * 50 }}
                >
                  <TouchableOpacity
                    style={[
                      styles.transactionItemRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                    onPress={() => {
                      router.push({
                        pathname: '/transaction/[id]',
                        params: { id: tx.id },
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.transactionIconContainer,
                        { backgroundColor: isIncome ? colors.successSoft : colors.errorSoft },
                      ]}
                    >
                      {isIncome ? (
                        <Plus size={16} color={colors.successText} strokeWidth={2.5} />
                      ) : (
                        <Minus size={16} color={colors.errorText} strokeWidth={2.5} />
                      )}
                    </View>

                    <View style={styles.transactionDetails}>
                      <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={1}>
                        {tx.description || (isIncome ? 'Ingreso' : 'Gasto')}
                      </Text>
                      <Text style={[styles.transactionMeta, { color: colors.textLight }]}>
                        {tx.splits?.[0]?.accountName ?? 'Cuenta'} • {dateFormatted}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.transactionValue,
                        { color: isIncome ? colors.successText : colors.text },
                      ]}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.totalAmount, true)}
                    </Text>
                  </TouchableOpacity>
                </MotiView>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal para Registrar Movimiento Rápido */}
      <Modal
        visible={isTxModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsTxModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalTopBar}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>
                {txType === 'INCOME' ? 'Registrar Ingreso' : 'Registrar Gasto'}
              </Text>
              <TouchableOpacity onPress={() => setIsTxModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={22} color={colors.textLight} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Segmented Control de Tipo */}
            <View style={[styles.typeSegmentedControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.typeSegmentOption,
                  txType === 'EXPENSE' && { backgroundColor: colors.error, borderRadius: 10 },
                ]}
                onPress={() => setTxType('EXPENSE')}
              >
                <Text
                  style={[
                    styles.typeSegmentText,
                    { color: txType === 'EXPENSE' ? colors.onError : colors.textLight },
                  ]}
                >
                  Gasto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeSegmentOption,
                  txType === 'INCOME' && { backgroundColor: colors.success, borderRadius: 10 },
                ]}
                onPress={() => setTxType('INCOME')}
              >
                <Text
                  style={[
                    styles.typeSegmentText,
                    { color: txType === 'INCOME' ? colors.onSuccess : colors.textLight },
                  ]}
                >
                  Ingreso
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input de Monto */}
            <Text style={[styles.formLabel, { color: colors.textLight }]}>Monto ($ USD)</Text>
            <TextInput
              style={[
                styles.largeAmountInput,
                {
                  color: colors.text,
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
              value={txAmount}
              onChangeText={setTxAmount}
              autoFocus
            />

            {/* Input de Descripción */}
            <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 14 }]}>Descripción</Text>
            <TextInput
              style={[
                styles.standardInput,
                {
                  color: colors.text,
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ej. Supermercado, Factura de luz..."
              placeholderTextColor={colors.textLight}
              value={txDesc}
              onChangeText={setTxDesc}
            />

            {/* Selector de Categoría */}
            {categories.length > 0 && (
              <>
                <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 14 }]}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {categories
                    .filter((c) => (txType === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'))
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.selectionChip,
                          {
                            backgroundColor:
                              selectedCategoryId === cat.id ? colors.primary : colors.inputBackground,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text
                          style={[
                            styles.selectionChipText,
                            {
                              color: selectedCategoryId === cat.id ? colors.onPrimary : colors.text,
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </>
            )}

            {/* Selector de Cuenta */}
            {accounts.length > 0 && (
              <>
                <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 10 }]}>Cuenta Destino</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.selectionChip,
                        {
                          backgroundColor:
                            selectedAccountId === acc.id ? colors.primary : colors.inputBackground,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <Text
                        style={[
                          styles.selectionChipText,
                          {
                            color: selectedAccountId === acc.id ? colors.onPrimary : colors.text,
                          },
                        ]}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Botón Guardar */}
            <TouchableOpacity
              style={[
                styles.submitTransactionButton,
                {
                  backgroundColor: txType === 'INCOME' ? colors.success : colors.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleCreateTransaction}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitTransactionButtonText}>Guardar Movimiento</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Crear Cuenta */}
      <Modal
        visible={isAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAccountModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20, maxHeight: '88%' }]}>
            <View style={styles.modalTopBar}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Nueva Cuenta</Text>
              <TouchableOpacity onPress={() => setIsAccountModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={22} color={colors.textLight} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Selector de Tipo de Cuenta */}
              <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 4 }]}>Tipo de Cuenta</Text>
              <View style={styles.accountTypeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.accountTypeCardOption,
                    {
                      backgroundColor: accType === 'CHECKING' ? colors.primarySoft : colors.background,
                      borderColor: accType === 'CHECKING' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAccType('CHECKING')}
                  activeOpacity={0.7}
                >
                  <CreditCard size={18} color={accType === 'CHECKING' ? colors.primaryText : colors.textLight} />
                  <Text style={[styles.accountTypeOptionTitle, { color: accType === 'CHECKING' ? colors.primaryText : colors.text }]}>
                    Corriente
                  </Text>
                  <Text style={[styles.accountTypeOptionDesc, { color: colors.textLight }]}>Operaciones</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.accountTypeCardOption,
                    {
                      backgroundColor: accType === 'FLEXIBLE_SAVINGS' ? colors.primarySoft : colors.background,
                      borderColor: accType === 'FLEXIBLE_SAVINGS' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAccType('FLEXIBLE_SAVINGS')}
                  activeOpacity={0.7}
                >
                  <TrendingUp size={18} color={accType === 'FLEXIBLE_SAVINGS' ? colors.primaryText : colors.textLight} />
                  <Text style={[styles.accountTypeOptionTitle, { color: accType === 'FLEXIBLE_SAVINGS' ? colors.primaryText : colors.text }]}>
                    Flexible
                  </Text>
                  <Text style={[styles.accountTypeOptionDesc, { color: colors.textLight }]}>Rendimiento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.accountTypeCardOption,
                    {
                      backgroundColor: accType === 'FIXED_TERM' ? colors.warningSoft : colors.background,
                      borderColor: accType === 'FIXED_TERM' ? colors.warning : colors.border,
                    },
                  ]}
                  onPress={() => setAccType('FIXED_TERM')}
                  activeOpacity={0.7}
                >
                  <Calendar size={18} color={accType === 'FIXED_TERM' ? colors.warningText : colors.textLight} />
                  <Text style={[styles.accountTypeOptionTitle, { color: accType === 'FIXED_TERM' ? colors.warningText : colors.text }]}>
                    Plazo Fijo
                  </Text>
                  <Text style={[styles.accountTypeOptionDesc, { color: colors.textLight }]}>A término</Text>
                </TouchableOpacity>
              </View>

              {/* Nombre de la Cuenta */}
              <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 14 }]}>Nombre de la cuenta</Text>
              <TextInput
                style={[
                  styles.formTextInput,
                  { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Ej. Billetera Digital, Banco Galicia, Ahorros"
                placeholderTextColor={colors.textLight}
                value={accName}
                onChangeText={setAccName}
              />

              {/* Saldo Inicial / Capital */}
              <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 14 }]}>
                {accType === 'FIXED_TERM' ? 'Capital a Invertir ($)' : 'Saldo Inicial ($)'}
              </Text>
              <TextInput
                style={[
                  styles.formTextInput,
                  { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                value={accBalance}
                onChangeText={setAccBalance}
              />

              {/* Tasa Nominal Anual si es Flexible o Plazo Fijo */}
              {(accType === 'FLEXIBLE_SAVINGS' || accType === 'FIXED_TERM') && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 14 }]}>
                    Tasa Nominal Anual (TNA %)
                  </Text>
                  <TextInput
                    style={[
                      styles.formTextInput,
                      { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder={accType === 'FLEXIBLE_SAVINGS' ? 'Ej. 35.0 (tasa anual estimada)' : 'Ej. 42.0'}
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={accTNA}
                    onChangeText={setAccTNA}
                  />
                </>
              )}

              {/* Plazo en Meses si es Plazo Fijo */}
              {accType === 'FIXED_TERM' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textLight, marginTop: 14 }]}>Plazo de vencimiento</Text>
                  <View style={styles.termMonthsRow}>
                    {['1', '3', '6', '12'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.termMonthPill,
                          {
                            backgroundColor: accTermMonths === m ? colors.primary : colors.inputBackground,
                            borderColor: accTermMonths === m ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setAccTermMonths(m)}
                      >
                        <Text
                          style={[
                            styles.termMonthPillText,
                            { color: accTermMonths === m ? colors.onPrimary : colors.text },
                          ]}
                        >
                          {m} {m === '1' ? 'mes' : 'meses'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Botón Crear Cuenta */}
              <TouchableOpacity
                style={[
                  styles.submitTransactionButton,
                  { backgroundColor: colors.primary, marginTop: 24, opacity: isCreatingAccount ? 0.7 : 1 },
                ]}
                onPress={handleCreateAccount}
                disabled={isCreatingAccount}
              >
                {isCreatingAccount ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.submitTransactionButtonText, { color: colors.onPrimary }]}>
                    Crear Cuenta
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
  },
  topHeaderSpacer: {
    flex: 1,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedSettingsRow: {
    flexDirection: 'row',
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  // HERO SECTION
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 26,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: -1.5,
    textAlign: 'center',
    marginVertical: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricPillLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricPillValue: {
    fontSize: 12,
    fontWeight: '800',
  },

  // SymmetricGrid
  actionGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
  },
  primaryActionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  actionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Sección Titulares
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubfilter: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Cuentas Modernas
  horizontalCardsTrack: {
    paddingRight: 8,
    gap: 14,
  },
  modernAccountCard: {
    width: 220,
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  accountTypeHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tnaBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tnaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fixedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fixedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  accountCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  accountCardBalance: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  yieldHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  yieldHighlightText: {
    fontSize: 11,
    fontWeight: '800',
  },
  fixedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  fixedDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterNoticeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  filterNoticeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Contenedor de Últimos Movimientos
  transactionsCardContainer: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  transactionMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Estados Vacíos
  emptyContainer: {
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  seedActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  seedActionButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeading: {
    fontSize: 20,
    fontWeight: '800',
  },
  typeSegmentedControl: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  typeSegmentOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeSegmentText: {
    fontWeight: '800',
    fontSize: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  largeAmountInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '800',
  },
  standardInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  selectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    marginRight: 8,
  },
  selectionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitTransactionButton: {
    marginTop: 22,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTransactionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  // Estilos Creación de Cuenta
  addAccountHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  addAccountHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  createAccountPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    marginTop: 8,
  },
  createAccountPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  addAccountDashedCard: {
    width: 140,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 6,
  },
  addAccountIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addAccountDashedTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  addAccountDashedSubtext: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  accountTypeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  accountTypeCardOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  accountTypeOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  accountTypeOptionDesc: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  formTextInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  termMonthsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  termMonthPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termMonthPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
});


import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Zap,
  Calendar,
  Plus,
  Minus,
  TrendingUp,
  Receipt,
  Clock,
} from 'lucide-react-native';
import { useColors, useInsets } from '@/components/ui/theme';
import {
  SqliteAccountRepository,
  SqliteTransactionRepository,
} from '@/infrastructure/repositories';
import { Account, AccountType } from '@/core/models/account';
import { Transaction } from '@/core/models/transaction';

const accountRepo = new SqliteAccountRepository();
const transactionRepo = new SqliteTransactionRepository();

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE';

export default function AccountDetailScreen() {
  const rawParams = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
  const colors = useColors();
  const insets = useInsets();

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [isLoading, setIsLoading] = useState(() => Boolean(id));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAccountData = useCallback(async () => {
    if (!id) return;
    try {
      const acc = await accountRepo.getById(id);
      let txs: Transaction[] = [];
      if (acc) {
        txs = await transactionRepo.getAll({ accountId: id });
      }
      setAccount(acc);
      setTransactions(txs);
    } catch (e) {
      console.error('Error cargando detalle de cuenta:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    let isCancelled = false;
    if (!id) return;

    accountRepo
      .getById(id)
      .then(async (acc) => {
        let txs: Transaction[] = [];
        if (acc) {
          txs = await transactionRepo.getAll({ accountId: id });
        }
        if (!isCancelled) {
          setAccount(acc);
          setTransactions(txs);
        }
      })
      .catch((e) => {
        console.error('Error cargando detalle de cuenta:', e);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAccountData();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: account?.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'CHECKING':
        return 'Cuenta Corriente';
      case 'FLEXIBLE_SAVINGS':
        return 'Fondo Remunerado Flexible';
      case 'FIXED_TERM':
        return 'Depósito a Plazo Fijo';
      default:
        return 'Cuenta';
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  });

  const totalIn = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const totalOut = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Cuenta no encontrada</Text>
        <TouchableOpacity
          style={[styles.backButtonPrompt, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonPromptText, { color: colors.text }]}>Volver al Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFlexible = account.type === 'FLEXIBLE_SAVINGS';
  const isFixed = account.type === 'FIXED_TERM';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={[styles.roundIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {account.name}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* HERO SECTION DE LA CUENTA */}
        <View style={styles.heroSection}>
          <View style={styles.typeBadgeRow}>
            <Text style={[styles.accountTypeSubtitle, { color: colors.textLight }]}>
              {getAccountTypeLabel(account.type)}
            </Text>

            {isFlexible && account.annualRate && (
              <View style={[styles.rateBadge, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.rateBadgeText, { color: colors.primaryText }]}>
                  {(account.annualRate * 100).toFixed(1)}% TNA
                </Text>
              </View>
            )}

            {isFixed && (
              <View style={[styles.rateBadge, { backgroundColor: colors.warningSoft }]}>
                <Text style={[styles.rateBadgeText, { color: colors.warningText }]}>Inversión a Plazo</Text>
              </View>
            )}
          </View>

          {/* Saldo Masivo */}
          <Text style={[styles.heroBalanceText, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>
            {formatCurrency(account.balance)}
          </Text>

          {/* Tarjeta de Resumen Rápido de Flujos */}
          <View style={[styles.flowsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.flowItem}>
              <View style={[styles.flowIconDot, { backgroundColor: colors.successSoft }]}>
                <Plus size={12} color={colors.successText} strokeWidth={3} />
              </View>
              <View>
                <Text style={[styles.flowLabel, { color: colors.textLight }]}>Total Ingresado</Text>
                <Text style={[styles.flowValue, { color: colors.successText }]}>
                  {formatCurrency(totalIn)}
                </Text>
              </View>
            </View>

            <View style={[styles.flowDivider, { backgroundColor: colors.border }]} />

            <View style={styles.flowItem}>
              <View style={[styles.flowIconDot, { backgroundColor: colors.errorSoft }]}>
                <Minus size={12} color={colors.errorText} strokeWidth={3} />
              </View>
              <View>
                <Text style={[styles.flowLabel, { color: colors.textLight }]}>Total Gastado</Text>
                <Text style={[styles.flowValue, { color: colors.errorText }]}>
                  {formatCurrency(totalOut)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sección Rendimientos para Fondos Flexibles */}
        {isFlexible && account.annualRate && (
          <View style={[styles.yieldContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={styles.yieldHeader}>
              <View style={[styles.yieldIconBox, { backgroundColor: colors.successSoft }]}>
                <Zap size={18} color={colors.successText} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.yieldTitle, { color: colors.text }]}>Rendimiento Activo Diario</Text>
                <Text style={[styles.yieldSubtitle, { color: colors.textLight }]}>
                  Generando intereses compuestos en base al saldo
                </Text>
              </View>
            </View>

            <View style={[styles.yieldStatsRow, { borderTopColor: colors.border }]}>
              <View style={styles.yieldStatCol}>
                <Text style={[styles.yieldStatLabel, { color: colors.textLight }]}>TNA Anual</Text>
                <Text style={[styles.yieldStatNumber, { color: colors.text }]}>
                  {(account.annualRate * 100).toFixed(2)}%
                </Text>
              </View>

              <View style={styles.yieldStatCol}>
                <Text style={[styles.yieldStatLabel, { color: colors.textLight }]}>Rendimiento Diario Est.</Text>
                <Text style={[styles.yieldStatNumber, { color: colors.successText }]}>
                  +{formatCurrency((account.balance * account.annualRate) / 365)}
                </Text>
              </View>

              <View style={styles.yieldStatCol}>
                <Text style={[styles.yieldStatLabel, { color: colors.textLight }]}>Mensual Est.</Text>
                <Text style={[styles.yieldStatNumber, { color: colors.primaryText }]}>
                  +{formatCurrency((account.balance * account.annualRate) / 12)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sección Plazos Fijos Activos */}
        {isFixed && account.fixedTermDeposits && account.fixedTermDeposits.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
              Certificados de Plazo Fijo
            </Text>

            {account.fixedTermDeposits.map((dep) => (
              <View
                key={dep.id}
                style={[styles.depositCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.depositTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={16} color={colors.warningText} />
                    <Text style={[styles.depositCapital, { color: colors.text }]}>
                      {formatCurrency(dep.principalAmount)}
                    </Text>
                  </View>
                  <View style={[styles.depositBadge, { backgroundColor: colors.warningSoft }]}>
                    <Text style={[styles.depositBadgeText, { color: colors.warningText }]}>
                      {(dep.annualRate * 100).toFixed(1)}% TNA
                    </Text>
                  </View>
                </View>

                <View style={styles.depositDatesRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color={colors.textLight} />
                    <Text style={[styles.depositDateText, { color: colors.textLight }]}>
                      Inicio: {dep.startDate}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color={colors.primaryText} />
                    <Text style={[styles.depositDateText, { color: colors.primaryText, fontWeight: '700' }]}>
                      Vence: {dep.maturityDate}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* HISTORIAL COMPLETO DE MOVIMIENTOS */}
        <View style={styles.historySectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Historial de Movimientos</Text>
          <Text style={[styles.historyCountText, { color: colors.textLight }]}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'movimiento' : 'movimientos'}
          </Text>
        </View>

        {/* Filtros tipo píldora: Todos / Ingresos / Gastos */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPillBtn,
              {
                backgroundColor: filterType === 'ALL' ? colors.primary : colors.surface,
                borderColor: filterType === 'ALL' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilterType('ALL')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filterType === 'ALL' ? colors.onPrimary : colors.textLight },
              ]}
            >
              Todos ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPillBtn,
              {
                backgroundColor: filterType === 'INCOME' ? colors.success : colors.surface,
                borderColor: filterType === 'INCOME' ? colors.success : colors.border,
              },
            ]}
            onPress={() => setFilterType('INCOME')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filterType === 'INCOME' ? colors.onSuccess : colors.textLight },
              ]}
            >
              Ingresos ({transactions.filter((t) => t.type === 'INCOME').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPillBtn,
              {
                backgroundColor: filterType === 'EXPENSE' ? colors.error : colors.surface,
                borderColor: filterType === 'EXPENSE' ? colors.error : colors.border,
              },
            ]}
            onPress={() => setFilterType('EXPENSE')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filterType === 'EXPENSE' ? colors.onError : colors.textLight },
              ]}
            >
              Gastos ({transactions.filter((t) => t.type === 'EXPENSE').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Movimientos */}
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ marginBottom: 12 }}>
              <Receipt size={32} color={colors.textLight} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyHeading, { color: colors.text }]}>No hay movimientos registrados</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              {filterType === 'ALL'
                ? 'Esta cuenta aún no tiene transacciones registradas.'
                : 'No se encontraron movimientos con el filtro seleccionado.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.transactionsCardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {filteredTransactions.map((tx, idx) => {
              const isIncome = tx.type === 'INCOME';
              const isLast = idx === filteredTransactions.length - 1;
              const dateFormatted = new Date(tx.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <TouchableOpacity
                  key={tx.id}
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
                      {tx.splits?.[0]?.categoryName ?? 'General'} • {dateFormatted}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionValue,
                      { color: isIncome ? colors.successText : colors.text },
                    ]}
                  >
                    {isIncome ? '+' : '-'}{formatCurrency(tx.totalAmount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 14,
  },
  roundIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    maxWidth: '70%',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  backButtonPrompt: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  backButtonPromptText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // HERO SECTION
  heroSection: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 22,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  accountTypeSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroBalanceText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.2,
    textAlign: 'center',
    marginVertical: 4,
  },
  flowsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: '100%',
    marginTop: 18,
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flowIconDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  flowValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  flowDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 12,
  },

  // RENDIMIENTOS (FLEXIBLE)
  yieldContainer: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 24,
  },
  yieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  yieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yieldTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  yieldSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  yieldStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  yieldStatCol: {
    flex: 1,
  },
  yieldStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  yieldStatNumber: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },

  // PLAZOS FIJOS
  depositCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  depositTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  depositCapital: {
    fontSize: 17,
    fontWeight: '800',
  },
  depositBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  depositBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  depositDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositDateText: {
    fontSize: 12,
  },

  // HISTORIAL
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  historyCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  transactionsCardContainer: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
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
  emptyContainer: {
    padding: 32,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});

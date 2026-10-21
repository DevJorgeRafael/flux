import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useColors } from '@/components/ui/theme';
import { MonthlyTotals } from '@/core/repositories/ITransactionRepository';
import { formatCurrency } from '@/core/utils/currency';
import { useTranslation } from '@/core/i18n/useTranslation';

interface DashboardHeroProps {
  totalBalance: number;
  monthlyTotals: MonthlyTotals;
}

export function DashboardHero({ totalBalance, monthlyTotals }: DashboardHeroProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      style={styles.heroContainer}
    >
      <View style={styles.heroLabelRow}>
        <Text style={[styles.heroLabel, { color: colors.textLight }]}>
          {t('consolidatedBalance').toUpperCase()}
        </Text>
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
        {formatCurrency(totalBalance, false, isBalanceVisible)}
      </Text>

      {/* Métricas flotantes sutiles con aire */}
      <View style={styles.pillsRow}>
        <View style={[styles.metricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricPillDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.metricPillLabel, { color: colors.textLight }]}>{t('income')}</Text>
          <Text style={[styles.metricPillValue, { color: colors.successText }]}>
            {formatCurrency(monthlyTotals.totalIncome, true, isBalanceVisible)}
          </Text>
        </View>

        <View style={[styles.metricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricPillDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.metricPillLabel, { color: colors.textLight }]}>{t('expense')}</Text>
          <Text style={[styles.metricPillValue, { color: colors.errorText }]}>
            {formatCurrency(monthlyTotals.totalExpense, true, isBalanceVisible)}
          </Text>
        </View>

        <View style={[styles.metricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricPillDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.metricPillLabel, { color: colors.textLight }]}>{t('net')}</Text>
          <Text style={[styles.metricPillValue, { color: colors.primaryText }]}>
            {formatCurrency(monthlyTotals.netSavings, true, isBalanceVisible)}
          </Text>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
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
});

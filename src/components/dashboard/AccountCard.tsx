import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Zap, Calendar } from 'lucide-react-native';
import { Account, AccountType } from '@/core/models/account';
import { useColors } from '@/components/ui/theme';
import { formatCurrency } from '@/core/utils/currency';

interface AccountCardProps {
  account: Account;
  isSelected: boolean;
  onPress: () => void;
}

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

export function AccountCard({ account, isSelected, onPress }: AccountCardProps) {
  const colors = useColors();
  const isFlexible = account.type === 'FLEXIBLE_SAVINGS';
  const isFixed = account.type === 'FIXED_TERM';

  return (
    <TouchableOpacity
      style={[
        styles.modernAccountCard,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.accountCardHeader}>
        <Text style={[styles.accountTypeHeader, { color: colors.textLight }]}>
          {getAccountTypeLabel(account.type)}
        </Text>

        {isSelected ? (
          <View style={[styles.tnaBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.tnaBadgeText, { color: colors.primaryText }]}>Filtrando</Text>
          </View>
        ) : isFlexible && account.annualRate ? (
          <View style={[styles.tnaBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.tnaBadgeText, { color: colors.primaryText }]}>
              {(account.annualRate * 100).toFixed(1)}% TNA
            </Text>
          </View>
        ) : isFixed ? (
          <View style={[styles.fixedBadge, { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.fixedBadgeText, { color: colors.warningText }]}>Plazo Fijo</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.accountCardTitle, { color: colors.text }]} numberOfLines={1}>
        {account.name}
      </Text>

      <Text style={[styles.accountCardBalance, { color: colors.text }]}>
        {formatCurrency(account.balance, false)}
      </Text>

      {isFlexible && (
        <View
          style={[
            styles.yieldHighlightBadge,
            { backgroundColor: colors.successSoft, borderColor: colors.successText },
          ]}
        >
          <Zap size={13} color={colors.successText} strokeWidth={2.5} />
          <Text style={[styles.yieldHighlightText, { color: colors.successText }]}>
            Rendimiento diario activo
          </Text>
        </View>
      )}

      {isFixed && account.fixedTermDeposits && account.fixedTermDeposits.length > 0 && (
        <View
          style={[
            styles.fixedDateBadge,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Calendar size={12} color={colors.textLight} strokeWidth={2} />
          <Text style={[styles.fixedDateText, { color: colors.textLight }]}>
            Vence: {account.fixedTermDeposits[0].maturityDate}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});

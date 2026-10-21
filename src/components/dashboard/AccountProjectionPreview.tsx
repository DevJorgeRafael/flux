import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccountType } from '@/core/models/account';
import { formatCurrency } from '@/core/utils/currency';
import { useColors } from '@/components/ui/theme';

interface AccountProjectionPreviewProps {
  accountType: AccountType;
  rate: number;
  finalAmount: number;
}

export function AccountProjectionPreview({
  accountType,
  rate,
  finalAmount,
}: AccountProjectionPreviewProps) {
  const colors = useColors();
  const isFixed = accountType === 'FIXED_TERM';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isFixed ? colors.warningSoft : colors.successSoft,
          borderColor: isFixed ? colors.warning : colors.successText,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Vista previa del rendimiento</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textLight }]}>Tasa aplicada</Text>
        <Text style={[styles.value, { color: colors.text }]}>{rate.toFixed(2)}% TNA</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textLight }]}>Monto estimado al final</Text>
        <Text style={[styles.value, { color: colors.primaryText }]}>{formatCurrency(finalAmount)}</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textLight }]}>
        {isFixed
          ? 'Interés simple según el plazo seleccionado.'
          : 'Interés compuesto diario estimado durante un año.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
});

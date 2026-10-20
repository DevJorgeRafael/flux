import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { TransactionType } from '@/core/models/transaction';
import { Account } from '@/core/models/account';
import { Category } from '@/core/models/category';
import { useColors, useInsets } from '@/components/ui/theme';
import { SqliteTransactionRepository } from '@/infrastructure/repositories';

interface CreateTransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onTransactionCreated: () => void;
}

const transactionRepo = new SqliteTransactionRepository();

export function CreateTransactionModal({
  visible,
  initialType = 'EXPENSE',
  accounts,
  categories,
  onClose,
  onTransactionCreated,
}: CreateTransactionModalProps) {
  const colors = useColors();
  const insets = useInsets();

  const [txType, setTxType] = useState<TransactionType>(initialType);
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTxType(initialType);
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }

  const resetForm = () => {
    setTxAmount('');
    setTxDesc('');
    setSelectedAccountId(accounts[0]?.id || '');
    setSelectedCategoryId('');
  };

  const handleCreate = async () => {
    const amountVal = parseFloat(txAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    const accountId = selectedAccountId || accounts[0]?.id;
    if (!accountId) {
      Alert.alert('Sin cuentas', 'Debes crear una cuenta antes de registrar un movimiento.');
      return;
    }

    const catId =
      selectedCategoryId ||
      categories.find((c) => c.type === txType)?.id ||
      categories[0]?.id ||
      'cat-default';

    try {
      setIsSubmitting(true);
      await transactionRepo.createWithSplits({
        type: txType,
        date: new Date().toISOString(),
        totalAmount: amountVal,
        description: txDesc.trim() || undefined,
        splits: [
          {
            accountId: accountId,
            categoryId: catId,
            amount: amountVal,
          },
        ],
      });

      resetForm();
      onClose();
      onTransactionCreated();
    } catch (err: unknown) {
      console.error('Error creating transaction:', err);
      Alert.alert('Error', 'No se pudo guardar la transacción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalTopBar}>
            <Text style={[styles.modalHeading, { color: colors.text }]}>
              {txType === 'INCOME' ? 'Registrar Ingreso' : 'Registrar Gasto'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
            onPress={handleCreate}
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
  );
}

const styles = StyleSheet.create({
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
});

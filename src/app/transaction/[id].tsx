import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Trash,
  Tag,
  CreditCard,
  Calendar,
  Clock,
  CircleCheck,
  FileText,
  Receipt,
  Plus,
  Minus,
} from 'lucide-react-native';
import { useColors, useInsets } from '@/components/ui/theme';
import { SqliteTransactionRepository } from '@/infrastructure/repositories';
import { Transaction } from '@/core/models/transaction';

const transactionRepo = new SqliteTransactionRepository();

export default function TransactionDetailScreen() {
  const rawParams = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
  const colors = useColors();
  const insets = useInsets();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(id));
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    if (!id) return;

    transactionRepo
      .getById(id)
      .then((tx) => {
        if (!isCancelled) {
          setTransaction(tx);
        }
      })
      .catch((e) => {
        console.error('Error cargando transacción:', e);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleDelete = () => {
    if (!id || !transaction) return;

    Alert.alert(
      '¿Eliminar movimiento?',
      'Esta acción revertirá automáticamente el saldo de la cuenta asociada y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await transactionRepo.delete(id);
              router.back();
            } catch (err) {
              console.error('Error eliminando transacción:', err);
              Alert.alert('Error', 'No se pudo eliminar el movimiento.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const formatted = d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      // Capitalizar primer caracter del día
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string, createdAtStr?: string) => {
    try {
      let d = new Date(dateStr);
      if (isNaN(d.getTime()) || (d.getHours() === 0 && d.getMinutes() === 0 && createdAtStr)) {
        d = new Date(createdAtStr!);
      }
      if (isNaN(d.getTime())) return '--:--';
      return (
        d.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }) + ' hs'
      );
    } catch {
      return '--:--';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Movimiento no encontrado</Text>
        <TouchableOpacity
          style={[styles.backButtonPrompt, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonPromptText, { color: colors.text }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isIncome = transaction.type === 'INCOME';
  const primarySplit = transaction.splits?.[0];
  const categoryName = primarySplit?.categoryName || 'Sin categoría';
  const categoryColor = primarySplit?.categoryColor || (isIncome ? colors.success : colors.error);
  const accountName = primarySplit?.accountName || 'Cuenta';
  const notes = primarySplit?.notes;

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

        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalle de Movimiento</Text>

        <TouchableOpacity
          style={[styles.roundIconButton, { backgroundColor: colors.errorSoft, borderColor: colors.border }]}
          onPress={handleDelete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.errorText} />
          ) : (
            <Trash size={18} color={colors.errorText} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD TICKET */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Badge de tipo de movimiento */}
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isIncome ? colors.successSoft : colors.errorSoft },
            ]}
          >
            {isIncome ? (
              <Plus size={14} color={colors.successText} strokeWidth={3} />
            ) : (
              <Minus size={14} color={colors.errorText} strokeWidth={3} />
            )}
            <Text
              style={[
                styles.typeBadgeText,
                { color: isIncome ? colors.successText : colors.errorText },
              ]}
            >
              {isIncome ? 'Ingreso registrado' : 'Gasto registrado'}
            </Text>
          </View>

          {/* Importe Principal */}
          <Text
            style={[
              styles.heroAmountText,
              { color: isIncome ? colors.successText : colors.text },
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {isIncome ? '+' : '-'}{formatCurrency(transaction.totalAmount)}
          </Text>

          {/* Concepto / Descripción */}
          <Text style={[styles.heroDescription, { color: colors.text }]}>
            {transaction.description || (isIncome ? 'Ingreso General' : 'Gasto General')}
          </Text>

          {/* Status Chip */}
          <View style={[styles.statusChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <CircleCheck size={14} color={colors.successText} strokeWidth={2.5} />
            <Text style={[styles.statusChipText, { color: colors.textLight }]}>Confirmado en cuenta</Text>
          </View>
        </View>

        {/* GRUPO 1: DATOS CLAVE */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Detalles de la Operación</Text>

        <View style={[styles.detailsGroupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Fila Categoría */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: `${categoryColor}22` }]}>
              <Tag size={18} color={categoryColor} strokeWidth={2.5} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>Categoría</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{categoryName}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Fila Cuenta */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: colors.primarySoft }]}>
              <CreditCard size={18} color={colors.primaryText} strokeWidth={2.5} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>Cuenta asociada</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{accountName}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Fila Fecha */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: colors.background }]}>
              <Calendar size={18} color={colors.text} strokeWidth={2.2} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>Fecha</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatFullDate(transaction.date)}
              </Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Fila Hora */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: colors.background }]}>
              <Clock size={18} color={colors.text} strokeWidth={2.2} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>Hora registrada</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatTime(transaction.date, transaction.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* GRUPO 2: NOTAS Y REFERENCIA */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 24 }]}>Información Adicional</Text>

        <View style={[styles.detailsGroupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Notas */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: colors.background }]}>
              <FileText size={18} color={colors.textLight} strokeWidth={2.2} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>Notas / Observaciones</Text>
              <Text style={[styles.detailValue, { color: notes ? colors.text : colors.textLight }]}>
                {notes || 'Sin observaciones'}
              </Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* ID de Referencia */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: colors.background }]}>
              <Receipt size={18} color={colors.textLight} strokeWidth={2.2} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textLight }]}>Identificador interno</Text>
              <Text style={[styles.idValueText, { color: colors.textLight }]} numberOfLines={1}>
                {transaction.id}
              </Text>
            </View>
          </View>
        </View>

        {/* DESGLOSE SI TIENE MÚLTIPLES SPLITS */}
        {transaction.splits && transaction.splits.length > 1 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              Desglose de la Transacción ({transaction.splits.length})
            </Text>

            <View style={[styles.detailsGroupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {transaction.splits.map((split, sIdx) => {
                const isLastSplit = sIdx === transaction.splits.length - 1;
                return (
                  <View key={split.id || sIdx}>
                    <View style={styles.splitRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.splitCategory, { color: colors.text }]}>
                          {split.categoryName || 'General'}
                        </Text>
                        <Text style={[styles.splitAccount, { color: colors.textLight }]}>
                          {split.accountName || 'Cuenta'}
                        </Text>
                        {split.notes && (
                          <Text style={[styles.splitNotes, { color: colors.textLight }]}>
                            {split.notes}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.splitAmount, { color: isIncome ? colors.successText : colors.text }]}>
                        {isIncome ? '+' : '-'}{formatCurrency(split.amount)}
                      </Text>
                    </View>
                    {!isLastSplit && (
                      <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Botón Eliminar Destacado */}
        <TouchableOpacity
          style={[styles.deleteActionButton, { backgroundColor: colors.errorSoft, borderColor: colors.error }]}
          onPress={handleDelete}
          activeOpacity={0.8}
          disabled={isDeleting}
        >
          <Trash size={18} color={colors.errorText} strokeWidth={2.5} />
          <Text style={[styles.deleteActionButtonText, { color: colors.errorText }]}>
            {isDeleting ? 'Eliminando...' : 'Eliminar este movimiento'}
          </Text>
        </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  backButtonPromptText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // HERO CARD
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  heroAmountText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 14,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // GRUPOS DE INFORMACIÓN
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  detailsGroupCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  idValueText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  rowDivider: {
    height: 1,
    marginLeft: 68,
  },

  // SPLITS
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  splitCategory: {
    fontSize: 14,
    fontWeight: '700',
  },
  splitAccount: {
    fontSize: 12,
    marginTop: 2,
  },
  splitNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // BOTÓN ELIMINAR INFERIOR
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 32,
  },
  deleteActionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

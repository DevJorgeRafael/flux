import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { Account } from '@/core/models/account';
import { Category } from '@/core/models/category';
import { MonthlyTotals } from '@/core/repositories/ITransactionRepository';
import {
  SqliteAccountRepository,
  SqliteTransactionRepository,
  SqliteCategoryRepository,
} from '@/infrastructure/repositories';
import { getDatabase, resetDatabase } from '@/infrastructure/database/db';
import { DEFAULT_CATEGORIES } from '@/infrastructure/database/schema.sql';

const accountRepo = new SqliteAccountRepository();
const transactionRepo = new SqliteTransactionRepository();
const categoryRepo = new SqliteCategoryRepository();

export function useDashboardStats() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals>({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const currentYearMonth = new Date().toISOString().substring(0, 7);
      const [accs, cats, totals] = await Promise.all([
        accountRepo.getAll(),
        categoryRepo.getAll(),
        transactionRepo.getMonthlyTotals(currentYearMonth),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setMonthlyTotals(totals);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchInitial = async () => {
      try {
        const currentYearMonth = new Date().toISOString().substring(0, 7);
        const [accs, cats, totals] = await Promise.all([
          accountRepo.getAll(),
          categoryRepo.getAll(),
          transactionRepo.getMonthlyTotals(currentYearMonth),
        ]);
        if (!isCancelled) {
          setAccounts(accs);
          setCategories(cats);
          setMonthlyTotals(totals);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchInitial();
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleSeedDemoData = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await getDatabase();

      for (const cat of DEFAULT_CATEGORIES) {
        await db.runAsync(
          'INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?);',
          [cat.id, cat.name, cat.type, cat.icon, cat.color]
        );
      }

      const accCheckingId = 'demo-acc-1';
      const accYieldId = 'demo-acc-2';
      const accFixedId = 'demo-acc-3';

      await db.runAsync(
        `INSERT OR REPLACE INTO accounts
         (id, name, type, balance, currency, annual_rate, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'USD', ?, 0, ?, ?);`,
        [accCheckingId, 'Cuenta Sueldo (Galicia)', 'CHECKING', 1250000, null, new Date().toISOString(), new Date().toISOString()]
      );

      await db.runAsync(
        `INSERT OR REPLACE INTO accounts
         (id, name, type, balance, currency, annual_rate, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'USD', ?, 0, ?, ?);`,
        [accYieldId, 'Fondo MercadoPago', 'FLEXIBLE_SAVINGS', 380450, 0.375, new Date().toISOString(), new Date().toISOString()]
      );

      await db.runAsync(
        `INSERT OR REPLACE INTO accounts
         (id, name, type, balance, currency, annual_rate, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'USD', ?, 0, ?, ?);`,
        [accFixedId, 'Plazo Fijo UVA 90d', 'FIXED_TERM', 500000, 0.42, new Date().toISOString(), new Date().toISOString()]
      );

      await db.runAsync('DELETE FROM fixed_term_deposits WHERE account_id = ?;', [accFixedId]);
      await db.runAsync(
        `INSERT INTO fixed_term_deposits (id, account_id, principal_amount, annual_rate, term_months, start_date, maturity_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'demo-dep-1',
          accFixedId,
          500000,
          0.42,
          3,
          '2026-03-01',
          '2026-06-01',
          'ACTIVE',
        ]
      );

      const txDate = new Date().toISOString();
      await db.runAsync(
        'INSERT OR REPLACE INTO transactions (id, type, total_amount, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        ['demo-tx-1', 'INCOME', 1250000, 'Acreditación Haberes', txDate, txDate]
      );
      await db.runAsync('DELETE FROM transaction_splits WHERE transaction_id = ?;', ['demo-tx-1']);
      await db.runAsync(
        'INSERT INTO transaction_splits (id, transaction_id, account_id, category_id, amount) VALUES (?, ?, ?, ?, ?);',
        ['demo-split-1', 'demo-tx-1', accCheckingId, 'cat_inc_salary', 1250000]
      );

      await db.runAsync(
        'INSERT OR REPLACE INTO transactions (id, type, total_amount, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        ['demo-tx-2', 'EXPENSE', 84500, 'Supermercado Coto', txDate, txDate]
      );
      await db.runAsync('DELETE FROM transaction_splits WHERE transaction_id = ?;', ['demo-tx-2']);
      await db.runAsync(
        'INSERT INTO transaction_splits (id, transaction_id, account_id, category_id, amount) VALUES (?, ?, ?, ?, ?);',
        ['demo-split-2', 'demo-tx-2', accCheckingId, 'cat_exp_food', 84500]
      );

      await loadData();
      Alert.alert('Datos cargados', 'Se agregaron cuentas y transacciones demo con éxito.');
    } catch (err: unknown) {
      console.error('Error seeding demo data:', err);
      Alert.alert('Error', 'No se pudieron cargar los datos demo.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const handleResetAllData = useCallback(async () => {
    Alert.alert(
      '¿Restablecer todo?',
      'Esta acción eliminará todas las transacciones, cuentas y depósitos. Los datos volverán a su estado inicial en blanco.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await resetDatabase();
              await loadData();
              Alert.alert('Base de datos restablecida', 'Se han borrado todos los datos correctamente.');
            } catch (err) {
              console.error('Error resetting database:', err);
              Alert.alert('Error', 'No se pudo restablecer la base de datos.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [loadData]);

  return {
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
  };
}

import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/core/models/transaction';
import { Account } from '@/core/models/account';
import { SqliteTransactionRepository } from '@/infrastructure/repositories';

const transactionRepo = new SqliteTransactionRepository();

export function useAccountFilters(accounts: Account[]) {
  const [selectedFilterAccountId, setSelectedFilterAccountId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadTransactions = useCallback(async () => {
    try {
      const txs = await transactionRepo.getAll(
        selectedFilterAccountId ? { accountId: selectedFilterAccountId } : undefined
      );
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading transactions in filter:', err);
    }
  }, [selectedFilterAccountId]);

  useEffect(() => {
    let isCancelled = false;
    const fetchTxs = async () => {
      try {
        const txs = await transactionRepo.getAll(
          selectedFilterAccountId ? { accountId: selectedFilterAccountId } : undefined
        );
        if (!isCancelled) {
          setTransactions(txs);
        }
      } catch (err) {
        console.error('Error loading transactions in filter:', err);
      }
    };

    fetchTxs();
    return () => {
      isCancelled = true;
    };
  }, [selectedFilterAccountId]);

  const handleSelectAccountFilter = useCallback((id: string | null) => {
    setSelectedFilterAccountId((prev) => (prev === id ? null : id));
  }, []);

  const selectedAccountName = accounts.find((a) => a.id === selectedFilterAccountId)?.name;

  return {
    selectedFilterAccountId,
    transactions,
    selectedAccountName,
    handleSelectAccountFilter,
    reloadTransactions: loadTransactions,
  };
}

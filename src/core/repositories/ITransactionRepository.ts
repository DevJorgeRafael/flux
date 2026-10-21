import {
  Transaction,
  CreateTransactionDTO,
  TransactionFilterDTO,
} from '../models/transaction';

export interface MonthlyTotals {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}

export interface ITransactionRepository {
  getAll(filter?: TransactionFilterDTO): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  createWithSplits(data: CreateTransactionDTO): Promise<Transaction>;
  delete(id: string): Promise<void>;
  getMonthlyTotals(yearMonth: string): Promise<MonthlyTotals>; // format 'YYYY-MM'
}

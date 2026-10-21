import { IAccountRepository } from '@/core/repositories/IAccountRepository';
import {
  Account,
  AccountType,
  CreateAccountDTO,
  UpdateAccountDTO,
  FixedTermDeposit,
  CreateFixedTermDepositDTO,
} from '@/core/models/account';
import { getDatabase } from '../database/db';

interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  annual_rate: number | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

interface DepositRow {
  id: string;
  account_id: string;
  principal_amount: number;
  annual_rate: number;
  term_months: number;
  start_date: string;
  maturity_date: string;
  status: 'ACTIVE' | 'MATURED' | 'CANCELLED';
  created_at: string;
}

function mapAccount(row: AccountRow, deposits?: FixedTermDeposit[]): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    currency: row.currency,
    annualRate: row.annual_rate,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fixedTermDeposits: deposits,
  };
}

function mapDeposit(row: DepositRow): FixedTermDeposit {
  return {
    id: row.id,
    accountId: row.account_id,
    principalAmount: row.principal_amount,
    annualRate: row.annual_rate,
    termMonths: row.term_months,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class SqliteAccountRepository implements IAccountRepository {
  async getAll(includeArchived = false): Promise<Account[]> {
    const db = await getDatabase();
    const query = includeArchived
      ? 'SELECT * FROM accounts ORDER BY created_at ASC'
      : 'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY created_at ASC';

    const rows = await db.getAllAsync<AccountRow>(query);
    const accounts: Account[] = [];

    for (const row of rows) {
      let deposits: FixedTermDeposit[] | undefined;
      if (row.type === 'FIXED_TERM') {
        const depRows = await db.getAllAsync<DepositRow>(
          'SELECT * FROM fixed_term_deposits WHERE account_id = ? ORDER BY maturity_date ASC',
          [row.id]
        );
        deposits = depRows.map(mapDeposit);
      }
      accounts.push(mapAccount(row, deposits));
    }

    return accounts;
  }

  async getById(id: string): Promise<Account | null> {
    if (!id) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync<AccountRow>(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    );
    if (!row) return null;

    let deposits: FixedTermDeposit[] | undefined;
    if (row.type === 'FIXED_TERM') {
      const depRows = await db.getAllAsync<DepositRow>(
        'SELECT * FROM fixed_term_deposits WHERE account_id = ? ORDER BY maturity_date ASC',
        [row.id]
      );
      deposits = depRows.map(mapDeposit);
    }
    return mapAccount(row, deposits);
  }

  async create(data: CreateAccountDTO): Promise<Account> {
    const db = await getDatabase();
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    // A fixed-term account gets its initial balance when the deposit is added
    // below, so do not count the same principal as the account's opening balance.
    const balance =
      data.type === 'FIXED_TERM' && data.initialFixedTermDeposit
        ? 0
        : data.initialBalance ?? 0;
    const currency = data.currency ?? 'USD';

    if (typeof data.annualRate === 'number') {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, balance, currency, annual_rate, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, data.name, data.type, balance, currency, data.annualRate, now, now]
      );
    } else {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, balance, currency, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, data.name, data.type, balance, currency, now, now]
      );
    }

    let deposits: FixedTermDeposit[] | undefined;
    if (data.type === 'FIXED_TERM' && data.initialFixedTermDeposit) {
      const dep = await this.addFixedTermDeposit({
        accountId: id,
        ...data.initialFixedTermDeposit,
      });
      deposits = [dep];
    }

    return {
      id,
      name: data.name,
      type: data.type,
      balance,
      currency,
      annualRate: data.annualRate ?? null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      fixedTermDeposits: deposits,
    };
  }

  async update(id: string, data: UpdateAccountDTO): Promise<Account> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Account not found: ${id}`);

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: (string | number)[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (typeof data.annualRate === 'number') {
      updates.push('annual_rate = ?');
      params.push(data.annualRate);
    }
    if (data.isArchived !== undefined) {
      updates.push('is_archived = ?');
      params.push(data.isArchived ? 1 : 0);
    }

    params.push(id);
    await db.runAsync(
      `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getById(id);
    return updated!;
  }

  async updateBalance(id: string, deltaAmount: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [deltaAmount, now, id]
    );
  }

  async addFixedTermDeposit(data: CreateFixedTermDepositDTO): Promise<FixedTermDeposit> {
    const db = await getDatabase();
    const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const startDate = data.startDate ?? now.split('T')[0];

    const start = new Date(startDate);
    start.setMonth(start.getMonth() + data.termMonths);
    const maturityDate = start.toISOString().split('T')[0];

    await db.runAsync(
      `INSERT INTO fixed_term_deposits (id, account_id, principal_amount, annual_rate, term_months, start_date, maturity_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [id, data.accountId, data.principalAmount, data.annualRate, data.termMonths, startDate, maturityDate, now]
    );

    await this.updateBalance(data.accountId, data.principalAmount);

    return {
      id,
      accountId: data.accountId,
      principalAmount: data.principalAmount,
      annualRate: data.annualRate,
      termMonths: data.termMonths,
      startDate,
      maturityDate,
      status: 'ACTIVE',
      createdAt: now,
    };
  }

  async getFixedTermDeposits(accountId: string): Promise<FixedTermDeposit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<DepositRow>(
      'SELECT * FROM fixed_term_deposits WHERE account_id = ? ORDER BY maturity_date ASC',
      [accountId]
    );
    return rows.map(mapDeposit);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  }
}

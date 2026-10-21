import {
  Account,
  CreateAccountDTO,
  UpdateAccountDTO,
  FixedTermDeposit,
  CreateFixedTermDepositDTO,
} from '../models/account';

export interface IAccountRepository {
  getAll(includeArchived?: boolean): Promise<Account[]>;
  getById(id: string): Promise<Account | null>;
  create(data: CreateAccountDTO): Promise<Account>;
  update(id: string, data: UpdateAccountDTO): Promise<Account>;
  updateBalance(id: string, deltaAmount: number): Promise<void>;
  addFixedTermDeposit(data: CreateFixedTermDepositDTO): Promise<FixedTermDeposit>;
  getFixedTermDeposits(accountId: string): Promise<FixedTermDeposit[]>;
  delete(id: string): Promise<void>;
}

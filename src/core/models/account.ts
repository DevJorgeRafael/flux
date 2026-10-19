export type AccountType = 'CHECKING' | 'FLEXIBLE_SAVINGS' | 'FIXED_TERM';

export interface FixedTermDeposit {
  id: string;
  accountId: string;
  principalAmount: number;
  annualRate: number;      // e.g. 0.08 for 8%
  termMonths: number;      // e.g. 3, 6, 12
  startDate: string;       // ISO date YYYY-MM-DD
  maturityDate: string;    // ISO date YYYY-MM-DD
  status: 'ACTIVE' | 'MATURED' | 'CANCELLED';
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  annualRate?: number | null; // For FLEXIBLE_SAVINGS (e.g. 0.08)
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  fixedTermDeposits?: FixedTermDeposit[]; // Optional populated list for FIXED_TERM
}

export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  initialBalance?: number;
  currency?: string;
  annualRate?: number; // Needed if type is FLEXIBLE_SAVINGS
  // For initial FIXED_TERM deposit if created with first tranche:
  initialFixedTermDeposit?: {
    principalAmount: number;
    annualRate: number;
    termMonths: number;
    startDate?: string;
  };
}

export interface UpdateAccountDTO {
  name?: string;
  annualRate?: number;
  isArchived?: boolean;
}

export interface CreateFixedTermDepositDTO {
  accountId: string;
  principalAmount: number;
  annualRate: number;
  termMonths: number;
  startDate?: string;
}

export const SCHEMA_DDL = `
-- 1. Cuentas (Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('CHECKING', 'FLEXIBLE_SAVINGS', 'FIXED_TERM')) NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'USD',
    annual_rate REAL DEFAULT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Subcontratos / Tramos de Plazo Fijo (Fixed Term Tranches)
CREATE TABLE IF NOT EXISTS fixed_term_deposits (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    principal_amount REAL NOT NULL,
    annual_rate REAL NOT NULL,
    term_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    maturity_date TEXT NOT NULL,
    status TEXT CHECK(status IN ('ACTIVE', 'MATURED', 'CANCELLED')) NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 3. Categorías (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    icon TEXT,
    color TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Transacciones (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE', 'TRANSFER')) NOT NULL,
    total_amount REAL NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Divisiones de Transacción (Transaction Splits)
CREATE TABLE IF NOT EXISTS transaction_splits (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_splits_tx ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_splits_account ON transaction_splits(account_id);
CREATE INDEX IF NOT EXISTS idx_splits_category ON transaction_splits(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_account ON fixed_term_deposits(account_id);
`;

export const DEFAULT_CATEGORIES = [
  // Ingresos
  { id: 'cat_inc_salary', name: 'Salario / Nómina', type: 'INCOME', icon: 'briefcase', color: '#10B981', is_default: 1 },
  { id: 'cat_inc_invest', name: 'Rendimientos / Inversión', type: 'INCOME', icon: 'trending-up', color: '#059669', is_default: 1 },
  { id: 'cat_inc_freelance', name: 'Freelance / Honorarios', type: 'INCOME', icon: 'laptop', color: '#34D399', is_default: 1 },
  { id: 'cat_inc_other', name: 'Otros Ingresos', type: 'INCOME', icon: 'plus-circle', color: '#6EE7B7', is_default: 1 },
  // Gastos
  { id: 'cat_exp_housing', name: 'Vivienda y Alquiler', type: 'EXPENSE', icon: 'home', color: '#EF4444', is_default: 1 },
  { id: 'cat_exp_food', name: 'Alimentación y Supermercado', type: 'EXPENSE', icon: 'shopping-cart', color: '#F87171', is_default: 1 },
  { id: 'cat_exp_transport', name: 'Transporte', type: 'EXPENSE', icon: 'car', color: '#F59E0B', is_default: 1 },
  { id: 'cat_exp_services', name: 'Servicios Públicos', type: 'EXPENSE', icon: 'zap', color: '#FBBF24', is_default: 1 },
  { id: 'cat_exp_health', name: 'Salud y Farmacia', type: 'EXPENSE', icon: 'heart', color: '#EC4899', is_default: 1 },
  { id: 'cat_exp_entertainment', name: 'Ocio y Entretenimiento', type: 'EXPENSE', icon: 'film', color: '#8B5CF6', is_default: 1 },
  { id: 'cat_exp_other', name: 'Otros Gastos', type: 'EXPENSE', icon: 'help-circle', color: '#9CA3AF', is_default: 1 },
];

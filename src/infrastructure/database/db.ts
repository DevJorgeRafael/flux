import * as SQLite from 'expo-sqlite';
import { SCHEMA_DDL, DEFAULT_CATEGORIES } from './schema.sql';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    try {
      await dbInstance.getFirstAsync('SELECT 1');
      return dbInstance;
    } catch {
      // Si la conexión nativa murió (e.g. fast refresh o garbage collection), reinicializamos
      dbInstance = null;
      initPromise = null;
    }
  }
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    const db = await SQLite.openDatabaseAsync('flux_balance.db', {
      useNewConnection: true,
    });

    // Pragmas seguros
    try {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    } catch (pragmaErr) {
      console.warn('Pragma warning:', pragmaErr);
    }

    // Creación de tablas e índices
    await db.execAsync(SCHEMA_DDL);

    // Sembrado de categorías por defecto si está vacía
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );

    if (!result || result.count === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await db.runAsync(
          `INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cat.id, cat.name, cat.type, cat.icon || '', cat.color || '', cat.is_default]
        );
      }
    }

    dbInstance = db;
    return db;
  } catch (error) {
    console.error('Error al inicializar la base de datos SQLite:', error);
    dbInstance = null;
    initPromise = null;
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM transaction_splits;
    DELETE FROM transactions;
    DELETE FROM fixed_term_deposits;
    DELETE FROM accounts;
    DELETE FROM categories;
  `);

  for (const cat of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.type, cat.icon || '', cat.color || '', cat.is_default]
    );
  }
}


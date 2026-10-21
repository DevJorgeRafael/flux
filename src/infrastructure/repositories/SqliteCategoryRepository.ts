import { ICategoryRepository } from '@/core/repositories/ICategoryRepository';
import { Category, CategoryType, CreateCategoryDTO, UpdateCategoryDTO } from '@/core/models/category';
import { getDatabase } from '../database/db';

interface CategoryRow {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  is_default: number;
  created_at: string;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
  };
}

export class SqliteCategoryRepository implements ICategoryRepository {
  async getAll(type?: CategoryType): Promise<Category[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM categories ORDER BY name ASC';
    const params: (string | number)[] = [];

    if (type) {
      query = 'SELECT * FROM categories WHERE type = ? ORDER BY name ASC';
      params.push(type);
    }

    const rows = await db.getAllAsync<CategoryRow>(query, params);
    return rows.map(mapCategory);
  }

  async getById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return row ? mapCategory(row) : null;
  }

  async create(data: CreateCategoryDTO): Promise<Category> {
    const db = await getDatabase();
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO categories (id, name, type, icon, color, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, data.name, data.type, data.icon ?? null, data.color ?? null, now]
    );

    return {
      id,
      name: data.name,
      type: data.type,
      icon: data.icon ?? null,
      color: data.color ?? null,
      isDefault: false,
      createdAt: now,
    };
  }

  async update(id: string, data: UpdateCategoryDTO): Promise<Category> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Category not found: ${id}`);

    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon ?? null);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color ?? null);
    }

    if (updates.length > 0) {
      params.push(id);
      await db.runAsync(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const updated = await this.getById(id);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }
}

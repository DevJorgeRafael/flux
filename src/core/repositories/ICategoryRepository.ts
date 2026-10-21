import { Category, CategoryType, CreateCategoryDTO, UpdateCategoryDTO } from '../models/category';

export interface ICategoryRepository {
  getAll(type?: CategoryType): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(data: CreateCategoryDTO): Promise<Category>;
  update(id: string, data: UpdateCategoryDTO): Promise<Category>;
  delete(id: string): Promise<void>;
}

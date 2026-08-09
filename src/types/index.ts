export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  base_servings: number;
  prep_time: number;
  cook_time: number;
  difficulty: Difficulty;
  instructions: string;
  category: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
}

export interface Ingredient {
  id: string;
  name: string;
  default_unit: string;
  category: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit: string;
  category?: string;
}

export interface PantryItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date: string | null;
  updated_at: string;
}

export interface MealPlanEntry {
  id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string;
  recipe_title?: string;
  servings: number;
  prepared: boolean;
  recipe?: Recipe;
}

export interface ShoppingItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity_needed: number;
  unit: string;
  category: string;
  purchased: boolean;
  price: number | null;
  supermarket: string | null;
  week_start: string;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Tentempié',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface RecipeViability {
  recipe: Recipe;
  available_count: number;
  total_count: number;
  missing_count: number;
  missing_ingredients: string[];
}

export interface DayNote {
  id: string;
  date: string;
  note: string;
}

export const SUPERMARKETS = ['Aldi', 'Lidl', 'Consum', 'DIA', 'Eroski', 'Carrefour', 'Corte Inglés', 'Otros'];

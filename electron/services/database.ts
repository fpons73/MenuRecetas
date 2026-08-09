import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'midweek.db');
}

export function initDatabase(dbPath?: string): Database.Database {
  const finalPath = dbPath || getDbPath();
  db = new Database(finalPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations();
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_unit TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      base_servings INTEGER NOT NULL DEFAULT 4,
      prep_time INTEGER NOT NULL DEFAULT 15,
      cook_time INTEGER NOT NULL DEFAULT 30,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      instructions TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      image_url TEXT,
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      sat_fat REAL,
      fiber REAL,
      salt REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pantry (
      id TEXT PRIMARY KEY,
      ingredient_id TEXT NOT NULL UNIQUE,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      category TEXT NOT NULL,
      expiry_date TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_plan (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      recipe_id TEXT NOT NULL,
      servings INTEGER NOT NULL DEFAULT 1,
      prepared INTEGER NOT NULL DEFAULT 0,
      deducted_amounts TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id TEXT PRIMARY KEY,
      ingredient_id TEXT NOT NULL,
      quantity_needed REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      category TEXT NOT NULL,
      purchased INTEGER NOT NULL DEFAULT 0,
      price REAL,
      supermarket TEXT,
      week_start TEXT NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS day_notes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      note TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ingredient_prices (
      id TEXT PRIMARY KEY,
      ingredient_id TEXT NOT NULL,
      supermarket TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      price_unit TEXT NOT NULL DEFAULT 'unidad',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(ingredient_id, supermarket),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_pantry_ingredient ON pantry(ingredient_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plan_date ON meal_plan(date);
  `);

  // Migracion: añadir columna expiry_date si no existe (para BD existentes)
  try {
    db.exec(`ALTER TABLE pantry ADD COLUMN expiry_date TEXT`);
  } catch {
    // La columna ya existe
  }

  // Migracion: añadir columna deducted_amounts si no existe
  try {
    db.exec(`ALTER TABLE meal_plan ADD COLUMN deducted_amounts TEXT`);
  } catch {
    // La columna ya existe
  }

  // Migracion: añadir columnas price y supermarket a shopping_list
  try {
    db.exec(`ALTER TABLE shopping_list ADD COLUMN price REAL`);
  } catch { /* ya existe */ }
  try {
    db.exec(`ALTER TABLE shopping_list ADD COLUMN supermarket TEXT`);
  } catch { /* ya existe */ }

  // Migracion: añadir columnas nutricionales a recipes
  try { db.exec(`ALTER TABLE recipes ADD COLUMN calories REAL`); } catch { /* ya existe */ }
  try { db.exec(`ALTER TABLE recipes ADD COLUMN protein REAL`); } catch { /* ya existe */ }
  try { db.exec(`ALTER TABLE recipes ADD COLUMN carbs REAL`); } catch { /* ya existe */ }
  try { db.exec(`ALTER TABLE recipes ADD COLUMN fat REAL`); } catch { /* ya existe */ }
  try { db.exec(`ALTER TABLE recipes ADD COLUMN sat_fat REAL`); } catch { /* ya existe */ }
  try { db.exec(`ALTER TABLE recipes ADD COLUMN fiber REAL`); } catch { /* ya existe */ }
  try { db.exec(`ALTER TABLE recipes ADD COLUMN salt REAL`); } catch { /* ya existe */ }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

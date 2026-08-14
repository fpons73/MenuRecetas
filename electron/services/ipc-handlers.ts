import { ipcMain, dialog, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDatabase } from './database';
import { generateRecipePdf } from './pdf-export';
import { generateShoppingListPdf } from './pdf-export';
import { generateShoppingListDocx } from './docx-export';
import { generateMealPlanPdf } from './pdf-export';
import { parsePdfRecipe } from './pdf-import';
import { parseRecipeFromText, suggestRecipesFromPantry, generateWeeklyMealPlan, askChefAssistant } from './ollama';

function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;

  const massUnits: Record<string, number> = { 'kg': 1000, 'g': 1, 'mg': 1000 };
  const volUnits: Record<string, number> = { 'L': 1000, 'l': 1000, 'ml': 1 };

  // Conversiones de cocina aproximadas (a ml)
  const kitchenToMl: Record<string, number> = {
    'cucharada': 15, 'cucharadas': 15,
    'cucharadita': 5,
    'taza': 250, 'tazas': 250,
    'vaso': 200, 'vasos': 200,
  };

  // Masa a masa
  if (massUnits[fromUnit] && massUnits[toUnit]) {
    const fromBase = value * massUnits[fromUnit]; // convertir a g
    return fromBase / massUnits[toUnit]; // convertir a unidad destino
  }

  // Volumen a volumen
  if (volUnits[fromUnit] && volUnits[toUnit]) {
    const fromBase = value * volUnits[fromUnit]; // convertir a ml
    return fromBase / volUnits[toUnit];
  }

  // Cocina a volumen
  if (kitchenToMl[fromUnit] && volUnits[toUnit]) {
    const ml = value * kitchenToMl[fromUnit];
    return ml / volUnits[toUnit];
  }

  // Volumen a cocina
  if (volUnits[fromUnit] && kitchenToMl[toUnit]) {
    const ml = value * volUnits[fromUnit];
    return ml / kitchenToMl[toUnit];
  }

  // Cocina a cocina
  if (kitchenToMl[fromUnit] && kitchenToMl[toUnit]) {
    const ml = value * kitchenToMl[fromUnit];
    return ml / kitchenToMl[toUnit];
  }

  // No hay conversion directa, devolver el valor original
  return value;
}

function normalizeToBaseUnit(value: number, unit: string): number {
  // Normalizar a ml o g como base para comparaciones
  const massUnits: Record<string, number> = { 'kg': 1000, 'g': 1, 'mg': 0.001 };
  const volUnits: Record<string, number> = { 'L': 1000, 'l': 1000, 'ml': 1 };
  const kitchenToMl: Record<string, number> = {
    'cucharada': 15, 'cucharadas': 15,
    'cucharadita': 5,
    'taza': 250, 'tazas': 250,
    'vaso': 200, 'vasos': 200,
  };

  if (massUnits[unit]) return value * massUnits[unit];
  if (volUnits[unit]) return value * volUnits[unit];
  if (kitchenToMl[unit]) return value * kitchenToMl[unit];
  return value;
}

export function registerIpcHandlers(): void {
  const db = getDatabase;

  // ==================== RECIPES ====================
  ipcMain.handle('recipes:getAll', () => {
    const database = db();
    const recipes = database.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all();
    return recipes.map((r: any) => ({
      ...r,
      ingredients: database.prepare(
        `SELECT ri.*, i.name as ingredient_name, i.category
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = ?`
      ).all(r.id),
    }));
  });

  ipcMain.handle('recipes:get', (_e, id: string) => {
    const database = db();
    const recipe = database.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
    if (!recipe) return null;
    recipe.ingredients = database.prepare(
      `SELECT ri.*, i.name as ingredient_name, i.category
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = ?`
    ).all(id);
    return recipe;
  });

  ipcMain.handle('recipes:create', (_e, recipeData: any) => {
    const database = db();
    const recipeId = uuidv4();
    const transaction = database.transaction(() => {
      database.prepare(
        'INSERT INTO recipes (id, title, description, base_servings, prep_time, cook_time, difficulty, instructions, category, calories, protein, carbs, fat, sat_fat, fiber, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(recipeId, recipeData.title, recipeData.description || '', recipeData.base_servings || 4, recipeData.prep_time || 15, recipeData.cook_time || 30, recipeData.difficulty || 'medium', recipeData.instructions || '', recipeData.category || 'General', recipeData.calories ?? null, recipeData.protein ?? null, recipeData.carbs ?? null, recipeData.fat ?? null, recipeData.sat_fat ?? null, recipeData.fiber ?? null, recipeData.salt ?? null);

      if (recipeData.ingredients) {
        for (const ing of recipeData.ingredients) {
          let ingredientId: string;
          const existing = database.prepare('SELECT id FROM ingredients WHERE name = ?').get(ing.name) as any;
          if (existing) {
            ingredientId = existing.id;
            database.prepare('UPDATE ingredients SET default_unit = ?, category = ? WHERE id = ?')
              .run(ing.unit, ing.category, ingredientId);
          } else {
            ingredientId = uuidv4();
            database.prepare('INSERT INTO ingredients (id, name, default_unit, category) VALUES (?, ?, ?, ?)')
              .run(ingredientId, ing.name, ing.unit, ing.category);
          }
          database.prepare('INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), recipeId, ingredientId, ing.quantity, ing.unit);
        }
      }
    });
    transaction();
    return database.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
  });

  ipcMain.handle('recipes:update', (_e, recipeData: any) => {
    const database = db();
    const transaction = database.transaction(() => {
      database.prepare(
        'UPDATE recipes SET title=?, description=?, base_servings=?, prep_time=?, cook_time=?, difficulty=?, instructions=?, category=?, calories=?, protein=?, carbs=?, fat=?, sat_fat=?, fiber=?, salt=?, updated_at=datetime(\'now\') WHERE id=?'
      ).run(recipeData.title, recipeData.description || '', recipeData.base_servings, recipeData.prep_time, recipeData.cook_time, recipeData.difficulty, recipeData.instructions || '', recipeData.category, recipeData.calories ?? null, recipeData.protein ?? null, recipeData.carbs ?? null, recipeData.fat ?? null, recipeData.sat_fat ?? null, recipeData.fiber ?? null, recipeData.salt ?? null, recipeData.id);

      if (recipeData.ingredients) {
        database.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeData.id);
        for (const ing of recipeData.ingredients) {
          let ingredientId: string;
          const existing = database.prepare('SELECT id FROM ingredients WHERE name = ?').get(ing.name) as any;
          if (existing) {
            ingredientId = existing.id;
            database.prepare('UPDATE ingredients SET default_unit = ?, category = ? WHERE id = ?')
              .run(ing.unit, ing.category, ingredientId);
          } else {
            ingredientId = uuidv4();
            database.prepare('INSERT INTO ingredients (id, name, default_unit, category) VALUES (?, ?, ?, ?)')
              .run(ingredientId, ing.name, ing.unit, ing.category);
          }
          database.prepare('INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), recipeData.id, ingredientId, ing.quantity, ing.unit);
        }
      }
    });
    transaction();
    return database.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeData.id);
  });

  ipcMain.handle('recipes:delete', (_e, id: string) => {
    const database = db();
    database.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);
    database.prepare('DELETE FROM recipes WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('recipes:viability', () => {
    const database = db();
    const recipes = database.prepare('SELECT * FROM recipes ORDER BY title').all() as any[];
    const result: any[] = [];

    for (const recipe of recipes) {
      const ingredients = database.prepare(
        'SELECT ri.*, i.name as ingredient_name, i.category FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE ri.recipe_id = ?'
      ).all(recipe.id) as any[];

      let availableCount = 0;
      const missingIngredients: string[] = [];

      for (const ing of ingredients) {
        const pantryItem = database.prepare('SELECT quantity FROM pantry WHERE ingredient_id = ?').get(ing.ingredient_id) as any;
        if (pantryItem && pantryItem.quantity >= ing.quantity) {
          availableCount++;
        } else {
          missingIngredients.push(ing.ingredient_name);
        }
      }

      result.push({
        recipe: { ...recipe, ingredients },
        available_count: availableCount,
        total_count: ingredients.length,
        missing_count: ingredients.length - availableCount,
        missing_ingredients: missingIngredients,
      });
    }

    result.sort((a, b) => a.missing_count - b.missing_count);
    return result;
  });

  // ==================== INGREDIENTS ====================
  ipcMain.handle('ingredients:getAll', () => {
    return db().prepare('SELECT * FROM ingredients ORDER BY name').all();
  });

  ipcMain.handle('ingredients:categories', () => {
    const rows = db().prepare('SELECT DISTINCT category FROM ingredients ORDER BY category').all() as any[];
    return rows.map((r: any) => r.category);
  });

  // ==================== PANTRY ====================
  ipcMain.handle('pantry:getAll', () => {
    return db().prepare(
      'SELECT p.*, i.name as ingredient_name FROM pantry p JOIN ingredients i ON p.ingredient_id = i.id ORDER BY p.location, i.category, i.name'
    ).all();
  });

  ipcMain.handle('pantry:add', (_e, item: any) => {
    const database = db();
    let ingredientId = item.ingredient_id;
    if (!ingredientId) {
      const existing = database.prepare('SELECT id FROM ingredients WHERE name = ?').get(item.ingredient_name) as any;
      if (existing) {
        ingredientId = existing.id;
      } else {
        ingredientId = uuidv4();
        database.prepare('INSERT INTO ingredients (id, name, default_unit, category) VALUES (?, ?, ?, ?)')
          .run(ingredientId, item.ingredient_name, item.unit, item.category);
      }
    }

    const existingPantry = database.prepare('SELECT id, quantity FROM pantry WHERE ingredient_id = ?').get(ingredientId) as any;
    const expiryDate = item.expiry_date || null;
    const location = item.location || 'despensa';
    const minStock = item.min_stock !== undefined ? item.min_stock : 0;

    if (existingPantry) {
      database.prepare('UPDATE pantry SET quantity = quantity + ?, expiry_date = ?, location = ?, min_stock = ?, updated_at = datetime(\'now\') WHERE ingredient_id = ?')
        .run(item.quantity, expiryDate, location, minStock, ingredientId);
      return database.prepare('SELECT p.*, i.name as ingredient_name FROM pantry p JOIN ingredients i ON p.ingredient_id = i.id WHERE p.id = ?').get(existingPantry.id);
    }

    const id = uuidv4();
    database.prepare('INSERT INTO pantry (id, ingredient_id, quantity, unit, category, location, min_stock, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, ingredientId, item.quantity, item.unit, item.category, location, minStock, expiryDate);
    return database.prepare('SELECT p.*, i.name as ingredient_name FROM pantry p JOIN ingredients i ON p.ingredient_id = i.id WHERE p.id = ?').get(id);
  });

  ipcMain.handle('pantry:update', (_e, item: any) => {
    const expiryDate = item.expiry_date !== undefined ? item.expiry_date : null;
    const location = item.location || 'despensa';
    const minStock = item.min_stock !== undefined ? item.min_stock : 0;
    db().prepare('UPDATE pantry SET quantity = ?, unit = ?, category = ?, location = ?, min_stock = ?, expiry_date = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(item.quantity, item.unit, item.category, location, minStock, expiryDate, item.id);
    return db().prepare('SELECT p.*, i.name as ingredient_name FROM pantry p JOIN ingredients i ON p.ingredient_id = i.id WHERE p.id = ?').get(item.id);
  });

  ipcMain.handle('pantry:delete', (_e, id: string) => {
    db().prepare('DELETE FROM pantry WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('pantry:getExpiring', (_e, daysThreshold: number) => {
    const threshold = daysThreshold || 5;
    return db().prepare(
      `SELECT p.*, i.name as ingredient_name FROM pantry p JOIN ingredients i ON p.ingredient_id = i.id
       WHERE p.expiry_date IS NOT NULL AND p.expiry_date <= date('now', ?)
       AND p.quantity > 0 ORDER BY p.expiry_date ASC`
    ).all(`+${threshold} days`);
  });

  ipcMain.handle('pantry:addLowStockToShopping', (_e, weekStart: string) => {
    const database = db();
    const lowStockItems = database.prepare(`
      SELECT p.*, i.name as ingredient_name
      FROM pantry p
      JOIN ingredients i ON p.ingredient_id = i.id
      WHERE p.min_stock > 0 AND p.quantity < p.min_stock
    `).all() as any[];

    let addedCount = 0;
    const transaction = database.transaction(() => {
      for (const item of lowStockItems) {
        const needed = Math.max(0, item.min_stock - item.quantity);
        if (needed <= 0) continue;

        const existingInList = database.prepare(`
          SELECT id, quantity_needed FROM shopping_list
          WHERE ingredient_id = ? AND week_start = ?
        `).get(item.ingredient_id, weekStart) as any;

        if (existingInList) {
          database.prepare(`
            UPDATE shopping_list
            SET quantity_needed = quantity_needed + ?, purchased = 0
            WHERE id = ?
          `).run(needed, existingInList.id);
        } else {
          database.prepare(`
            INSERT INTO shopping_list (id, ingredient_id, quantity_needed, unit, category, purchased, week_start)
            VALUES (?, ?, ?, ?, ?, 0, ?)
          `).run(uuidv4(), item.ingredient_id, needed, item.unit, item.category, weekStart);
        }
        addedCount++;
      }
    });

    transaction();
    return { success: true, count: addedCount };
  });

  // ==================== MEAL PLAN ====================
  ipcMain.handle('mealplan:get', (_e, weekStart: string) => {
    return db().prepare(
      'SELECT mp.*, r.title as recipe_title FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.date >= ? AND mp.date < date(?, \'+7 days\') ORDER BY mp.date, mp.meal_type'
    ).all(weekStart, weekStart);
  });

  ipcMain.handle('mealplan:add', (_e, entry: any) => {
    const id = uuidv4();
    const database = db();
    const existing = database.prepare('SELECT id FROM meal_plan WHERE date = ? AND meal_type = ?').get(entry.date, entry.meal_type);
    if (existing) {
      return { error: 'Ya existe una comida planificada para esa toma. Elimínala primero.' };
    }
    database.prepare(
      'INSERT INTO meal_plan (id, date, meal_type, recipe_id, servings) VALUES (?, ?, ?, ?, ?)'
    ).run(id, entry.date, entry.meal_type, entry.recipe_id, entry.servings);
    return database.prepare(
      'SELECT mp.*, r.title as recipe_title FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.id = ?'
    ).get(id);
  });

  ipcMain.handle('mealplan:update', (_e, entry: any) => {
    db().prepare(
      'UPDATE meal_plan SET date = ?, meal_type = ?, recipe_id = ?, servings = ? WHERE id = ?'
    ).run(entry.date, entry.meal_type, entry.recipe_id, entry.servings, entry.id);
    return db().prepare(
      'SELECT mp.*, r.title as recipe_title FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.id = ?'
    ).get(entry.id);
  });

  ipcMain.handle('mealplan:delete', (_e, id: string) => {
    const database = db();
    const mealPlan = database.prepare('SELECT * FROM meal_plan WHERE id = ?').get(id) as any;

    if (mealPlan && mealPlan.prepared && mealPlan.deducted_amounts) {
      const deducted = JSON.parse(mealPlan.deducted_amounts);

      const transaction = database.transaction(() => {
        for (const [ingredientId, qty] of Object.entries(deducted)) {
          const pantryItem = database.prepare('SELECT id, quantity, unit FROM pantry WHERE ingredient_id = ?').get(ingredientId) as any;
          if (pantryItem) {
            const restoreBase = (qty as number);
            const pantryBase = normalizeToBaseUnit(pantryItem.quantity, pantryItem.unit);
            const newBase = pantryBase + restoreBase;
            const pantryDisplayUnit = normalizeToBaseUnit(1, pantryItem.unit);
            const newQty = pantryDisplayUnit > 1 ? Math.round(newBase / pantryDisplayUnit * 100) / 100 : Math.round(newBase * 100) / 100;
            database.prepare('UPDATE pantry SET quantity = ?, updated_at = datetime(\'now\') WHERE ingredient_id = ?')
              .run(newQty, ingredientId);
          }
        }
        database.prepare('DELETE FROM meal_plan WHERE id = ?').run(id);
      });

      transaction();
    } else {
      database.prepare('DELETE FROM meal_plan WHERE id = ?').run(id);
    }

    return { success: true };
  });

  ipcMain.handle('mealplan:markPrepared', (_e, id: string) => {
    const database = db();
    const mealPlan = database.prepare('SELECT * FROM meal_plan WHERE id = ?').get(id) as any;
    if (!mealPlan) return { error: 'Meal plan entry not found' };
    if (mealPlan.prepared) return { error: 'Already marked as prepared' };

    const recipe = database.prepare('SELECT base_servings FROM recipes WHERE id = ?').get(mealPlan.recipe_id) as any;
    const scale = mealPlan.servings / (recipe?.base_servings || 1);
    const ingredients = database.prepare(
      'SELECT ri.ingredient_id, ri.quantity FROM recipe_ingredients ri WHERE ri.recipe_id = ?'
    ).all(mealPlan.recipe_id) as any[];

    const deducted: Record<string, number> = {};

    const transaction = database.transaction(() => {
      for (const ing of ingredients) {
        const scaledQty = Math.round(ing.quantity * scale * 100) / 100;
        const pantryItem = database.prepare('SELECT id, quantity, unit FROM pantry WHERE ingredient_id = ?').get(ing.ingredient_id) as any;
        if (pantryItem) {
          const scaledBase = normalizeToBaseUnit(scaledQty, ing.unit);
          const pantryBase = normalizeToBaseUnit(pantryItem.quantity, pantryItem.unit);
          const deduct = Math.min(pantryBase, scaledBase);
          deducted[ing.ingredient_id] = Math.round(deduct * 100) / 100;
          const newBase = pantryBase - deduct;
          const pantryDisplayUnit = normalizeToBaseUnit(1, pantryItem.unit);
          const newQty = pantryDisplayUnit > 1 ? Math.round(newBase / pantryDisplayUnit * 100) / 100 : Math.round(newBase * 100) / 100;
          database.prepare('UPDATE pantry SET quantity = ?, updated_at = datetime(\'now\') WHERE ingredient_id = ?')
            .run(newQty, ing.ingredient_id);
        }
      }

      database.prepare('UPDATE meal_plan SET prepared = 1, deducted_amounts = ? WHERE id = ?')
        .run(JSON.stringify(deducted), id);
    });

    transaction();
    return { success: true };
  });

  ipcMain.handle('mealplan:copyPreviousWeek', (_e, weekStart: string) => {
    const database = db();
    const prevStart = database.prepare("SELECT date(?, '-7 days') as d").get(weekStart) as any;
    const prevMeals = database.prepare(
      "SELECT mp.*, mp.date as meal_date FROM meal_plan mp WHERE mp.date >= ? AND mp.date < date(?, '+7 days')"
    ).all(prevStart.d, prevStart.d) as any[];

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = database.prepare("SELECT date(?, ? || ' days') as d").get(weekStart, `+${i}`) as any;
      return d.d;
    });

    const transaction = database.transaction(() => {
      for (const meal of prevMeals) {
        const oldDate = new Date(meal.meal_date + 'T00:00:00');
        const dayOfWeek = oldDate.getDay();
        const newDayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const newDate = weekDays[newDayIdx];

        const existing = database.prepare('SELECT id FROM meal_plan WHERE date = ? AND meal_type = ?').get(newDate, meal.meal_type);
        if (!existing) {
          database.prepare('INSERT INTO meal_plan (id, date, meal_type, recipe_id, servings) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), newDate, meal.meal_type, meal.recipe_id, meal.servings);
        }
      }
    });

    transaction();
    return { success: true };
  });

  // ==================== DAY NOTES ====================
  ipcMain.handle('daynotes:getAll', (_e, weekStart: string) => {
    return db().prepare(
      "SELECT * FROM day_notes WHERE date >= ? AND date < date(?, '+7 days') ORDER BY date"
    ).all(weekStart, weekStart);
  });

  ipcMain.handle('daynotes:save', (_e, date: string, note: string) => {
    const database = db();
    const existing = database.prepare('SELECT id FROM day_notes WHERE date = ?').get(date);
    if (existing) {
      database.prepare('UPDATE day_notes SET note = ? WHERE date = ?').run(note, date);
    } else {
      database.prepare('INSERT INTO day_notes (id, date, note) VALUES (?, ?, ?)').run(uuidv4(), date, note);
    }
    return { success: true };
  });

  // ==================== PRICES ====================
  ipcMain.handle('prices:getAll', () => {
    return db().prepare(
      'SELECT ip.*, i.name as ingredient_name FROM ingredient_prices ip JOIN ingredients i ON ip.ingredient_id = i.id ORDER BY i.name, ip.supermarket'
    ).all();
  });

  ipcMain.handle('prices:getForIngredient', (_e, ingredientId: string) => {
    return db().prepare(
      'SELECT ip.*, i.name as ingredient_name FROM ingredient_prices ip JOIN ingredients i ON ip.ingredient_id = i.id WHERE ip.ingredient_id = ? ORDER BY ip.supermarket'
    ).all(ingredientId);
  });

  ipcMain.handle('prices:save', (_e, ingredientId: string, supermarket: string, price: number, priceUnit: string) => {
    const database = db();
    const existing = database.prepare('SELECT id FROM ingredient_prices WHERE ingredient_id = ? AND supermarket = ?').get(ingredientId, supermarket);
    if (existing) {
      database.prepare('UPDATE ingredient_prices SET price = ?, price_unit = ?, updated_at = datetime(\'now\') WHERE ingredient_id = ? AND supermarket = ?')
        .run(price, priceUnit, ingredientId, supermarket);
    } else {
      database.prepare('INSERT INTO ingredient_prices (id, ingredient_id, supermarket, price, price_unit) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), ingredientId, supermarket, price, priceUnit);
    }
    return { success: true };
  });

  ipcMain.handle('prices:delete', (_e, id: string) => {
    db().prepare('DELETE FROM ingredient_prices WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('shopping:optimizeSupermarkets', (_e, weekStart: string) => {
    const database = db();
    const items = database.prepare(
      'SELECT sl.* FROM shopping_list sl WHERE sl.week_start = ?'
    ).all(weekStart) as any[];

    for (const item of items) {
      const prices = database.prepare(
        'SELECT supermarket, price, price_unit FROM ingredient_prices WHERE ingredient_id = ? ORDER BY price ASC'
      ).all(item.ingredient_id) as any[];

      if (prices.length === 0) continue;

      // Normalizar todos los precios a la misma base para encontrar el más barato
      let bestPrice = Infinity;
      let bestSupermarket = '';
      let bestUnitPrice = 0;
      let bestPriceUnit = '';

      for (const p of prices) {
        const normalized = p.price / normalizeToBaseUnit(1, p.price_unit || 'unidad');
        if (normalized < bestPrice) {
          bestPrice = normalized;
          bestSupermarket = p.supermarket;
          bestUnitPrice = p.price;
          bestPriceUnit = p.price_unit || 'unidad';
        }
      }

      // Calcular precio total: precio por unidad base × cantidad en unidad base
      const itemBaseQty = normalizeToBaseUnit(item.quantity_needed, item.unit);
      const pricePerBaseUnit = bestUnitPrice / normalizeToBaseUnit(1, bestPriceUnit);
      const totalPrice = Math.round(pricePerBaseUnit * itemBaseQty * 100) / 100;

      database.prepare('UPDATE shopping_list SET supermarket = ?, price = ? WHERE id = ?')
        .run(bestSupermarket, totalPrice > 0 ? totalPrice : null, item.id);
    }

    return database.prepare(
      'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.week_start = ? ORDER BY sl.supermarket, i.name'
    ).all(weekStart);
  });

  // ==================== SHOPPING LIST ====================
  ipcMain.handle('shopping:generate', (_e, weekStart: string) => {
    const database = db();

    // Preserve purchased state for existing items
    const previouslyPurchased: Record<string, boolean> = {};
    const existingItems = database.prepare(
      'SELECT ingredient_id, purchased FROM shopping_list WHERE week_start = ?'
    ).all(weekStart) as any[];
    for (const item of existingItems) {
      if (item.purchased) {
        previouslyPurchased[item.ingredient_id] = true;
      }
    }

    database.prepare('DELETE FROM shopping_list WHERE week_start = ?').run(weekStart);

    const mealPlans = database.prepare(
      'SELECT mp.*, r.base_servings FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.date >= ? AND mp.date < date(?, \'+7 days\')'
    ).all(weekStart, weekStart) as any[];

    const aggregated: Record<string, { ingredient_id: string; name: string; quantity: number; unit: string; category: string }> = {};

    for (const mp of mealPlans) {
      const scale = mp.servings / (mp.base_servings || 1);
      const ingredients = database.prepare(
        'SELECT ri.*, i.name, i.category FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE ri.recipe_id = ?'
      ).all(mp.recipe_id) as any[];

      for (const ing of ingredients) {
        const key = ing.ingredient_id;
        if (aggregated[key]) {
          aggregated[key].quantity += ing.quantity * scale;
        } else {
          aggregated[key] = {
            ingredient_id: ing.ingredient_id,
            name: ing.name,
            quantity: ing.quantity * scale,
            unit: ing.unit,
            category: ing.category,
          };
        }
      }
    }

    const insertStmt = database.prepare(
      'INSERT INTO shopping_list (id, ingredient_id, quantity_needed, unit, category, purchased, week_start) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const transaction = database.transaction(() => {
      for (const key of Object.keys(aggregated)) {
        const item = aggregated[key];
        const pantryItem = database.prepare('SELECT quantity, unit FROM pantry WHERE ingredient_id = ?').get(item.ingredient_id) as any;

        const neededBase = normalizeToBaseUnit(item.quantity, item.unit);
        const pantryBase = pantryItem ? normalizeToBaseUnit(pantryItem.quantity, pantryItem.unit) : 0;
        const needed = Math.max(0, neededBase - pantryBase);
        const basePerDisplayUnit = normalizeToBaseUnit(1, item.unit);
        const displayQty = basePerDisplayUnit > 1 ? Math.ceil(needed / basePerDisplayUnit * 100) / 100 : Math.ceil(needed * 100) / 100;

        if (displayQty > 0) {
          const purchased = previouslyPurchased[item.ingredient_id] ? 1 : 0;
          insertStmt.run(uuidv4(), item.ingredient_id, displayQty, item.unit, item.category, purchased, weekStart);
        }
      }
    });

    transaction();

    return database.prepare(
      'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.week_start = ? ORDER BY sl.category, i.name'
    ).all(weekStart);
  });

  ipcMain.handle('shopping:get', (_e, weekStart: string) => {
    return db().prepare(
      'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.week_start = ? ORDER BY sl.category, i.name'
    ).all(weekStart);
  });

  ipcMain.handle('shopping:toggle', (_e, id: string) => {
    const item = db().prepare('SELECT purchased FROM shopping_list WHERE id = ?').get(id) as any;
    if (item) {
      db().prepare('UPDATE shopping_list SET purchased = ? WHERE id = ?').run(item.purchased ? 0 : 1, id);
    }
    return { success: true };
  });

  ipcMain.handle('shopping:update', (_e, item: any) => {
    db().prepare('UPDATE shopping_list SET quantity_needed = ?, unit = ?, price = ?, supermarket = ? WHERE id = ?')
      .run(item.quantity_needed, item.unit, item.price ?? null, item.supermarket ?? null, item.id);
    return { success: true };
  });

  ipcMain.handle('shopping:delete', (_e, id: string) => {
    db().prepare('DELETE FROM shopping_list WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('shopping:updatePrice', (_e, id: string, price: number | null) => {
    db().prepare('UPDATE shopping_list SET price = ? WHERE id = ?').run(price, id);
    return { success: true };
  });

  ipcMain.handle('shopping:updateSupermarket', (_e, id: string, supermarket: string | null) => {
    db().prepare('UPDATE shopping_list SET supermarket = ? WHERE id = ?').run(supermarket || null, id);
    return { success: true };
  });

  ipcMain.handle('shopping:addManual', (_e, item: any) => {
    const database = db();
    let ingredientId = uuidv4();
    const existing = database.prepare('SELECT id FROM ingredients WHERE name = ?').get(item.ingredient_name) as any;
    if (existing) {
      ingredientId = existing.id;
    } else {
      database.prepare('INSERT INTO ingredients (id, name, default_unit, category) VALUES (?, ?, ?, ?)')
        .run(ingredientId, item.ingredient_name, item.unit, item.category);
    }

    const id = uuidv4();
    database.prepare('INSERT INTO shopping_list (id, ingredient_id, quantity_needed, unit, category, purchased, price, supermarket, week_start) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)')
      .run(id, ingredientId, item.quantity_needed, item.unit, item.category, item.price ?? null, item.supermarket ?? null, item.week_start);

    return database.prepare(
      'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.id = ?'
    ).get(id);
  });

  // ==================== PDF ====================
  ipcMain.handle('pdf:import', async (_e) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: 'Importar receta desde PDF',
      filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const filePath = result.filePaths[0];
    const dataBuffer = fs.readFileSync(filePath);
    const recipeData = await parsePdfRecipe(dataBuffer);

    return recipeData;
  });

  ipcMain.handle('pdf:exportRecipe', async (_e, recipeId: string) => {
    try {
      const database = db();
      const recipe = database.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId) as any;
      if (!recipe) return { error: 'Recipe not found' };

      recipe.ingredients = database.prepare(
        'SELECT ri.*, i.name as ingredient_name, i.category FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE ri.recipe_id = ?'
      ).all(recipeId);

      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No window' };

      const result = await dialog.showSaveDialog(win, {
        title: 'Exportar receta a PDF',
        defaultPath: `${recipe.title.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ ]/g, '')}.pdf`,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled || !result.filePath) return { cancelled: true };

      const pdfBuffer = await generateRecipePdf(recipe);
      fs.writeFileSync(result.filePath, pdfBuffer);

      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('pdf:exportShopping', async (_e, weekStart: string) => {
    try {
      const database = db();
      const items = database.prepare(
        'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.week_start = ? ORDER BY sl.category, i.name'
      ).all(weekStart) as any[];

      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No window' };

      const result = await dialog.showSaveDialog(win, {
        title: 'Exportar lista de la compra a PDF',
        defaultPath: `Lista_Compra_${weekStart}.pdf`,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled || !result.filePath) return { cancelled: true };

      const pdfBuffer = await generateShoppingListPdf(items, weekStart);
      fs.writeFileSync(result.filePath, pdfBuffer);

      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('pdf:printShopping', async (_e, weekStart: string) => {
    try {
      const database = db();
      const items = database.prepare(
        'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.week_start = ? ORDER BY sl.category, i.name'
      ).all(weekStart) as any[];

      const pdfBuffer = await generateShoppingListPdf(items, weekStart);
const tempPath = path.join(os.tmpdir(), `shopping_list_${weekStart}.pdf`);
      fs.writeFileSync(tempPath, pdfBuffer);

      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.webContents.print({ silent: false, printBackground: true });
      }

      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('pdf:exportMealPlan', async (_e, weekStart: string) => {
    try {
      const database = db();
      const meals = database.prepare(
        "SELECT mp.*, r.title as recipe_title FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.date >= ? AND mp.date < date(?, '+7 days') ORDER BY mp.date, mp.meal_type"
      ).all(weekStart, weekStart) as any[];

      const notes = database.prepare(
        "SELECT * FROM day_notes WHERE date >= ? AND date < date(?, '+7 days') ORDER BY date"
      ).all(weekStart, weekStart) as any[];

      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No window' };

      const result = await dialog.showSaveDialog(win, {
        title: 'Exportar calendario semanal a PDF',
        defaultPath: `Menu_Semanal_${weekStart}.pdf`,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled || !result.filePath) return { cancelled: true };

      const pdfBuffer = await generateMealPlanPdf(meals, notes, weekStart);
      fs.writeFileSync(result.filePath, pdfBuffer);

      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  // ==================== DOCX EXPORT ====================
  ipcMain.handle('docx:exportShopping', async (_e, weekStart: string) => {
    try {
      const database = db();
      const items = database.prepare(
        'SELECT sl.*, i.name as ingredient_name FROM shopping_list sl JOIN ingredients i ON sl.ingredient_id = i.id WHERE sl.week_start = ? ORDER BY sl.category, i.name'
      ).all(weekStart) as any[];

      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No window' };

      const result = await dialog.showSaveDialog(win, {
        title: 'Exportar lista de la compra a Word',
        defaultPath: `Lista_Compra_${weekStart}.docx`,
        filters: [{ name: 'Documento Word', extensions: ['docx'] }],
      });

      if (result.canceled || !result.filePath) return { cancelled: true };

      const docxBuffer = await generateShoppingListDocx(items, weekStart);
      fs.writeFileSync(result.filePath, docxBuffer);

      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  // ==================== STATS ====================
  ipcMain.handle('stats:getData', () => {
    const database = db();

    // Gasto semanal (últimas 8 semanas)
    const weeklySpending = database.prepare(`
      SELECT week_start, SUM(COALESCE(price, 0)) as total
      FROM shopping_list
      GROUP BY week_start
      ORDER BY week_start DESC
      LIMIT 8
    `).all();

    // Ingredientes más usados en meal plans (preparados)
    const topIngredients = database.prepare(`
      SELECT i.name, COUNT(*) as count
      FROM meal_plan mp
      JOIN recipe_ingredients ri ON mp.recipe_id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE mp.prepared = 1
      GROUP BY i.name
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Recetas más cocinadas (preparadas)
    const topRecipes = database.prepare(`
      SELECT r.title, COUNT(*) as count
      FROM meal_plan mp
      JOIN recipes r ON mp.recipe_id = r.id
      WHERE mp.prepared = 1
      GROUP BY r.title
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Desperdicio: ingredientes caducados sin usar (nunca en un meal plan preparado)
    const waste = database.prepare(`
      SELECT i.name, p.quantity, p.unit, p.expiry_date
      FROM pantry p
      JOIN ingredients i ON p.ingredient_id = i.id
      WHERE p.expiry_date IS NOT NULL
        AND p.expiry_date < date('now')
        AND p.quantity > 0
        AND p.ingredient_id NOT IN (
          SELECT DISTINCT ri.ingredient_id
          FROM meal_plan mp
          JOIN recipe_ingredients ri ON mp.recipe_id = ri.recipe_id
          WHERE mp.prepared = 1
        )
      ORDER BY p.expiry_date ASC
    `).all();

    // Total recetas en biblioteca
    const totalRecipes = database.prepare('SELECT COUNT(*) as c FROM recipes').get() as any;

    // Total comidas planificadas vs preparadas esta semana
    const thisWeek = database.prepare("SELECT date('now', 'weekday 1', '-7 days') as d").get() as any;
    const mealStats = database.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN prepared = 1 THEN 1 ELSE 0 END) as prepared_count
      FROM meal_plan
      WHERE date >= ? AND date < date(?, '+7 days')
    `).get(thisWeek.d, thisWeek.d) as any;

    return {
      weeklySpending,
      topIngredients,
      topRecipes,
      waste,
      totalRecipes: totalRecipes.c,
      mealStatsThisWeek: mealStats,
    };
  });

  // ==================== AI / OLLAMA ====================
  ipcMain.handle('ai:parseRecipe', async (_e, text: string) => {
    try {
      const result = await parseRecipeFromText(text);
      return result;
    } catch (err: any) {
      return { error: err.message || 'Error al conectar con Ollama' };
    }
  });

  ipcMain.handle('ai:suggestRecipes', async (_e, pantryText: string, libraryText: string) => {
    try {
      const result = await suggestRecipesFromPantry(pantryText, libraryText);
      return { text: result };
    } catch (err: any) {
      return { error: err.message || 'Error al conectar con Ollama' };
    }
  });

  ipcMain.handle('ai:generateMealPlan', async (_e, pantryText: string, libraryText: string, preferences: string) => {
    try {
      const result = await generateWeeklyMealPlan(pantryText, libraryText, preferences);
      return { text: result };
    } catch (err: any) {
      return { error: err.message || 'Error al conectar con Ollama' };
    }
  });

  ipcMain.handle('ai:chat', async (_e, message: string, context?: { pantry?: string; recipes?: string }) => {
    try {
      const text = await askChefAssistant(message, context);
      return { text };
    } catch (err: any) {
      return { error: err.message || 'Error al procesar la consulta con Ollama' };
    }
  });

  // ==================== BACKUP & RESTORE ====================
  ipcMain.handle('backup:export', async () => {
    try {
      const database = db();
      const backupData = {
        version: '1.1',
        exported_at: new Date().toISOString(),
        ingredients: database.prepare('SELECT * FROM ingredients').all(),
        recipes: database.prepare('SELECT * FROM recipes').all(),
        recipe_ingredients: database.prepare('SELECT * FROM recipe_ingredients').all(),
        pantry: database.prepare('SELECT * FROM pantry').all(),
        meal_plan: database.prepare('SELECT * FROM meal_plan').all(),
        shopping_list: database.prepare('SELECT * FROM shopping_list').all(),
        day_notes: database.prepare('SELECT * FROM day_notes').all(),
        ingredient_prices: database.prepare('SELECT * FROM ingredient_prices').all(),
      };

      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No window' };

      const dateStr = new Date().toISOString().split('T')[0];
      const result = await dialog.showSaveDialog(win, {
        title: 'Exportar copia de seguridad de StockChef',
        defaultPath: `StockChef_Backup_${dateStr}.json`,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePath) return { cancelled: true };

      fs.writeFileSync(result.filePath, JSON.stringify(backupData, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No window' };

      const result = await dialog.showOpenDialog(win, {
        title: 'Restaurar copia de seguridad de StockChef',
        filters: [{ name: 'JSON Backup', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) return { cancelled: true };

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (!data.ingredients || !data.recipes) {
        return { error: 'El archivo no contiene un formato de copia de seguridad válido de StockChef.' };
      }

      const database = db();
      const transaction = database.transaction(() => {
        // Limpiar tablas dependientes primero
        database.prepare('DELETE FROM recipe_ingredients').run();
        database.prepare('DELETE FROM meal_plan').run();
        database.prepare('DELETE FROM shopping_list').run();
        database.prepare('DELETE FROM ingredient_prices').run();
        database.prepare('DELETE FROM pantry').run();
        database.prepare('DELETE FROM recipes').run();
        database.prepare('DELETE FROM ingredients').run();
        database.prepare('DELETE FROM day_notes').run();

        // Insertar ingredients
        const insertIng = database.prepare('INSERT INTO ingredients (id, name, default_unit, category) VALUES (?, ?, ?, ?)');
        for (const ing of data.ingredients || []) {
          insertIng.run(ing.id, ing.name, ing.default_unit, ing.category);
        }

        // Insertar recipes
        const insertRecipe = database.prepare('INSERT INTO recipes (id, title, description, base_servings, prep_time, cook_time, difficulty, instructions, category, image_url, calories, protein, carbs, fat, sat_fat, fiber, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const r of data.recipes || []) {
          insertRecipe.run(r.id, r.title, r.description || '', r.base_servings || 4, r.prep_time || 15, r.cook_time || 30, r.difficulty || 'medium', r.instructions || '', r.category || 'General', r.image_url || null, r.calories ?? null, r.protein ?? null, r.carbs ?? null, r.fat ?? null, r.sat_fat ?? null, r.fiber ?? null, r.salt ?? null, r.created_at || new Date().toISOString(), r.updated_at || new Date().toISOString());
        }

        // Insertar recipe_ingredients
        const insertRI = database.prepare('INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?, ?)');
        for (const ri of data.recipe_ingredients || []) {
          insertRI.run(ri.id || uuidv4(), ri.recipe_id, ri.ingredient_id, ri.quantity, ri.unit);
        }

        // Insertar pantry
        const insertPantry = database.prepare('INSERT INTO pantry (id, ingredient_id, quantity, unit, category, location, min_stock, expiry_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const p of data.pantry || []) {
          insertPantry.run(p.id, p.ingredient_id, p.quantity, p.unit, p.category, p.location || 'despensa', p.min_stock || 0, p.expiry_date || null, p.updated_at || new Date().toISOString());
        }

        // Insertar meal_plan
        const insertMeal = database.prepare('INSERT INTO meal_plan (id, date, meal_type, recipe_id, servings, prepared, deducted_amounts) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const m of data.meal_plan || []) {
          insertMeal.run(m.id, m.date, m.meal_type, m.recipe_id, m.servings, m.prepared ? 1 : 0, m.deducted_amounts || null);
        }

        // Insertar shopping_list
        const insertShop = database.prepare('INSERT INTO shopping_list (id, ingredient_id, quantity_needed, unit, category, purchased, price, supermarket, week_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const s of data.shopping_list || []) {
          insertShop.run(s.id, s.ingredient_id, s.quantity_needed, s.unit, s.category, s.purchased ? 1 : 0, s.price ?? null, s.supermarket || null, s.week_start);
        }

        // Insertar day_notes
        const insertNote = database.prepare('INSERT INTO day_notes (id, date, note) VALUES (?, ?, ?)');
        for (const n of data.day_notes || []) {
          insertNote.run(n.id || uuidv4(), n.date, n.note || '');
        }

        // Insertar ingredient_prices
        const insertPrice = database.prepare('INSERT INTO ingredient_prices (id, ingredient_id, supermarket, price, price_unit, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
        for (const pr of data.ingredient_prices || []) {
          insertPrice.run(pr.id || uuidv4(), pr.ingredient_id, pr.supermarket, pr.price, pr.price_unit || 'unidad', pr.updated_at || new Date().toISOString());
        }
      });

      transaction();
      return { success: true, count: { recipes: (data.recipes || []).length, pantry: (data.pantry || []).length } };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  // ==================== DIALOG ====================
  ipcMain.handle('dialog:save', async (_e, options: any) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    return dialog.showSaveDialog(win, options);
  });
}


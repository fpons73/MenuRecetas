import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Recipes
  getRecipes: () => ipcRenderer.invoke('recipes:getAll'),
  getRecipe: (id: string) => ipcRenderer.invoke('recipes:get', id),
  createRecipe: (recipe: any) => ipcRenderer.invoke('recipes:create', recipe),
  updateRecipe: (recipe: any) => ipcRenderer.invoke('recipes:update', recipe),
  deleteRecipe: (id: string) => ipcRenderer.invoke('recipes:delete', id),
  getRecipesViability: () => ipcRenderer.invoke('recipes:viability'),

  // Ingredients
  getIngredients: () => ipcRenderer.invoke('ingredients:getAll'),
  getCategories: () => ipcRenderer.invoke('ingredients:categories'),

  // Pantry
  getPantry: () => ipcRenderer.invoke('pantry:getAll'),
  addPantryItem: (item: any) => ipcRenderer.invoke('pantry:add', item),
  updatePantryItem: (item: any) => ipcRenderer.invoke('pantry:update', item),
  deletePantryItem: (id: string) => ipcRenderer.invoke('pantry:delete', id),
  getExpiringItems: (days: number) => ipcRenderer.invoke('pantry:getExpiring', days),
  addLowStockToShopping: (weekStart: string) => ipcRenderer.invoke('pantry:addLowStockToShopping', weekStart),

  // Meal Plan
  getMealPlan: (weekStart: string) => ipcRenderer.invoke('mealplan:get', weekStart),
  addMealPlanEntry: (entry: any) => ipcRenderer.invoke('mealplan:add', entry),
  updateMealPlanEntry: (entry: any) => ipcRenderer.invoke('mealplan:update', entry),
  deleteMealPlanEntry: (id: string) => ipcRenderer.invoke('mealplan:delete', id),
  markMealPrepared: (id: string) => ipcRenderer.invoke('mealplan:markPrepared', id),
  copyPreviousWeek: (weekStart: string) => ipcRenderer.invoke('mealplan:copyPreviousWeek', weekStart),

  // Day Notes
  getDayNotes: (weekStart: string) => ipcRenderer.invoke('daynotes:getAll', weekStart),
  saveDayNote: (date: string, note: string) => ipcRenderer.invoke('daynotes:save', date, note),

  // Prices
  getAllPrices: () => ipcRenderer.invoke('prices:getAll'),
  getPricesForIngredient: (ingredientId: string) => ipcRenderer.invoke('prices:getForIngredient', ingredientId),
  savePrice: (ingredientId: string, supermarket: string, price: number, priceUnit: string) => ipcRenderer.invoke('prices:save', ingredientId, supermarket, price, priceUnit),
  deletePrice: (id: string) => ipcRenderer.invoke('prices:delete', id),
  optimizeSupermarkets: (weekStart: string) => ipcRenderer.invoke('shopping:optimizeSupermarkets', weekStart),

  // Stats
  getStats: () => ipcRenderer.invoke('stats:getData'),

  // AI / Ollama
  aiParseRecipe: (text: string) => ipcRenderer.invoke('ai:parseRecipe', text),
  aiSuggestRecipes: (pantry: string, library: string) => ipcRenderer.invoke('ai:suggestRecipes', pantry, library),
  aiGenerateMealPlan: (pantry: string, library: string, prefs: string) => ipcRenderer.invoke('ai:generateMealPlan', pantry, library, prefs),
  aiChat: (message: string, context?: { pantry?: string; recipes?: string }) => ipcRenderer.invoke('ai:chat', message, context),

  // Backup & Restore
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),

  // Shopping List
  generateShoppingList: (weekStart: string) => ipcRenderer.invoke('shopping:generate', weekStart),
  getShoppingList: (weekStart: string) => ipcRenderer.invoke('shopping:get', weekStart),
  toggleShoppingItem: (id: string) => ipcRenderer.invoke('shopping:toggle', id),
  updateShoppingItem: (item: any) => ipcRenderer.invoke('shopping:update', item),
  deleteShoppingItem: (id: string) => ipcRenderer.invoke('shopping:delete', id),
  addManualShoppingItem: (item: any) => ipcRenderer.invoke('shopping:addManual', item),
  updateShoppingPrice: (id: string, price: number | null) => ipcRenderer.invoke('shopping:updatePrice', id, price),
  updateShoppingSupermarket: (id: string, supermarket: string | null) => ipcRenderer.invoke('shopping:updateSupermarket', id, supermarket),

  // PDF
  importPdfRecipe: () => ipcRenderer.invoke('pdf:import'),
  exportRecipePdf: (recipeId: string) => ipcRenderer.invoke('pdf:exportRecipe', recipeId),
  exportShoppingListPdf: (weekStart: string) => ipcRenderer.invoke('pdf:exportShopping', weekStart),
  exportMealPlanPdf: (weekStart: string) => ipcRenderer.invoke('pdf:exportMealPlan', weekStart),
  printShoppingList: (weekStart: string) => ipcRenderer.invoke('pdf:printShopping', weekStart),

  // DOCX
  exportShoppingListDocx: (weekStart: string) => ipcRenderer.invoke('docx:exportShopping', weekStart),

  // Dialog
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
};

contextBridge.exposeInMainWorld('midweek', api);

export type MidweekApi = typeof api;

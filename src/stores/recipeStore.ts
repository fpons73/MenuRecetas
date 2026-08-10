import { create } from 'zustand';
import { Recipe, RecipeIngredient, RecipeViability } from '../types';

declare global {
  interface Window {
    midweek: {
      getRecipes: () => Promise<Recipe[]>;
      getRecipe: (id: string) => Promise<Recipe>;
      createRecipe: (recipe: any) => Promise<Recipe>;
      updateRecipe: (recipe: any) => Promise<Recipe>;
      deleteRecipe: (id: string) => Promise<any>;
      getRecipesViability: () => Promise<RecipeViability[]>;
      getIngredients: () => Promise<any[]>;
      getCategories: () => Promise<string[]>;
      getPantry: () => Promise<any[]>;
      addPantryItem: (item: any) => Promise<any>;
      updatePantryItem: (item: any) => Promise<any>;
      deletePantryItem: (id: string) => Promise<any>;
      getExpiringItems: (days: number) => Promise<any[]>;
      getMealPlan: (weekStart: string) => Promise<any[]>;
      addMealPlanEntry: (entry: any) => Promise<any>;
      updateMealPlanEntry: (entry: any) => Promise<any>;
      deleteMealPlanEntry: (id: string) => Promise<any>;
      markMealPrepared: (id: string) => Promise<any>;
      copyPreviousWeek: (weekStart: string) => Promise<any>;
      getDayNotes: (weekStart: string) => Promise<any[]>;
      saveDayNote: (date: string, note: string) => Promise<any>;
      getAllPrices: () => Promise<any[]>;
      getPricesForIngredient: (ingredientId: string) => Promise<any[]>;
      savePrice: (ingredientId: string, supermarket: string, price: number, priceUnit: string) => Promise<any>;
      deletePrice: (id: string) => Promise<any>;
      optimizeSupermarkets: (weekStart: string) => Promise<any[]>;
      getStats: () => Promise<any>;
      aiParseRecipe: (text: string) => Promise<any>;
      aiSuggestRecipes: (pantry: string, library: string) => Promise<any>;
      aiGenerateMealPlan: (pantry: string, library: string, prefs: string) => Promise<any>;
      generateShoppingList: (weekStart: string) => Promise<any[]>;
      getShoppingList: (weekStart: string) => Promise<any[]>;
      toggleShoppingItem: (id: string) => Promise<any>;
      updateShoppingItem: (item: any) => Promise<any>;
      deleteShoppingItem: (id: string) => Promise<any>;
      addManualShoppingItem: (item: any) => Promise<any>;
      updateShoppingPrice: (id: string, price: number | null) => Promise<any>;
      updateShoppingSupermarket: (id: string, supermarket: string | null) => Promise<any>;
      importPdfRecipe: () => Promise<any>;
      exportRecipePdf: (recipeId: string) => Promise<any>;
      exportShoppingListPdf: (weekStart: string) => Promise<any>;
      exportMealPlanPdf: (weekStart: string) => Promise<any>;
      exportShoppingListDocx: (weekStart: string) => Promise<any>;
      printShoppingList: (weekStart: string) => Promise<any>;
    };
  }
}

interface RecipeStore {
  recipes: Recipe[];
  viability: RecipeViability[];
  selectedRecipe: Recipe | null;
  loading: boolean;
  searchTerm: string;
  filterMode: 'all' | 'available' | 'missing';
  categoryFilter: string;
  loadRecipes: () => Promise<void>;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  setSearchTerm: (term: string) => void;
  setFilterMode: (mode: 'all' | 'available' | 'missing') => void;
  setCategoryFilter: (cat: string) => void;
  getFilteredRecipes: () => RecipeViability[];
  createRecipe: (recipe: any) => Promise<Recipe>;
  updateRecipe: (recipe: any) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  loadViability: () => Promise<void>;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  viability: [],
  selectedRecipe: null,
  loading: false,
  searchTerm: '',
  filterMode: 'all',
  categoryFilter: '',

  loadRecipes: async () => {
    set({ loading: true });
    try {
      const recipes = await window.midweek.getRecipes();
      set({ recipes });
    } finally {
      set({ loading: false });
    }
  },

  setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setFilterMode: (mode) => set({ filterMode: mode }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),

  getFilteredRecipes: () => {
    const { viability, searchTerm, filterMode, categoryFilter } = get();
    let filtered = viability;

    if (categoryFilter) {
      filtered = filtered.filter(v => v.recipe.category === categoryFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.recipe.title.toLowerCase().includes(lower) ||
        v.recipe.category.toLowerCase().includes(lower) ||
        (v.recipe.ingredients || []).some(i => (i.ingredient_name || '').toLowerCase().includes(lower))
      );
    }

    if (filterMode === 'available') {
      filtered = filtered.filter(v => v.missing_count === 0);
    } else if (filterMode === 'missing') {
      filtered = filtered.filter(v => v.missing_count > 0);
    }

    return filtered;
  },

  createRecipe: async (recipeData) => {
    const recipe = await window.midweek.createRecipe(recipeData);
    await get().loadRecipes();
    return recipe;
  },

  updateRecipe: async (recipeData) => {
    const recipe = await window.midweek.updateRecipe(recipeData);
    await get().loadRecipes();
    set({ selectedRecipe: null });
    return recipe;
  },

  deleteRecipe: async (id) => {
    await window.midweek.deleteRecipe(id);
    await get().loadRecipes();
    set({ selectedRecipe: null });
  },

  loadViability: async () => {
    const viability = await window.midweek.getRecipesViability();
    set({ viability });
  },
}));

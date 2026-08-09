import { create } from 'zustand';
import { PantryItem } from '../types';

interface PantryStore {
  items: PantryItem[];
  categories: string[];
  loading: boolean;
  loadPantry: () => Promise<void>;
  loadCategories: () => Promise<void>;
  addItem: (item: any) => Promise<void>;
  updateItem: (item: any) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const usePantryStore = create<PantryStore>((set, get) => ({
  items: [],
  categories: [],
  loading: false,

  loadPantry: async () => {
    set({ loading: true });
    try {
      const items = await window.midweek.getPantry();
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  loadCategories: async () => {
    const categories = await window.midweek.getCategories();
    set({ categories });
  },

  addItem: async (item) => {
    await window.midweek.addPantryItem(item);
    await get().loadPantry();
  },

  updateItem: async (item) => {
    await window.midweek.updatePantryItem(item);
    await get().loadPantry();
  },

  deleteItem: async (id) => {
    await window.midweek.deletePantryItem(id);
    await get().loadPantry();
  },
}));

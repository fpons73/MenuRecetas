import { create } from 'zustand';
import { ShoppingItem } from '../types';

interface ShoppingStore {
  items: ShoppingItem[];
  weekStart: string;
  loading: boolean;
  generate: (weekStart: string) => Promise<void>;
  loadItems: (weekStart: string) => Promise<ShoppingItem[]>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (item: any) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getGrouped: () => Record<string, ShoppingItem[]>;
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  weekStart: '',
  loading: false,

  generate: async (weekStart: string) => {
    set({ loading: true, weekStart });
    try {
      const items = await window.midweek.generateShoppingList(weekStart);
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  loadItems: async (weekStart: string) => {
    const items = await window.midweek.getShoppingList(weekStart);
    set({ items, weekStart });
    return items;
  },

  toggleItem: async (id: string) => {
    await window.midweek.toggleShoppingItem(id);
    const { items } = get();
    set({
      items: items.map(i => (i.id === id ? { ...i, purchased: !i.purchased } : i)),
    });
  },

  updateItem: async (itemData: any) => {
    const result = await window.midweek.updateShoppingItem(itemData);
    const { items } = get();
    set({
      items: items.map(i =>
        i.id === itemData.id ? { ...i, quantity_needed: itemData.quantity_needed, unit: itemData.unit, price: itemData.price, supermarket: itemData.supermarket } : i
      ),
    });
    return result;
  },

  deleteItem: async (id: string) => {
    await window.midweek.deleteShoppingItem(id);
    const { items } = get();
    set({ items: items.filter(i => i.id !== id) });
  },

  getGrouped: () => {
    const { items } = get();
    const grouped: Record<string, ShoppingItem[]> = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    return grouped;
  },
}));

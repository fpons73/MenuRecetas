import { create } from 'zustand';
import { MealPlanEntry, MealType } from '../types';

interface CalendarStore {
  entries: MealPlanEntry[];
  weekStart: string;
  loading: boolean;
  selectedDate: string | null;
  loadEntries: (weekStart: string) => Promise<void>;
  setWeekStart: (date: string) => void;
  addEntry: (entry: { date: string; meal_type: MealType; recipe_id: string; servings: number }) => Promise<boolean>;
  updateEntry: (entry: MealPlanEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  markPrepared: (id: string) => Promise<boolean>;
  moveEntry: (entryId: string, newDate: string, newMealType: MealType) => Promise<void>;
  clearDate: (date: string, meal_type: MealType) => Promise<void>;
}

import { fmtDate } from '../utils';

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return fmtDate(date);
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  entries: [],
  weekStart: getMonday(new Date()),
  loading: false,
  selectedDate: null,

  loadEntries: async (weekStart: string) => {
    set({ loading: true, weekStart });
    try {
      const entries = await window.midweek.getMealPlan(weekStart);
      set({ entries });
    } finally {
      set({ loading: false });
    }
  },

  setWeekStart: (date: string) => {
    set({ weekStart: date });
  },

  addEntry: async (entry) => {
    try {
      const result = await window.midweek.addMealPlanEntry({
        ...entry,
        prepared: false,
      });
      if (result.error) {
        alert(result.error);
        return false;
      }
      await get().loadEntries(get().weekStart);
      return true;
    } catch {
      return false;
    }
  },

  updateEntry: async (entry) => {
    await window.midweek.updateMealPlanEntry(entry);
    await get().loadEntries(get().weekStart);
  },

  deleteEntry: async (id: string) => {
    await window.midweek.deleteMealPlanEntry(id);
    await get().loadEntries(get().weekStart);
  },

  markPrepared: async (id: string) => {
    const result = await window.midweek.markMealPrepared(id);
    if (result.error) {
      alert(result.error);
      return false;
    }
    await get().loadEntries(get().weekStart);
    return true;
  },

  moveEntry: async (entryId: string, newDate: string, newMealType: MealType) => {
    const { entries } = get();
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const existingInSlot = entries.find(e => e.date === newDate && e.meal_type === newMealType && e.id !== entryId);
    if (existingInSlot) {
      await window.midweek.deleteMealPlanEntry(existingInSlot.id);
    }

    await window.midweek.updateMealPlanEntry({
      ...entry,
      date: newDate,
      meal_type: newMealType,
    });
    await get().loadEntries(get().weekStart);
  },

  clearDate: async (date: string, meal_type: MealType) => {
    const { entries } = get();
    const entry = entries.find(e => e.date === date && e.meal_type === meal_type);
    if (entry) {
      await window.midweek.deleteMealPlanEntry(entry.id);
      await get().loadEntries(get().weekStart);
    }
  },
}));

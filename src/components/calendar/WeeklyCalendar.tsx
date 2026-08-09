import React, { useEffect, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useCalendarStore } from '../../stores/calendarStore';
import { useRecipeStore } from '../../stores/recipeStore';
import { usePantryStore } from '../../stores/pantryStore';
import { DAYS_OF_WEEK, MEAL_TYPE_LABELS, MealType, MEAL_TYPES, Recipe, MealPlanEntry } from '../../types';
import { fmtDate } from '../../utils';
import MealSlot from './MealSlot';
import MealCard from './MealCard';
import RecipeListPanel from './RecipeListPanel';

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return fmtDate(date);
}

function getDateFromMonday(monday: string, offset: number): string {
  const d = new Date(monday + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return fmtDate(d);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

interface DragData {
  type: 'recipe' | 'meal';
  recipeId?: string;
  entryId?: string;
  sourceDate?: string;
  sourceMealType?: MealType;
}

const WeeklyCalendar: React.FC = () => {
  const {
    entries, weekStart, loading,
    loadEntries, addEntry, deleteEntry, moveEntry, updateEntry, markPrepared,
    setWeekStart,
  } = useCalendarStore();

  const { recipes, viability, loadRecipes, loadViability } = useRecipeStore();
  const { loadPantry } = usePantryStore();

  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [showRecipePanel, setShowRecipePanel] = useState(false);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [editingNoteDate, setEditingNoteDate] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const recipeMap = useRecipeStore(s => s.recipes);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    loadRecipes();
    loadViability();
    loadPantry();
  }, []);

  useEffect(() => {
    loadEntries(weekStart);
    loadDayNotes(weekStart);
  }, [weekStart]);

  const loadDayNotes = async (ws: string) => {
    try {
      const notes = await window.midweek.getDayNotes(ws);
      const map: Record<string, string> = {};
      for (const n of notes) { map[n.date] = n.note || ''; }
      setDayNotes(map);
    } catch { /* preload may not be ready */ }
  };

  const saveNote = async (date: string, text: string) => {
    await window.midweek.saveDayNote(date, text);
    setDayNotes(prev => ({ ...prev, [date]: text }));
    setEditingNoteDate(null);
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => getDateFromMonday(weekStart, i));

  const getEntryFor = useCallback((date: string, mealType: MealType): MealPlanEntry | undefined => {
    return entries.find(e => e.date === date && e.meal_type === mealType);
  }, [entries]);

  const handleAddRecipe = async (date: string, mealType: MealType, recipe: Recipe) => {
    await addEntry({
      date,
      meal_type: mealType,
      recipe_id: recipe.id,
      servings: recipe.base_servings,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    setActiveDrag(data || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as DragData | undefined;
    if (!dragData) return;

    if (dragData.type === 'recipe') {
      if (dragData.recipeId && over.data.current) {
        const target = over.data.current as { date: string; mealType: MealType };
        const recipe = recipes.find(r => r.id === dragData.recipeId);
        if (recipe) {
          handleAddRecipe(target.date, target.mealType, recipe);
        }
      }
    } else if (dragData.type === 'meal') {
      if (dragData.entryId && over.data.current) {
        const target = over.data.current as { date: string; mealType: MealType };
        if (dragData.sourceDate === target.date && dragData.sourceMealType === target.mealType) return;
        moveEntry(dragData.entryId, target.date, target.mealType);
      }
    }
  };

  const handlePrevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(fmtDate(d));
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(fmtDate(d));
  };

  const handleMarkPrepared = async (entryId: string) => {
    const success = await markPrepared(entryId);
    if (success) {
      await loadPantry();
    }
  };

  const handleDuplicate = async (entry: MealPlanEntry) => {
    const nextDay = new Date(entry.date + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const newDate = fmtDate(nextDay);
    await addEntry({
      date: newDate,
      meal_type: entry.meal_type,
      recipe_id: entry.recipe_id,
      servings: entry.servings,
    });
  };

  const handleChangeServings = async (entry: MealPlanEntry, newServings: number) => {
    await updateEntry({ ...entry, servings: newServings });
  };

  const handleCopyPreviousWeek = async () => {
    await window.midweek.copyPreviousWeek(weekStart);
    await loadEntries(weekStart);
  };

  const handleExportMealPlanPdf = async () => {
    try {
      const result = await window.midweek.exportMealPlanPdf(weekStart);
      if (result.error) alert(result.error);
    } catch (err) {
      console.error('Error exporting meal plan PDF:', err);
    }
  };

  const handleDeleteWithPantryRefresh = async (id: string) => {
    await deleteEntry(id);
    await loadPantry();
  };

  const draggedRecipe = activeDrag?.type === 'recipe'
    ? recipes.find(r => r.id === activeDrag.recipeId)
    : null;

  const draggedEntry = activeDrag?.type === 'meal'
    ? entries.find(e => e.id === activeDrag.entryId)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-surface-900">Calendario Semanal</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRecipePanel(!showRecipePanel)} className="btn-secondary text-xs">
                {showRecipePanel ? 'Ocultar recetas' : 'Mostrar recetas'}
              </button>
              <button onClick={handleCopyPreviousWeek} className="btn-secondary text-xs" title="Copiar menú de la semana anterior">
                📋 Copiar semana ant.
              </button>
              <button onClick={handleExportMealPlanPdf} className="btn-secondary text-xs" title="Exportar menú a PDF">
                📥 Exportar PDF
              </button>
              <button onClick={handlePrevWeek} className="btn-ghost text-xs">←</button>
              <span className="text-sm font-medium text-surface-700">
                {formatDate(weekStart)}
              </span>
              <button onClick={handleNextWeek} className="btn-ghost text-xs">→</button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full h-full border-collapse">
              <thead>
                <tr className="bg-surface-50">
                  <th className="w-20 p-2 text-xs text-surface-400 font-medium border-b border-surface-200"></th>
                  {weekDates.map((date, i) => {
                    const isToday = date === fmtDate(new Date());
                    return (
                      <th key={date} className={`p-2 border-b border-surface-200 text-center ${isToday ? 'bg-primary-50' : ''}`}>
                        <p className="text-sm font-semibold text-surface-900">{DAYS_OF_WEEK[i]}</p>
                        <p className={`text-xs ${isToday ? 'text-primary-700 font-bold' : 'text-surface-400'}`}>
                          {formatDate(date)}
                        </p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(mealType => (
                  <tr key={mealType}>
                    <td className="p-2 border-b border-surface-100 bg-surface-50">
                      <p className="text-xs font-medium text-surface-500 text-center writing-mode-vertical">
                        {MEAL_TYPE_LABELS[mealType]}
                      </p>
                    </td>
                    {weekDates.map(date => {
                      const entry = getEntryFor(date, mealType);
                      return (
                        <td key={`${date}-${mealType}`} className="border-b border-r border-surface-100 p-1.5 align-top">
                          <MealSlot
                            date={date}
                            mealType={mealType}
                            entry={entry}
                            onMarkPrepared={handleMarkPrepared}
                            onDelete={handleDeleteWithPantryRefresh}
                            onDuplicate={handleDuplicate}
                            onChangeServings={handleChangeServings}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="p-2 border-b border-surface-100 bg-surface-50">
                    <p className="text-xs font-medium text-surface-500 text-center">Notas</p>
                  </td>
                  {weekDates.map(date => (
                    <td key={`note-${date}`} className="border-b border-r border-surface-100 p-1.5 align-top">
                      {editingNoteDate === date ? (
                        <div className="flex gap-0.5">
                          <input
                            type="text"
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(date, noteText); if (e.key === 'Escape') setEditingNoteDate(null); }}
                            className="input-field text-[10px] flex-1"
                            placeholder="Nota..."
                            autoFocus
                          />
                          <button onClick={() => saveNote(date, noteText)} className="text-[10px] text-primary-600">✓</button>
                          <button onClick={() => setEditingNoteDate(null)} className="text-[10px] text-surface-400">✕</button>
                        </div>
                      ) : (
                        <div
                          className="min-h-[24px] cursor-text"
                          onClick={() => { setEditingNoteDate(date); setNoteText(dayNotes[date] || ''); }}
                        >
                          <p className="text-[10px] text-surface-500 italic leading-relaxed">
                            {dayNotes[date] || '+ nota'}
                          </p>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {(() => {
              let totalCal = 0, totalProt = 0, totalCarbs = 0;
              let hasAny = false;
              for (const entry of entries) {
                const recipe = recipeMap.find(r => r.id === entry.recipe_id);
                if (recipe && (recipe.calories || recipe.protein || recipe.carbs)) {
                  hasAny = true;
                  const scale = entry.servings / (recipe.base_servings || 1);
                  if (recipe.calories) totalCal += recipe.calories * scale;
                  if (recipe.protein) totalProt += recipe.protein * scale;
                  if (recipe.carbs) totalCarbs += recipe.carbs * scale;
                }
              }
              if (!hasAny) return null;
              return (
                <div className="mt-2 px-2 py-1.5 bg-amber-50 rounded border border-amber-200 flex items-center gap-4 text-xs">
                  <span className="font-semibold text-amber-800">Total semanal:</span>
                  {totalCal > 0 && <span className="text-amber-700">{Math.round(totalCal)} kcal</span>}
                  {totalProt > 0 && <span className="text-amber-700">{Math.round(totalProt)}g proteínas</span>}
                  {totalCarbs > 0 && <span className="text-amber-700">{Math.round(totalCarbs)}g carbohidratos</span>}
                </div>
              );
            })()}
          </div>

          {showRecipePanel && (
            <RecipeListPanel
              recipes={recipes}
              viability={viability}
              onClose={() => setShowRecipePanel(false)}
            />
          )}
        </div>
      </div>

      <DragOverlay>
        {draggedRecipe && (
          <MealCard
            title={draggedRecipe.title}
            prepared={false}
            isDragOverlay
          />
        )}
        {draggedEntry && !activeDrag?.type?.includes('recipe') && (
          <MealCard
            title={draggedEntry.recipe_title || 'Comida'}
            prepared={draggedEntry.prepared}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default WeeklyCalendar;

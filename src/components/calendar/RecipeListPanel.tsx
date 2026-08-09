import React, { useState, useEffect, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { usePantryStore } from '../../stores/pantryStore';
import { Recipe, RecipeViability, PantryItem } from '../../types';

interface RecipeListPanelProps {
  recipes: Recipe[];
  viability: RecipeViability[];
  onClose: () => void;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const RecipeListPanel: React.FC<RecipeListPanelProps> = ({ recipes, viability, onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const pantryItems = usePantryStore(s => s.items);
  const loadPantry = usePantryStore(s => s.loadPantry);

  useEffect(() => { loadPantry(); }, []);

  const viabilityMap = useMemo(() => new Map(viability.map(v => [v.recipe.id, v])), [viability]);

  const ingredientExpiryMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const item of pantryItems) {
      if (!map[item.ingredient_name] || !item.expiry_date || (map[item.ingredient_name] && item.expiry_date && item.expiry_date < (map[item.ingredient_name] || ''))) {
        map[item.ingredient_name] = item.expiry_date;
      }
    }
    return map;
  }, [pantryItems]);

  const filteredAndSorted = useMemo(() => {
    let result = recipes.filter(r => {
      if (!search) return true;
      const lower = search.toLowerCase();
      return r.title.toLowerCase().includes(lower) || r.category.toLowerCase().includes(lower);
    });

    if (selectedIngredient) {
      result = result.filter(r => {
        const ings = viabilityMap.get(r.id)?.recipe?.ingredients || r.ingredients || [];
        return ings.some((ing: any) => (ing.ingredient_name || ing.name) === selectedIngredient);
      });
    }

    result = result.sort((a, b) => {
      const aV = viabilityMap.get(a.id);
      const bV = viabilityMap.get(b.id);
      const aIngs = aV?.recipe?.ingredients || a.ingredients || [];
      const bIngs = bV?.recipe?.ingredients || b.ingredients || [];

      if (selectedIngredient) {
        const aExpiry = ingredientExpiryMap[selectedIngredient];
        const bExpiry = ingredientExpiryMap[selectedIngredient];
        if (aExpiry && bExpiry && aExpiry !== bExpiry) return aExpiry < bExpiry ? -1 : 1;
        return a.title.localeCompare(b.title);
      }

      const aMinDays = Math.min(...aIngs.map((ing: any) => daysUntil(ingredientExpiryMap[ing.ingredient_name || ing.name]) ?? 999));
      const bMinDays = Math.min(...bIngs.map((ing: any) => daysUntil(ingredientExpiryMap[ing.ingredient_name || ing.name]) ?? 999));

      if (aMinDays !== bMinDays) return aMinDays - bMinDays;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [recipes, search, selectedIngredient, viabilityMap, ingredientExpiryMap]);

  return (
    <div className="w-64 border-l border-surface-200 bg-white overflow-y-auto shrink-0 flex flex-col">
      <div className="p-3 border-b border-surface-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-surface-800">Recetas</h3>
          <button onClick={onClose} className="text-xs text-surface-400 hover:text-surface-600">✕</button>
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field text-xs"
        />
        <select
          value={selectedIngredient}
          onChange={e => setSelectedIngredient(e.target.value)}
          className="input-field text-xs mt-2"
        >
          <option value="">Todos los ingredientes</option>
          {pantryItems
            .filter((p, i, arr) => arr.findIndex(x => x.ingredient_name === p.ingredient_name) === i)
            .sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
            .map(p => {
              const d = daysUntil(p.expiry_date);
              return (
                <option key={p.ingredient_name} value={p.ingredient_name}>
                  {p.ingredient_name}{d !== null ? ` (${d <= 0 ? 'caducado' : d + 'd'})` : ''}
                </option>
              );
            })}
        </select>
        <p className="text-xs text-surface-400 mt-1.5">Arrastra una receta al calendario</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredAndSorted.map(recipe => (
          <DraggableRecipeCard
            key={recipe.id}
            recipe={recipe}
            viability={viabilityMap.get(recipe.id)}
            earliestExpiry={
              selectedIngredient
                ? ingredientExpiryMap[selectedIngredient]
                : null
            }
          />
        ))}
      </div>
    </div>
  );
};

interface DraggableRecipeCardProps {
  recipe: Recipe;
  viability?: RecipeViability;
  earliestExpiry?: string | null;
}

const DraggableRecipeCard: React.FC<DraggableRecipeCardProps> = ({ recipe, viability, earliestExpiry }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: 'recipe', recipeId: recipe.id },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const isAvailable = viability?.missing_count === 0;
  const dLeft = earliestExpiry ? daysUntil(earliestExpiry) : null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`p-2 rounded-lg cursor-grab active:cursor-grabbing border transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${
        isAvailable
          ? 'border-green-200 bg-green-50 hover:border-green-300'
          : 'border-surface-200 bg-white hover:border-surface-300'
      }`}
    >
      <p className="text-xs font-medium text-surface-800 truncate">{recipe.title}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-surface-400">{recipe.category}</span>
        <div className="flex items-center gap-1">
          {dLeft !== null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              dLeft !== null && dLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {dLeft !== null && dLeft <= 0 ? 'caducado' : `${dLeft}d`}
            </span>
          )}
          {viability && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isAvailable
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isAvailable ? '✓' : `-${viability.missing_count}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeListPanel;

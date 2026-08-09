import React from 'react';
import { Recipe } from '../../types';
import { DIFFICULTY_LABELS } from '../../types';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onDelete: () => void;
  onExportPdf: () => void;
  onEdit: () => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onClose, onDelete, onExportPdf, onEdit }) => {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="btn-ghost text-xs">← Volver</button>
        <div className="flex gap-1">
          <button onClick={onEdit} className="btn-ghost text-xs" title="Editar">✏️</button>
          <button onClick={onExportPdf} className="btn-ghost text-xs" title="Exportar PDF">📥</button>
          <button onClick={onDelete} className="btn-ghost text-xs text-red-500" title="Eliminar">🗑️</button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-surface-900 mb-1">{recipe.title}</h2>
      <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{recipe.category}</span>

      <p className="text-sm text-surface-600 mt-3">{recipe.description}</p>

      <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-surface-50 rounded-lg">
        <div><span className="text-xs text-surface-400">Raciones base</span><p className="text-sm font-medium">{recipe.base_servings}</p></div>
        <div><span className="text-xs text-surface-400">Preparación</span><p className="text-sm font-medium">{recipe.prep_time} min</p></div>
        <div><span className="text-xs text-surface-400">Cocción</span><p className="text-sm font-medium">{recipe.cook_time} min</p></div>
        <div><span className="text-xs text-surface-400">Dificultad</span><p className="text-sm font-medium">{DIFFICULTY_LABELS[recipe.difficulty]}</p></div>
      </div>

      {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat || recipe.sat_fat || recipe.fiber || recipe.salt) && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="text-xs font-semibold text-amber-800 mb-2">Información nutricional (por ración)</h3>
          <div className="grid grid-cols-4 gap-2">
            {recipe.calories != null && <div><span className="text-[10px] text-amber-600">Calorías</span><p className="text-xs font-bold text-amber-900">{recipe.calories} kcal</p></div>}
            {recipe.protein != null && <div><span className="text-[10px] text-amber-600">Proteínas</span><p className="text-xs font-bold text-amber-900">{recipe.protein} g</p></div>}
            {recipe.carbs != null && <div><span className="text-[10px] text-amber-600">Carbohidratos</span><p className="text-xs font-bold text-amber-900">{recipe.carbs} g</p></div>}
            {recipe.fat != null && <div><span className="text-[10px] text-amber-600">Grasas tot.</span><p className="text-xs font-bold text-amber-900">{recipe.fat} g</p></div>}
            {recipe.sat_fat != null && <div><span className="text-[10px] text-amber-600">Sat. grasas</span><p className="text-xs font-bold text-amber-900">{recipe.sat_fat} g</p></div>}
            {recipe.fiber != null && <div><span className="text-[10px] text-amber-600">Fibra</span><p className="text-xs font-bold text-amber-900">{recipe.fiber} g</p></div>}
            {recipe.salt != null && <div><span className="text-[10px] text-amber-600">Sal</span><p className="text-xs font-bold text-amber-900">{recipe.salt} g</p></div>}
          </div>
        </div>
      )}

      <h3 className="font-semibold text-sm text-surface-900 mt-5 mb-2">Ingredientes</h3>
      <ul className="space-y-1">
        {(recipe.ingredients || []).map((ing, idx) => (
          <li key={idx} className="flex justify-between text-sm text-surface-700 py-1 border-b border-surface-100">
            <span>{ing.ingredient_name || (ing as any).name}</span>
            <span className="text-surface-400">{ing.quantity} {ing.unit}</span>
          </li>
        ))}
      </ul>

      <h3 className="font-semibold text-sm text-surface-900 mt-5 mb-2">Preparación</h3>
      <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{recipe.instructions}</p>
    </div>
  );
};

export default RecipeDetail;

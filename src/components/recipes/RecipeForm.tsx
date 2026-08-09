import React, { useState } from 'react';
import { useRecipeStore } from '../../stores/recipeStore';
import { usePantryStore } from '../../stores/pantryStore';
import { DIFFICULTY_LABELS } from '../../types';
import { generateId } from '../../utils';

interface RecipeFormProps {
  onBack: () => void;
  editRecipe?: any;
}

interface IngredientField {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

const CATEGORIES = [
  'Desayuno', 'Ensalada', 'Sopa', 'Principal', 'Snack', 'Postre', 'General',
];

const INGREDIENT_CATEGORIES = [
  'Verduras', 'Frutas', 'Carnes', 'Pescados', 'Lácteos y huevos',
  'Pastas y cereales', 'Legumbres', 'Especias', 'Aceites y condimentos',
  'Frutos secos', 'Panadería', 'Congelados', 'Conservas y caldos', 'Repostería', 'Otros',
];

const UNITS = ['unidad', 'unidades', 'g', 'kg', 'ml', 'L', 'cucharada', 'cucharadita', 'taza', 'pizca', 'diente', 'dientes', 'filete', 'filetes', 'lomo', 'lomos', 'hoja', 'hojas', 'rama', 'ramas', 'rebanada', 'rebanadas', 'trozo', 'rodaja', 'lata', 'latas', 'cubos'];

const RecipeForm: React.FC<RecipeFormProps> = ({ onBack, editRecipe }) => {
  const isEditing = !!editRecipe;
  const { createRecipe, updateRecipe, loadRecipes, loadViability } = useRecipeStore();
  const { loadCategories } = usePantryStore();

  const [title, setTitle] = useState(editRecipe?.title || '');
  const [description, setDescription] = useState(editRecipe?.description || '');
  const [baseServings, setBaseServings] = useState(editRecipe?.base_servings || 4);
  const [prepTime, setPrepTime] = useState(editRecipe?.prep_time || 15);
  const [cookTime, setCookTime] = useState(editRecipe?.cook_time || 30);
  const [difficulty, setDifficulty] = useState(editRecipe?.difficulty || 'medium');
  const [instructions, setInstructions] = useState(editRecipe?.instructions || '');
  const [category, setCategory] = useState(editRecipe?.category || 'General');
  const initialIngredients = (editRecipe?.ingredients || []).length > 0
    ? (editRecipe?.ingredients || []).map((ing: any) => ({
        id: generateId(),
        name: ing.ingredient_name || ing.name || '',
        quantity: ing.quantity || 0,
        unit: ing.unit || 'unidad',
        category: ing.category || 'Otros',
      }))
    : [{ id: generateId(), name: '', quantity: 1, unit: 'unidad', category: 'Otros' }];

  const [ingredients, setIngredients] = useState<IngredientField[]>(initialIngredients);
  const [saving, setSaving] = useState(false);

  const addIngredient = () => {
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'unidad', category: 'Otros' }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof IngredientField, value: string | number) => {
    setIngredients(ingredients.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const validIngredients = ingredients.filter(i => i.name.trim());
      const recipeData = {
        id: editRecipe?.id,
        title: title.trim(),
        description: description.trim(),
        base_servings: baseServings,
        prep_time: prepTime,
        cook_time: cookTime,
        difficulty,
        instructions: instructions.trim(),
        category,
        ingredients: validIngredients.map(i => ({
          name: i.name.trim(),
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
        })),
      };

      if (isEditing) {
        await updateRecipe(recipeData);
      } else {
        await createRecipe(recipeData);
      }
      await loadRecipes();
      await loadViability();
      await loadCategories();
      onBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost text-xs">← Volver</button>
          <h2 className="text-lg font-bold text-surface-900">
            {isEditing ? 'Editar Receta' : 'Nueva Receta'}
          </h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Título *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="Nombre de la receta" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Descripción</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="Breve descripción de la receta" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Raciones</label>
              <input type="number" min={1} max={20} value={baseServings} onChange={e => setBaseServings(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Prep (min)</label>
              <input type="number" min={0} value={prepTime} onChange={e => setPrepTime(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Cocción (min)</label>
              <input type="number" min={0} value={cookTime} onChange={e => setCookTime(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Dificultad</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input-field">
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-700">Ingredientes</label>
              <button type="button" onClick={addIngredient} className="text-xs text-primary-600 hover:text-primary-800 font-medium">+ Añadir</button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing) => (
                <div key={ing.id} className="flex gap-2 items-start bg-surface-50 p-2 rounded-lg">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                    className="input-field flex-1"
                    placeholder="Nombre del ingrediente"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={ing.quantity}
                    onChange={e => updateIngredient(ing.id, 'quantity', Number(e.target.value))}
                    className="input-field w-20"
                    placeholder="Cant."
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="input-field w-28"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select
                    value={ing.category}
                    onChange={e => updateIngredient(ing.id, 'category', e.target.value)}
                    className="input-field w-40"
                  >
                    {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    className="btn-ghost text-red-500 text-xs shrink-0 mt-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Instrucciones</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="input-field min-h-[150px] resize-y"
              placeholder="Pasos de preparación..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
              {saving ? 'Guardando...' : isEditing ? 'Actualizar Receta' : 'Crear Receta'}
            </button>
            <button type="button" onClick={onBack} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;

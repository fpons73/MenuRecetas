import React, { useEffect, useState } from 'react';
import { useRecipeStore } from '../../stores/recipeStore';
import { Recipe, RecipeViability } from '../../types';
import RecipeDetail from './RecipeDetail';

interface RecipeLibraryProps {
  onNewRecipe: () => void;
  onEditRecipe: (recipe: Recipe) => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ onNewRecipe, onEditRecipe }) => {
  const {
    viability,     searchTerm, filterMode,
    loadRecipes, loadViability,
    setSearchTerm, setFilterMode, getFilteredRecipes,
    setSelectedRecipe, selectedRecipe,
    deleteRecipe, setCategoryFilter, categoryFilter,
  } = useRecipeStore();

  const [showDetail, setShowDetail] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    loadRecipes();
    loadViability();
  }, []);

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const data = await window.midweek.aiParseRecipe(aiText);
      if (data.error) {
        setAiError(data.error);
        return;
      }
      const recipe = await useRecipeStore.getState().createRecipe(data);
      await loadRecipes();
      await loadViability();
      setShowAiModal(false);
      setAiText('');
      if (recipe) {
        setSelectedRecipe(recipe);
        setShowDetail(true);
      }
    } catch (err: any) {
      setAiError(err.message || 'Error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImportPdf = async () => {
    try {
      const data = await window.midweek.importPdfRecipe();
      if (!data || data.cancelled) return;

      const recipe = await useRecipeStore.getState().createRecipe(data);
      await loadRecipes();
      await loadViability();
      if (recipe) {
        setSelectedRecipe(recipe);
        setShowDetail(true);
      }
    } catch (err) {
      console.error('Error importing PDF:', err);
    }
  };

  const handleExportPdf = async (recipeId: string) => {
    try {
      const result = await window.midweek.exportRecipePdf(recipeId);
      if (result.error) alert(result.error);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    if (confirm(`¿Eliminar la receta "${recipe.title}"?`)) {
      await deleteRecipe(recipe.id);
      await loadViability();
    }
  };

  const filtered = getFilteredRecipes();
  const filterTabs: { value: 'all' | 'available' | 'missing'; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'available', label: 'Disponibles' },
    { value: 'missing', label: 'Faltan ingredientes' },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-surface-900">Biblioteca de Recetas</h2>
            <div className="flex gap-2">
              <button onClick={handleImportPdf} className="btn-secondary flex items-center gap-1.5">
                <span>📄</span> Importar PDF
              </button>
              <button onClick={() => setShowAiModal(true)} className="btn-secondary flex items-center gap-1.5">
                <span>🤖</span> Pegar receta
              </button>
              <button onClick={onNewRecipe} className="btn-primary flex items-center gap-1.5">
                <span>+</span> Nueva Receta
              </button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar recetas o ingredientes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field max-w-xs"
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="input-field w-36 text-xs"
            >
              <option value="">Todas las categorías</option>
              {['Desayuno', 'Ensalada', 'Sopa', 'Principal', 'Snack', 'Postre', 'General'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex bg-surface-100 rounded-lg p-0.5">
              {filterTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilterMode(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterMode === tab.value
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-surface-400">
              <span className="text-4xl mb-3">🍽️</span>
              <p className="text-sm">No se encontraron recetas</p>
              <p className="text-xs mt-1">Crea una nueva receta o importa desde PDF</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(({ recipe, missing_count, total_count }) => (
              <div
                key={recipe.id}
                onClick={() => { setSelectedRecipe(recipe); setShowDetail(true); }}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm text-surface-900 group-hover:text-primary-700 transition-colors">
                      {recipe.title}
                    </h3>
                    <span className="text-xs text-surface-400">{recipe.category}</span>
                  </div>
                  {missing_count === 0 ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">100% disponible</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      Faltan {missing_count}/{total_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-500 line-clamp-2 mb-2">{recipe.description}</p>
                <div className="flex gap-3 text-xs text-surface-400">
                  <span>⏱ {recipe.prep_time + recipe.cook_time} min</span>
                  <span>👥 {recipe.base_servings} pers.</span>
                  <span>{
                    recipe.difficulty === 'easy' ? 'Fácil' :
                    recipe.difficulty === 'medium' ? 'Media' : 'Difícil'
                  }</span>
                </div>
                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button
                    onClick={e => { e.stopPropagation(); handleExportPdf(recipe.id); }}
                    className="btn-ghost text-xs"
                    title="Exportar PDF"
                  >
                    📥 PDF
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(recipe); }}
                    className="btn-ghost text-xs text-red-500 hover:bg-red-50"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDetail && selectedRecipe && (
        <div className="w-96 border-l border-surface-200 bg-white overflow-y-auto shrink-0">
          <RecipeDetail
            recipe={selectedRecipe}
            onClose={() => { setShowDetail(false); setSelectedRecipe(null); }}
            onDelete={async () => {
              await handleDelete(selectedRecipe);
              setShowDetail(false);
            }}
            onExportPdf={() => handleExportPdf(selectedRecipe.id)}
            onEdit={() => { setShowDetail(false); onEditRecipe(selectedRecipe); }}
          />
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!aiLoading) { setShowAiModal(false); setAiError(''); } }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-surface-900 mb-2">🤖 Extraer receta con IA</h3>
            <p className="text-xs text-surface-500 mb-4">Pega el texto de una receta (de WhatsApp, web, blog...) y la IA extraerá automáticamente título, ingredientes y pasos.</p>
            <textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              className="input-field flex-1 min-h-[250px] resize-y mb-4"
              placeholder="Pega aquí el texto de la receta..."
              disabled={aiLoading}
            />
            {aiError && <p className="text-xs text-red-600 mb-3">{aiError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAiModal(false); setAiError(''); }} className="btn-secondary text-xs" disabled={aiLoading}>Cancelar</button>
              <button onClick={handleAiParse} className="btn-primary text-xs" disabled={aiLoading || !aiText.trim()}>
                {aiLoading ? '⏳ Analizando...' : '🔍 Extraer receta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeLibrary;

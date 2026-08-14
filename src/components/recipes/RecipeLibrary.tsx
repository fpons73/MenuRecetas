import React, { useEffect, useState } from 'react';
import { useRecipeStore } from '../../stores/recipeStore';
import { usePantryStore } from '../../stores/pantryStore';
import { Recipe, RecipeViability } from '../../types';
import RecipeDetail from './RecipeDetail';

interface RecipeLibraryProps {
  onNewRecipe: () => void;
  onEditRecipe: (recipe: Recipe) => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ onNewRecipe, onEditRecipe }) => {
  const {
    viability, searchTerm, filterMode,
    loadRecipes, loadViability,
    setSearchTerm, setFilterMode, getFilteredRecipes,
    setSelectedRecipe, selectedRecipe,
    deleteRecipe, setCategoryFilter, categoryFilter,
  } = useRecipeStore();

  const [showDetail, setShowDetail] = useState(false);
  const [showAiHub, setShowAiHub] = useState(false);
  const [aiMode, setAiMode] = useState<'import' | 'chat'>('import');

  // AI Import
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI Chef Chat
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'chef'; content: string }[]>([
    { role: 'chef', content: '¡Hola! Soy tu asistente de cocina StockChef. Puedes preguntarme por sustitutos de ingredientes, consejos de cocción, cómo aprovechar ingredientes de tu despensa o ideas para cenas rápidas.' },
  ]);

  const pantryItems = usePantryStore(s => s.items);
  const allRecipes = useRecipeStore(s => s.recipes);

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
      setShowAiHub(false);
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

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    const msg = chatMessage.trim();
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    try {
      const pantryContext = pantryItems.map(p => `${p.ingredient_name} (${p.quantity} ${p.unit})`).join(', ');
      const recipeContext = allRecipes.map(r => r.title).join(', ');

      const res = await window.midweek.aiChat(msg, {
        pantry: pantryContext,
        recipes: recipeContext,
      });

      if (res.error) {
        setChatHistory(prev => [...prev, { role: 'chef', content: `⚠️ Error: ${res.error}` }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'chef', content: res.text }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'chef', content: `⚠️ Error: ${err.message || 'No se pudo contactar con Ollama'}` }]);
    } finally {
      setChatLoading(false);
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
    <div className="flex h-full bg-surface-50">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
                📖 Recetario
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Biblioteca culinaria y compatibilidad con tu despensa
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleImportPdf}
                className="btn-secondary text-xs flex items-center gap-1.5 font-medium"
              >
                <span>📄</span> Importar PDF
              </button>
              <button
                onClick={() => { setShowAiHub(true); setAiMode('chat'); }}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>✨</span> Asistente IA
              </button>
              <button
                onClick={onNewRecipe}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-primary-600/20 font-semibold"
              >
                <span>➕</span> Nueva Receta
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between pt-2 border-t border-surface-100">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o ingrediente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field text-xs py-1.5 max-w-sm bg-surface-50 border-surface-200 focus:bg-white"
              />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="input-field w-40 text-xs py-1.5 bg-surface-50 border-surface-200 focus:bg-white"
              >
                <option value="">Todas las categorías</option>
                {['Desayuno', 'Ensalada', 'Sopa', 'Principal', 'Snack', 'Postre', 'General'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex bg-surface-100 p-1 rounded-xl shrink-0">
              {filterTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilterMode(tab.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterMode === tab.value
                      ? 'bg-white text-surface-900 shadow-xs font-semibold'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Recipe Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-surface-400">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center text-3xl mb-3">
                🍽️
              </div>
              <p className="text-sm font-semibold text-surface-700">No se encontraron recetas</p>
              <p className="text-xs text-surface-400 mt-1">Crea una nueva receta o impórtala con la IA o PDF.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(({ recipe, missing_count, total_count }) => {
              const isAvailable = missing_count === 0 && total_count > 0;
              return (
                <div
                  key={recipe.id}
                  onClick={() => { setSelectedRecipe(recipe); setShowDetail(true); }}
                  className="card p-4.5 cursor-pointer hover:shadow-lg hover:border-primary-300 transition-all group flex flex-col justify-between relative bg-white overflow-hidden"
                >
                  <div>
                    {/* Top Row: Category & Viability */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-surface-500 bg-surface-100 px-2 py-0.5 rounded-md">
                        {recipe.category || 'General'}
                      </span>
                      {isAvailable ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
                          <span>✓</span> Disponible
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-[11px] px-2 py-0.5 rounded-full font-medium border border-amber-200">
                          Faltan {missing_count}/{total_count}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-surface-900 group-hover:text-primary-700 transition-colors line-clamp-1 mb-1">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-surface-500 line-clamp-2 mb-3 leading-relaxed">
                      {recipe.description || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Metadata and Quick Actions */}
                  <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <span title="Tiempo total">⏱️ {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                      <span title="Raciones">👥 {recipe.base_servings} p.</span>
                      {recipe.calories && (
                        <span className="text-surface-400" title="Calorías por ración">🔥 {Math.round(recipe.calories)} kcal</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); handleExportPdf(recipe.id); }}
                        className="p-1 rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-100"
                        title="Exportar a PDF"
                      >
                        📄
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(recipe); }}
                        className="p-1 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar receta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Sidebar */}
      {showDetail && selectedRecipe && (
        <div className="w-96 border-l border-surface-200 bg-white overflow-y-auto shrink-0 shadow-xl z-10">
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

      {/* AI Hub Modal */}
      {showAiHub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => { if (!aiLoading && !chatLoading) setShowAiHub(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-100 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shadow-xs">
                  ✨
                </div>
                <div>
                  <h3 className="font-bold text-base text-surface-900">Centro de Inteligencia Culinaria</h3>
                  <p className="text-xs text-surface-500">Potenciado por Google Gemini Flash</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiHub(false)}
                className="text-surface-400 hover:text-surface-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex border-b border-surface-100 bg-surface-50 px-6 pt-2">
              <button
                onClick={() => setAiMode('chat')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  aiMode === 'chat'
                    ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                    : 'border-transparent text-surface-500 hover:text-surface-800'
                }`}
              >
                <span>💬</span> Asistente Chef
              </button>
              <button
                onClick={() => setAiMode('import')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  aiMode === 'import'
                    ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                    : 'border-transparent text-surface-500 hover:text-surface-800'
                }`}
              >
                <span>📝</span> Extraer Receta de Texto
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col">
              {aiMode === 'import' ? (
                <div className="flex flex-col h-full space-y-3">
                  <p className="text-xs text-surface-500">
                    Pega texto plano de recetas procedentes de WhatsApp, webs, foros o notas, y la IA extraerá todos los campos e ingredientes organizados.
                  </p>
                  <textarea
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    className="input-field flex-1 min-h-[220px] resize-none text-xs p-3 leading-relaxed"
                    placeholder="Pega aquí el texto con la receta (ingredientes, pasos, etc.)..."
                    disabled={aiLoading}
                  />
                  {aiError && (
                    <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                      {aiError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAiHub(false)}
                      className="btn-secondary text-xs"
                      disabled={aiLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAiParse}
                      className="btn-primary text-xs font-semibold bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5"
                      disabled={aiLoading || !aiText.trim()}
                    >
                      <span>✨</span> {aiLoading ? 'Analizando con IA...' : 'Extraer y Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full flex-1">
                  {/* Chat message list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] mb-4">
                    {chatHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2.5 text-xs ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {item.role === 'chef' && (
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                            👨‍🍳
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                            item.role === 'user'
                              ? 'bg-primary-600 text-white rounded-tr-xs shadow-xs'
                              : 'bg-surface-100 text-surface-800 rounded-tl-xs border border-surface-200 shadow-2xs'
                          }`}
                        >
                          {item.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2.5 items-center text-xs text-surface-400 animate-pulse">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          👨‍🍳
                        </div>
                        <span>El Chef está pensando...</span>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2 pt-2 border-t border-surface-100">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                      placeholder="Pregunta sobre sustitutos, tiempos, salsas..."
                      className="input-field text-xs py-2 flex-1"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={chatLoading || !chatMessage.trim()}
                      className="btn-primary text-xs font-semibold px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeLibrary;


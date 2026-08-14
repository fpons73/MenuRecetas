import React, { useState } from 'react';
import { useRecipeStore } from '../../stores/recipeStore';
import { usePantryStore } from '../../stores/pantryStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { useShoppingStore } from '../../stores/shoppingStore';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadRecipes = useRecipeStore(s => s.loadRecipes);
  const loadViability = useRecipeStore(s => s.loadViability);
  const loadPantry = usePantryStore(s => s.loadPantry);
  const loadCategories = usePantryStore(s => s.loadCategories);
  const loadCalendar = useCalendarStore(s => s.loadEntries);
  const weekStart = useCalendarStore(s => s.weekStart);
  const loadShopping = useShoppingStore(s => s.loadItems);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await window.midweek.exportBackup();
      if (res.error) {
        setStatusMsg({ text: `Error al exportar: ${res.error}`, type: 'error' });
      } else if (res.cancelled) {
        setStatusMsg(null);
      } else {
        setStatusMsg({ text: `✅ Copia de seguridad guardada con éxito en: ${res.path}`, type: 'success' });
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error: ${err.message || err}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!confirm('⚠️ ATENCIÓN: Restaurar una copia de seguridad reemplazará todas las recetas, despensa, calendarios y precios actuales por los del archivo. ¿Deseas continuar?')) {
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await window.midweek.importBackup();
      if (res.error) {
        setStatusMsg({ text: `Error al restaurar: ${res.error}`, type: 'error' });
      } else if (res.cancelled) {
        setStatusMsg(null);
      } else {
        setStatusMsg({
          text: `🎉 Base de datos restaurada correctamente (${res.count?.recipes || 0} recetas, ${res.count?.pantry || 0} productos de despensa).`,
          type: 'success',
        });
        // Recargar datos en memoria
        await Promise.all([
          loadRecipes(),
          loadViability(),
          loadPantry(),
          loadCategories(),
          loadCalendar(weekStart),
          loadShopping(weekStart),
        ]);
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error: ${err.message || err}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between bg-gradient-to-r from-surface-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-xl shadow-xs">
              💾
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900">Copias de Seguridad</h2>
              <p className="text-xs text-surface-500">Exporta o restaura todos tus datos de StockChef</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-surface-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 flex flex-col justify-between hover:border-primary-300 transition-all">
              <div>
                <div className="text-2xl mb-2">📤</div>
                <h3 className="font-semibold text-surface-900 mb-1">Exportar Copia</h3>
                <p className="text-xs text-surface-500 mb-4">
                  Guarda todas tus recetas, despensa, lista de la compra y precios en un único archivo JSON seguro.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-2"
              >
                {loading ? 'Exportando...' : 'Exportar JSON'}
              </button>
            </div>

            {/* Import Card */}
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 flex flex-col justify-between hover:border-amber-300 transition-all">
              <div>
                <div className="text-2xl mb-2">📥</div>
                <h3 className="font-semibold text-surface-900 mb-1">Restaurar Copia</h3>
                <p className="text-xs text-surface-500 mb-4">
                  Carga un archivo de copia de seguridad anterior para recuperar todos tus datos.
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Restaurando...' : 'Seleccionar Archivo'}
              </button>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMsg.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <div className="flex-1 break-words">{statusMsg.text}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-50 border-t border-surface-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-xs font-medium">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupModal;

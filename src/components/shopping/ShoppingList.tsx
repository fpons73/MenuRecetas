import React, { useEffect, useState } from 'react';
import { useShoppingStore } from '../../stores/shoppingStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { ShoppingItem, SUPERMARKETS } from '../../types';

const CATEGORIES = [
  'Verduras', 'Frutas', 'Carnes', 'Pescados', 'Lácteos y huevos',
  'Pastas y cereales', 'Legumbres', 'Especias', 'Aceites y condimentos',
  'Frutos secos', 'Panadería', 'Congelados', 'Conservas y caldos', 'Repostería', 'Otros',
];

const UNITS = ['unidad', 'unidades', 'g', 'kg', 'ml', 'L', 'cucharada', 'cucharadita', 'taza', 'pizca', 'diente', 'filete', 'lomo', 'hoja', 'rama', 'rebanada', 'trozo', 'rodaja', 'lata', 'paquete'];

const ShoppingList: React.FC = () => {
  const {
    items, loading, weekStart,
    generate, loadItems, toggleItem, updateItem, deleteItem, getGrouped,
  } = useShoppingStore();

  const calendarWeekStart = useCalendarStore(s => s.weekStart);
  const calendarEntries = useCalendarStore(s => s.entries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [itemSupermarkets, setItemSupermarkets] = useState<Record<string, string>>({});
  const [customSupermarkets, setCustomSupermarkets] = useState<Record<string, string>>({});

  const handleUpdate = async (item: ShoppingItem, newQty: number, newPrice: number | null, newSupermarket: string | null) => {
    await updateItem({ id: item.id, quantity_needed: newQty, unit: item.unit, price: newPrice, supermarket: newSupermarket });
    setEditingId(null);
    await loadItems(calendarWeekStart);
  };
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualItem, setManualItem] = useState({ name: '', quantity: 1, unit: 'unidad', category: 'Otros' });

  useEffect(() => {
    loadItems(calendarWeekStart);
  }, [calendarWeekStart]);

  const handleGenerate = async () => {
    await generate(calendarWeekStart);
  };

  const handleAddManual = async () => {
    if (!manualItem.name.trim()) return;
    try {
      await window.midweek.addManualShoppingItem({
        ingredient_name: manualItem.name.trim(),
        quantity_needed: manualItem.quantity,
        unit: manualItem.unit,
        category: manualItem.category,
        week_start: calendarWeekStart,
      });
      setManualItem({ name: '', quantity: 1, unit: 'unidad', category: 'Otros' });
      setShowAddForm(false);
      await loadItems(calendarWeekStart);
    } catch (err) {
      console.error('Error adding manual item:', err);
    }
  };

  const handleExportPdf = async () => {
    try {
      const result = await window.midweek.exportShoppingListPdf(calendarWeekStart);
      if (result.error) alert(result.error);
      else if (result.cancelled) { /* user cancelled */ }
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  const handleExportDocx = async () => {
    try {
      const result = await window.midweek.exportShoppingListDocx(calendarWeekStart);
      if (result.error) alert(result.error);
      else if (result.cancelled) { /* user cancelled */ }
    } catch (err) {
      console.error('Error exporting DOCX:', err);
    }
  };

  const handlePrint = async () => {
    try {
      await window.midweek.printShoppingList(calendarWeekStart);
    } catch (err) {
      console.error('Error printing:', err);
    }
  };

  const handleOptimize = async () => {
    try {
      await window.midweek.optimizeSupermarkets(calendarWeekStart);
      await loadItems(calendarWeekStart);
    } catch (err) {
      console.error('Error optimizing:', err);
    }
  };

  const handleReplenishPantry = async () => {
    try {
      const res = await window.midweek.addLowStockToShopping(calendarWeekStart);
      if (res.success) {
        await loadItems(calendarWeekStart);
      }
    } catch (err) {
      console.error('Error replenishing:', err);
    }
  };

  const grouped = getGrouped();
  const allPurchased = items.length > 0 && items.every(i => i.purchased);

  return (
    <div className="flex flex-col h-full bg-surface-50">
      <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              🛒 Lista de la Compra
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Generada inteligentemente según tu menú semanal y stock de despensa
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <span>➕</span> Añadir Manual
            </button>
            <button
              onClick={handleReplenishPantry}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="Añade productos con stock por debajo del mínimo"
            >
              <span>🥫</span> Reponer Despensa
            </button>
            <button
              onClick={handleGenerate}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
              title="Regenerar lista desde el menú semanal"
            >
              <span>🔄</span> Generar Menú
            </button>

            {items.length > 0 && (
              <>
                <button
                  onClick={handleOptimize}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Asignar el supermercado más económico según tu historial de precios"
                >
                  <span>💰</span> Optimizar Supermercados
                </button>
                <div className="h-6 w-px bg-surface-200 mx-1 hidden sm:block"></div>
                <button onClick={handleExportPdf} className="btn-secondary text-xs" title="Exportar PDF">
                  📄 PDF
                </button>
                <button onClick={handleExportDocx} className="btn-secondary text-xs" title="Exportar Word">
                  📝 Word
                </button>
                <button onClick={handlePrint} className="btn-secondary text-xs" title="Imprimir">
                  🖨️
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {showAddForm && (
          <div className="card p-4 mb-4 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">Añadir producto manual</h3>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="block text-[10px] text-surface-500 mb-0.5">Nombre</label>
                <input
                  type="text"
                  value={manualItem.name}
                  onChange={e => setManualItem({ ...manualItem, name: e.target.value })}
                  className="input-field w-40 text-xs"
                  placeholder="Ej: Pan de molde"
                />
              </div>
              <div>
                <label className="block text-[10px] text-surface-500 mb-0.5">Cantidad</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={manualItem.quantity}
                  onChange={e => setManualItem({ ...manualItem, quantity: Number(e.target.value) })}
                  className="input-field w-20 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-surface-500 mb-0.5">Unidad</label>
                <select
                  value={manualItem.unit}
                  onChange={e => setManualItem({ ...manualItem, unit: e.target.value })}
                  className="input-field w-28 text-xs"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-surface-500 mb-0.5">Categoría</label>
                <select
                  value={manualItem.category}
                  onChange={e => setManualItem({ ...manualItem, category: e.target.value })}
                  className="input-field w-36 text-xs"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={handleAddManual} className="btn-primary text-xs">Añadir</button>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost text-xs">Cancelar</button>
            </div>
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-surface-400">
            <span className="text-4xl mb-3">{calendarEntries.length > 0 ? '✅' : '🛒'}</span>
            <p className="text-sm">
              {calendarEntries.length > 0
                ? 'La despensa cubre todos los ingredientes necesarios'
                : 'No hay lista de la compra generada'}
            </p>
            <p className="text-xs mt-1 mb-4">
              {calendarEntries.length > 0
                ? 'Todos los ingredientes del menú semanal están disponibles en tu despensa'
                : 'Planifica el menú semanal en el calendario y vuelve aquí'}
            </p>
            <button onClick={handleGenerate} className="btn-primary text-sm">
              {calendarEntries.length > 0 ? '🔄 Regenerar Lista' : 'Generar Lista'}
            </button>
          </div>
        )}

        {allPurchased && items.length > 0 && (
          <div className="card p-4 mb-4 bg-green-50 border-green-200 text-center">
            <p className="text-sm font-medium text-green-700">¡Todo comprado!</p>
          </div>
        )}

        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-semibold text-surface-700 mb-2 px-1">{category}</h3>
            <div className="space-y-1">
              {catItems.map(item => {
                const handlePriceBlur = async () => {
                  const raw = itemPrices[item.id];
                  const normalized = raw ? raw.replace(',', '.') : '';
                  const val = normalized ? parseFloat(normalized) : null;
                  if (val !== null && isNaN(val)) return;
                  await window.midweek.updateShoppingPrice(item.id, val);
                  setEditingId(null);
                  await loadItems(calendarWeekStart);
                };

                const handleSupermarketChange = async (value: string) => {
                  setItemSupermarkets(prev => ({ ...prev, [item.id]: value }));
                  if (value === 'Otros') {
                    setCustomSupermarkets(prev => ({ ...prev, [item.id]: '' }));
                  } else {
                    await window.midweek.updateShoppingSupermarket(item.id, value);
                    setEditingId(null);
                    await loadItems(calendarWeekStart);
                  }
                };

                const handleCustomSupermarketSave = async () => {
                  const val = customSupermarkets[item.id] || 'Otros';
                  await window.midweek.updateShoppingSupermarket(item.id, val);
                  setItemSupermarkets(prev => ({ ...prev, [item.id]: val }));
                  setEditingId(null);
                  await loadItems(calendarWeekStart);
                };

                return (
                  <div
                    key={item.id}
                    className={`card p-2 flex items-center gap-2 transition-opacity ${
                      item.purchased ? 'opacity-50 bg-surface-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        item.purchased
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-surface-300 hover:border-primary-400'
                      }`}
                    >
                      {item.purchased && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`text-xs truncate flex-1 ${item.purchased ? 'line-through text-surface-400' : 'text-surface-800 font-medium'}`}>
                      {item.ingredient_name}
                    </span>

                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} step={0.01}
                          value={editQty}
                          onChange={e => setEditQty(Number(e.target.value))}
                          className="input-field w-16 text-xs"
                          autoFocus
                        />
                        <span className="text-[10px] text-surface-400">{item.unit}</span>
                        <button onClick={() => handleUpdate(item, editQty, item.price ?? null, item.supermarket ?? null)} className="text-xs text-primary-600 font-medium px-1">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-surface-400 px-1">✕</button>
                      </div>
                    ) : (
                      <span className="text-xs text-surface-600 w-16 text-right">{item.quantity_needed} {item.unit}</span>
                    )}

                    <select
                      value={itemSupermarkets[item.id] ?? (item.supermarket || '')}
                      onChange={e => handleSupermarketChange(e.target.value)}
                      className="text-[10px] border border-surface-200 rounded px-1 py-0.5 w-24 bg-surface-50"
                    >
                      <option value="">Sin tienda</option>
                      {SUPERMARKETS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {(itemSupermarkets[item.id] ?? item.supermarket ?? '') === 'Otros' && (
                      <div className="flex items-center gap-0.5">
                        <input
                          type="text"
                          value={customSupermarkets[item.id] || ''}
                          onChange={e => setCustomSupermarkets(prev => ({ ...prev, [item.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleCustomSupermarketSave(); }}
                          className="input-field w-20 text-[10px]"
                          placeholder="Tienda..."
                          autoFocus
                        />
                        <button onClick={handleCustomSupermarketSave} className="text-[10px] text-primary-600">✓</button>
                      </div>
                    )}

                    <input
                      type="text"
                      inputMode="decimal"
                      value={itemPrices[item.id] ?? (item.price?.toString() || '')}
                      onChange={e => setItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onBlur={handlePriceBlur}
                      onKeyDown={e => { if (e.key === 'Enter') handlePriceBlur(); }}
                      placeholder="€"
                      className="text-[10px] border border-surface-200 rounded px-1 py-0.5 w-14 text-right bg-surface-50"
                    />

                    {!editingId && (
                      <>
                        <button onClick={() => { setEditingId(item.id); setEditQty(item.quantity_needed); }} className="btn-ghost text-[10px]">✏️</button>
                        <button onClick={() => deleteItem(item.id)} className="btn-ghost text-[10px] text-red-400">🗑️</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary-800">Total estimado</span>
            <span className="text-sm font-bold text-primary-800">
              {items.reduce((sum, i) => sum + (i.price || 0), 0).toFixed(2)} €
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;

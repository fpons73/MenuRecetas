import React, { useEffect, useState } from 'react';
import { usePantryStore } from '../../stores/pantryStore';
import { PantryItem, SUPERMARKETS } from '../../types';
import { useRecipeStore } from '../../stores/recipeStore';

const CATEGORIES = [
  'Verduras', 'Frutas', 'Carnes', 'Pescados', 'Lácteos y huevos',
  'Pastas y cereales', 'Legumbres', 'Especias', 'Aceites y condimentos',
  'Frutos secos', 'Panadería', 'Congelados', 'Conservas y caldos', 'Repostería', 'Otros',
];

const UNITS = ['unidad', 'unidades', 'g', 'kg', 'ml', 'L', 'cucharada', 'cucharadita', 'taza', 'pizca', 'diente', 'filete', 'lomo', 'hoja', 'rama', 'rebanada', 'trozo', 'rodaja', 'lata', 'paquete'];

interface NewItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate: string;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryClass(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return 'text-red-600 bg-red-50 font-bold';
  if (daysLeft <= 3) return 'text-red-600 bg-red-50';
  if (daysLeft <= 5) return 'text-amber-600 bg-amber-50';
  return 'text-surface-500';
}

function getExpiryLabel(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return `Caducado hace ${Math.abs(daysLeft)}d`;
  if (daysLeft === 0) return 'Caduca hoy';
  if (daysLeft === 1) return 'Caduca mañana';
  return `Caduca en ${daysLeft}d`;
}

const PantryView: React.FC = () => {
  const { items, loading, loadPantry, addItem, updateItem, deleteItem } = usePantryStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editExpiry, setEditExpiry] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<NewItem>({ name: '', quantity: 1, unit: 'unidad', category: 'Otros', expiryDate: '' });
  const [search, setSearch] = useState('');
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [expandedPrices, setExpandedPrices] = useState<Record<string, boolean>>({});
  const [priceValues, setPriceValues] = useState<Record<string, Record<string, string>>>({});
  const [loadedPrices, setLoadedPrices] = useState<Record<string, Record<string, string>>>({});
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadPantry(); loadExpiring(); }, []);

  const loadExpiring = async () => {
    try {
      const items = await window.midweek.getExpiringItems(5);
      setExpiringItems(items || []);
    } catch { /* preload might not be ready */ }
  };

  const filtered = items.filter(i =>
    !search || i.ingredient_name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, PantryItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    await addItem({
      ingredient_name: newItem.name.trim(),
      quantity: newItem.quantity,
      unit: newItem.unit,
      category: newItem.category,
      expiry_date: newItem.expiryDate || null,
    });
    setNewItem({ name: '', quantity: 1, unit: 'unidad', category: 'Otros', expiryDate: '' });
    setShowAddForm(false);
    loadExpiring();
  };

  const handleUpdate = async (item: PantryItem) => {
    await updateItem({ ...item, quantity: editQty, unit: editUnit, expiry_date: editExpiry || null });
    setEditingId(null);
    loadExpiring();
  };

  const startEdit = (item: PantryItem) => {
    setEditingId(item.id);
    setEditQty(item.quantity);
    setEditExpiry(item.expiry_date || '');
    setEditUnit(item.unit);
  };

  const togglePriceEditor = async (item: PantryItem) => {
    const key = item.ingredient_id;
    if (expandedPrices[key]) {
      setExpandedPrices(prev => ({ ...prev, [key]: false }));
      return;
    }
    setExpandedPrices(prev => ({ ...prev, [key]: true }));
    if (!loadedPrices[key]) {
      try {
        const prices = await window.midweek.getPricesForIngredient(key);
        const map: Record<string, string> = {};
        for (const p of prices) { map[p.supermarket] = String(p.price); }
        setLoadedPrices(prev => ({ ...prev, [key]: map }));
        setPriceValues(prev => ({ ...prev, [key]: map }));
      } catch { /* ignore */ }
    }
  };

  const handlePriceSave = async (ingredientId: string, supermarket: string, priceStr: string, unit: string) => {
    const normalized = priceStr.replace(',', '.');
    const price = parseFloat(normalized);
    if (isNaN(price) || price <= 0) return;
    await window.midweek.savePrice(ingredientId, supermarket, price, unit);
    setLoadedPrices(prev => {
      const updated = { ...prev[ingredientId], [supermarket]: priceStr };
      return { ...prev, [ingredientId]: updated };
    });
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setShowAiSuggestions(true);
    setAiSuggestion('');
    try {
      const pantryText = items.map(i => `${i.ingredient_name} (${i.quantity} ${i.unit}${i.expiry_date ? ', caduca: ' + i.expiry_date : ''})`).join('\n');
      const recipes = useRecipeStore.getState().recipes.map(r => r.title).join('\n');
      const result = await window.midweek.aiSuggestRecipes(pantryText, recipes);
      if (result.error) { setAiSuggestion('Error: ' + result.error); }
      else { setAiSuggestion(result.text); }
    } catch (err: any) {
      setAiSuggestion('Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-900">Despensa</h2>
          <div className="flex gap-2">
            <button onClick={handleAiSuggest} disabled={aiLoading} className="btn-primary text-xs flex items-center gap-1 bg-purple-600 hover:bg-purple-700">
              <span>🤖</span> {aiLoading ? 'Pensando...' : '¿Qué cocino?'}
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-xs">
              + Añadir Ingrediente
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Buscar ingrediente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field mt-3 max-w-xs"
        />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {expiringItems.length > 0 && (
          <div className="card p-4 mb-4 bg-red-50 border-red-200">
            <h3 className="text-sm font-bold text-red-700 mb-2">Productos a punto de caducar</h3>
            <div className="space-y-1">
              {expiringItems.map((item: PantryItem) => {
                const d = daysUntil(item.expiry_date);
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-red-800">{item.ingredient_name}</span>
                    <span className="text-xs font-medium text-red-600">{getExpiryLabel(d)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAiSuggestions && aiSuggestion && (
          <div className="card p-4 mb-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-purple-700">🤖 Sugerencias de la IA</h3>
              <button onClick={() => setShowAiSuggestions(false)} className="text-xs text-purple-400 hover:text-purple-600">✕</button>
            </div>
            <p className="text-sm text-purple-800 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</p>
          </div>
        )}

        {showAddForm && (
          <div className="card p-4 mb-4 bg-primary-50 border-primary-200">
            <h3 className="text-sm font-semibold text-primary-800 mb-3">Nuevo ingrediente en despensa</h3>
            <div className="flex gap-2 flex-wrap items-start">
              <input
                type="text"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                className="input-field w-40"
                placeholder="Nombre"
              />
              <input
                type="number"
                min={0}
                step={0.1}
                value={newItem.quantity}
                onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                className="input-field w-20"
                placeholder="Cant."
              />
              <select
                value={newItem.unit}
                onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                className="input-field w-28"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="input-field w-36"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-xs text-surface-500">Cad:</span>
                <input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })}
                  className="input-field w-32 text-xs"
                />
              </div>
              <button onClick={handleAdd} className="btn-primary text-xs">Guardar</button>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost text-xs">Cancelar</button>
            </div>
          </div>
        )}

        {Object.keys(grouped).length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-surface-400">
            <span className="text-4xl mb-3">🥫</span>
            <p className="text-sm">Despensa vacía</p>
            <p className="text-xs mt-1">Añade ingredientes para empezar</p>
          </div>
        )}

        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-semibold text-surface-700 mb-2 px-1">{category}</h3>
            <div className="space-y-1">
              {catItems.map(item => {
                const dLeft = daysUntil(item.expiry_date);
                return (
                  <div key={item.id} className="card p-3 flex items-center justify-between">
                    <div className="flex-1 flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-800">{item.ingredient_name}</p>
                      {item.expiry_date && dLeft !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getExpiryClass(dLeft)}`}>
                          {getExpiryLabel(dLeft)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editQty}
                            onChange={e => setEditQty(Number(e.target.value))}
                            className="input-field w-20 text-xs"
                            autoFocus
                          />
                          <input
                            type="date"
                            value={editExpiry}
                            onChange={e => setEditExpiry(e.target.value)}
                            className="input-field w-32 text-xs"
                          />
                          <select
                            value={editUnit}
                            onChange={e => setEditUnit(e.target.value)}
                            className="input-field w-28 text-xs"
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <button onClick={() => handleUpdate(item)} className="text-xs text-primary-600 font-medium px-1">✓</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-surface-400 px-1">✕</button>
                        </div>
                      ) : (
                        <>
                          <span className={`text-sm font-medium ${item.quantity <= 0 ? 'text-red-500' : 'text-surface-700'}`}>
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-xs text-surface-400 w-24 text-right">
                            {item.expiry_date || '—'}
                          </span>
                          <button onClick={() => startEdit(item)} className="btn-ghost text-xs" title="Editar">✏️</button>
                          <button onClick={() => togglePriceEditor(item)} className={`btn-ghost text-xs ${expandedPrices[item.ingredient_id] ? 'text-amber-600' : ''}`} title="Precios">💰</button>
                          <button
                            onClick={() => { if (confirm('¿Eliminar de la despensa?')) { deleteItem(item.id); loadExpiring(); } }}
                            className="btn-ghost text-xs text-red-400" title="Eliminar"
                          >🗑️</button>
                        </>
                      )}
                    </div>
                    {expandedPrices[item.ingredient_id] && (
                      <div className="mt-2 pt-2 border-t border-surface-100">
                        <p className="text-[10px] text-surface-400 mb-2">Precios por supermercado</p>
                        <div className="grid grid-cols-2 gap-1">
                          {SUPERMARKETS.map(sm => {
                            const val = priceValues[item.ingredient_id]?.[sm] || loadedPrices[item.ingredient_id]?.[sm] || '';
                            return (
                              <div key={sm} className="flex items-center gap-0.5">
                                <span className="text-[9px] text-surface-500 w-16 truncate">{sm}</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={val}
                                  onChange={e => setPriceValues(prev => {
                                    const ing = { ...prev[item.ingredient_id], [sm]: e.target.value };
                                    return { ...prev, [item.ingredient_id]: ing };
                                  })}
                                  onBlur={() => { if (val) handlePriceSave(item.ingredient_id, sm, val, item.unit); }}
                                  onKeyDown={e => { if (e.key === 'Enter') handlePriceSave(item.ingredient_id, sm, val, item.unit); }}
                                  placeholder="-"
                                  className="text-[10px] border border-surface-200 rounded px-1 py-0.5 w-16 text-right bg-surface-50"
                                />
                                <span className="text-[8px] text-surface-400">€/{item.unit}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PantryView;

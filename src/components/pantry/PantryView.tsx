import React, { useEffect, useState } from 'react';
import { usePantryStore } from '../../stores/pantryStore';
import { PantryItem, SUPERMARKETS, PANTRY_LOCATIONS, LOCATION_LABELS, PantryLocation } from '../../types';
import { useRecipeStore } from '../../stores/recipeStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { useShoppingStore } from '../../stores/shoppingStore';

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
  location: PantryLocation;
  minStock: number;
  expiryDate: string;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryBadge(daysLeft: number | null) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) {
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">Caducado ({Math.abs(daysLeft)}d)</span>;
  }
  if (daysLeft === 0) {
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200 animate-pulse">¡Caduca hoy!</span>;
  }
  if (daysLeft <= 2) {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">Caduca en {daysLeft}d</span>;
  }
  if (daysLeft <= 5) {
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">{daysLeft} días</span>;
  }
  return <span className="text-[11px] text-surface-500">{daysLeft} días</span>;
}

const PantryView: React.FC = () => {
  const { items, loading, loadPantry, addItem, updateItem, deleteItem } = usePantryStore();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editExpiry, setEditExpiry] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('despensa');
  const [editMinStock, setEditMinStock] = useState<number>(0);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<NewItem>({
    name: '',
    quantity: 1,
    unit: 'unidad',
    category: 'Otros',
    location: 'despensa',
    minStock: 0,
    expiryDate: '',
  });

  const [search, setSearch] = useState('');
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [expandedPrices, setExpandedPrices] = useState<Record<string, boolean>>({});
  const [priceValues, setPriceValues] = useState<Record<string, Record<string, string>>>({});
  const [loadedPrices, setLoadedPrices] = useState<Record<string, Record<string, string>>>({});

  // AI
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [replenishMsg, setReplenishMsg] = useState<string | null>(null);

  const calendarWeekStart = useCalendarStore(s => s.weekStart);
  const loadShopping = useShoppingStore(s => s.loadItems);

  useEffect(() => {
    loadPantry();
    loadExpiring();
  }, []);

  const loadExpiring = async () => {
    try {
      const items = await window.midweek.getExpiringItems(5);
      setExpiringItems(items || []);
    } catch { /* ignore */ }
  };

  const filtered = items.filter(i => {
    const matchesSearch = !search ||
      i.ingredient_name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    const matchesLoc = selectedLocation === 'all' || (i.location || 'despensa') === selectedLocation;
    return matchesSearch && matchesLoc;
  });

  const lowStockList = items.filter(i => (i.min_stock || 0) > 0 && i.quantity < (i.min_stock || 0));

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
      location: newItem.location,
      min_stock: newItem.minStock,
      expiry_date: newItem.expiryDate || null,
    });
    setNewItem({
      name: '',
      quantity: 1,
      unit: 'unidad',
      category: 'Otros',
      location: 'despensa',
      minStock: 0,
      expiryDate: '',
    });
    setShowAddForm(false);
    loadExpiring();
  };

  const handleUpdate = async (item: PantryItem) => {
    await updateItem({
      ...item,
      quantity: editQty,
      unit: editUnit,
      location: editLocation,
      min_stock: editMinStock,
      expiry_date: editExpiry || null,
    });
    setEditingId(null);
    loadExpiring();
  };

  const startEdit = (item: PantryItem) => {
    setEditingId(item.id);
    setEditQty(item.quantity);
    setEditExpiry(item.expiry_date || '');
    setEditUnit(item.unit);
    setEditLocation(item.location || 'despensa');
    setEditMinStock(item.min_stock || 0);
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

  const handleReplenishLowStock = async () => {
    try {
      const res = await window.midweek.addLowStockToShopping(calendarWeekStart);
      if (res.success) {
        setReplenishMsg(`Se han añadido ${res.count} ingredientes a la lista de compra de esta semana.`);
        await loadShopping(calendarWeekStart);
        setTimeout(() => setReplenishMsg(null), 4000);
      }
    } catch (err: any) {
      alert('Error al reponer stock: ' + err.message);
    }
  };

  const handleAiSuggestExpiring = async () => {
    setAiLoading(true);
    setShowAiSuggestions(true);
    setAiSuggestion('');
    try {
      const expiringText = expiringItems.map(i => `${i.ingredient_name} (${i.quantity} ${i.unit})`).join(', ');
      const pantryText = items.map(i => `${i.ingredient_name} (${i.quantity} ${i.unit})`).join(', ');
      const recipes = useRecipeStore.getState().recipes.map(r => r.title).join('\n');
      const prompt = `Tengo estos ingredientes a punto de caducar que DEBO aprovechar con urgencia: ${expiringText}.\nDespensa general:\n${pantryText}\n\nSugiere 2 recetas fáciles y apetecibles centradas en gastar esos ingredientes en riesgo.`;

      const result = await window.midweek.aiChat(prompt, { pantry: pantryText, recipes });
      if (result.error) { setAiSuggestion('Error: ' + result.error); }
      else { setAiSuggestion(result.text); }
    } catch (err: any) {
      setAiSuggestion('Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              🥫 Despensa Inteligente
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Control de existencias, caducidades y ubicaciones del hogar
            </p>
          </div>

          <div className="flex items-center gap-2">
            {lowStockList.length > 0 && (
              <button
                onClick={handleReplenishLowStock}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                title="Añade los ingredientes con stock por debajo del mínimo a la lista de compra"
              >
                <span>🛒</span> Reponer ({lowStockList.length})
              </button>
            )}

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-primary-600/20"
            >
              <span>➕</span> Nuevo Ingrediente
            </button>
          </div>
        </div>

        {/* Location Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-surface-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedLocation('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedLocation === 'all'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              🏠 Todos ({items.length})
            </button>
            {PANTRY_LOCATIONS.map(loc => {
              const count = items.filter(i => (i.location || 'despensa') === loc).length;
              const { label, icon } = LOCATION_LABELS[loc];
              return (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                    selectedLocation === loc
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar en despensa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field py-1.5 text-xs w-full sm:w-64 bg-surface-50 border-surface-200 focus:bg-white"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Replenish Alert Toast */}
        {replenishMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center justify-between animate-in fade-in">
            <span>✅ {replenishMsg}</span>
            <button onClick={() => setReplenishMsg(null)} className="text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {/* Expiring Alert Banner */}
        {expiringItems.length > 0 && (
          <div className="card p-4 bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-red-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold text-red-900">
                    {expiringItems.length} {expiringItems.length === 1 ? 'producto caduca pronto' : 'productos caducan pronto'}
                  </h3>
                  <p className="text-xs text-red-700">Evita el desperdicio aprovechándolos en tus próximas recetas.</p>
                </div>
              </div>
              <button
                onClick={handleAiSuggestExpiring}
                disabled={aiLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <span>🤖</span> {aiLoading ? 'Generando receta...' : 'Sugerir receta de rescate'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-red-200/60">
              {expiringItems.map((item: PantryItem) => {
                const d = daysUntil(item.expiry_date);
                return (
                  <div key={item.id} className="bg-white/80 backdrop-blur-xs p-2 rounded-lg border border-red-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-800">{item.ingredient_name}</span>
                    <div>{getExpiryBadge(d)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Output Panel */}
        {showAiSuggestions && aiSuggestion && (
          <div className="card p-5 bg-gradient-to-br from-purple-50 via-indigo-50 to-white border-purple-200 shadow-md animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-200/60">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <span>🤖</span>
                <span>Asistente Culinario: Propuesta de Aprovechamiento</span>
              </div>
              <button
                onClick={() => setShowAiSuggestions(false)}
                className="text-purple-400 hover:text-purple-700 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="text-xs sm:text-sm text-purple-950 whitespace-pre-wrap leading-relaxed space-y-2">
              {aiSuggestion}
            </div>
          </div>
        )}

        {/* Add New Item Form */}
        {showAddForm && (
          <div className="card p-5 bg-white border-primary-300 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-primary-900 flex items-center gap-1.5">
                <span>✨</span> Añadir a la despensa
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-xs text-surface-400 hover:text-surface-600">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="input-field text-xs"
                  placeholder="Ej: Tomate frito, Huevos..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Cantidad</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={newItem.quantity}
                  onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Unidad</label>
                <select
                  value={newItem.unit}
                  onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  className="input-field text-xs"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Ubicación</label>
                <select
                  value={newItem.location}
                  onChange={e => setNewItem({ ...newItem, location: e.target.value as PantryLocation })}
                  className="input-field text-xs"
                >
                  {PANTRY_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{LOCATION_LABELS[loc].icon} {LOCATION_LABELS[loc].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Categoría</label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="input-field text-xs"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={newItem.minStock}
                  onChange={e => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
                  className="input-field text-xs"
                  placeholder="0 (desactivado)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Caducidad</label>
                <input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })}
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-surface-100">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary text-xs">Cancelar</button>
              <button onClick={handleAdd} className="btn-primary text-xs font-semibold px-5">Guardar Ingrediente</button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {Object.keys(grouped).length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-surface-400">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center text-3xl mb-3">
              🥫
            </div>
            <p className="text-sm font-semibold text-surface-700">No hay productos en esta sección</p>
            <p className="text-xs text-surface-400 mt-1">Añade productos para llevar el control de tus existencias.</p>
          </div>
        )}

        {/* Grouped Category Items */}
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-surface-600 uppercase tracking-wider">
                {category} <span className="text-surface-400 font-normal">({catItems.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {catItems.map(item => {
                const dLeft = daysUntil(item.expiry_date);
                const locKey = (item.location || 'despensa') as PantryLocation;
                const locInfo = LOCATION_LABELS[locKey] || LOCATION_LABELS.despensa;
                const isLowStock = (item.min_stock || 0) > 0 && item.quantity < (item.min_stock || 0);

                return (
                  <div
                    key={item.id}
                    className={`card p-3.5 transition-all flex flex-col hover:border-surface-300 ${
                      isLowStock ? 'bg-amber-50/40 border-amber-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Name and Tags */}
                      <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-semibold text-surface-900 truncate">
                          {item.ingredient_name}
                        </span>

                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 flex items-center gap-1 font-medium border border-surface-200">
                          <span>{locInfo.icon}</span>
                          <span>{locInfo.label}</span>
                        </span>

                        {isLowStock && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                            📉 Stock bajo (Mín: {item.min_stock})
                          </span>
                        )}

                        {getExpiryBadge(dLeft)}
                      </div>

                      {/* Right: Quantities & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={editQty}
                              onChange={e => setEditQty(Number(e.target.value))}
                              className="input-field w-18 text-xs py-1"
                              placeholder="Cant"
                            />
                            <select
                              value={editUnit}
                              onChange={e => setEditUnit(e.target.value)}
                              className="input-field w-24 text-xs py-1"
                            >
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <select
                              value={editLocation}
                              onChange={e => setEditLocation(e.target.value)}
                              className="input-field w-28 text-xs py-1"
                            >
                              {PANTRY_LOCATIONS.map(l => (
                                <option key={l} value={l}>{LOCATION_LABELS[l].label}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={editMinStock}
                              onChange={e => setEditMinStock(Number(e.target.value))}
                              className="input-field w-16 text-xs py-1"
                              placeholder="Mín"
                              title="Stock mínimo"
                            />
                            <input
                              type="date"
                              value={editExpiry}
                              onChange={e => setEditExpiry(e.target.value)}
                              className="input-field w-28 text-xs py-1"
                            />
                            <button
                              onClick={() => handleUpdate(item)}
                              className="btn-primary text-xs py-1 px-2.5 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-ghost text-xs py-1 px-2"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-right">
                              <span className={`text-sm font-bold ${item.quantity <= 0 ? 'text-red-500' : 'text-surface-800'}`}>
                                {item.quantity} {item.unit}
                              </span>
                              {item.expiry_date && (
                                <p className="text-[10px] text-surface-400">Vence: {item.expiry_date}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEdit(item)}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
                                title="Editar producto"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => togglePriceEditor(item)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  expandedPrices[item.ingredient_id]
                                    ? 'bg-amber-100 text-amber-700 font-bold'
                                    : 'text-surface-400 hover:text-amber-600 hover:bg-amber-50'
                                }`}
                                title="Comparar precios por supermercado"
                              >
                                💰
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar "${item.ingredient_name}" de la despensa?`)) {
                                    deleteItem(item.id);
                                    loadExpiring();
                                  }
                                }}
                                className="p-1.5 rounded-lg text-surface-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price Comparison Expandable Drawer */}
                    {expandedPrices[item.ingredient_id] && (
                      <div className="mt-3 pt-3 border-t border-surface-100 bg-surface-50 -mx-3.5 -mb-3.5 p-3.5 rounded-b-xl animate-in fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-surface-700 flex items-center gap-1">
                            <span>🛒</span> Precios de referencia para {item.ingredient_name}
                          </p>
                          <span className="text-[10px] text-surface-400">Guarda automáticamente al salir</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                          {SUPERMARKETS.map(sm => {
                            const val = priceValues[item.ingredient_id]?.[sm] || loadedPrices[item.ingredient_id]?.[sm] || '';
                            return (
                              <div key={sm} className="bg-white p-2 rounded-lg border border-surface-200 shadow-2xs">
                                <span className="block text-[10px] font-semibold text-surface-600 truncate mb-1">{sm}</span>
                                <div className="flex items-center gap-1">
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
                                    placeholder="0.00"
                                    className="w-full text-[11px] font-medium border border-surface-200 rounded px-1.5 py-0.5 text-right bg-surface-50 focus:bg-white"
                                  />
                                  <span className="text-[9px] text-surface-400">€</span>
                                </div>
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


import React, { useState, useEffect } from 'react';
import { ViewType } from '../../App';
import { usePantryStore } from '../../stores/pantryStore';
import { useShoppingStore } from '../../stores/shoppingStore';
import BackupModal from '../settings/BackupModal';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'recipes', label: 'Recetario', icon: '📖' },
  { view: 'calendar', label: 'Plan Semanal', icon: '📅' },
  { view: 'pantry', label: 'Despensa', icon: '🥫' },
  { view: 'shopping', label: 'Lista de Compra', icon: '🛒' },
  { view: 'stats', label: 'Estadísticas', icon: '📊' },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [expiringCount, setExpiringCount] = useState(0);
  const shoppingItems = useShoppingStore(s => s.items);
  const pantryItems = usePantryStore(s => s.items);

  const pendingShopping = shoppingItems.filter(i => !i.purchased).length;
  const lowStockCount = pantryItems.filter(i => (i.min_stock || 0) > 0 && i.quantity < (i.min_stock || 0)).length;

  useEffect(() => {
    const checkExpiring = async () => {
      try {
        const expiring = await window.midweek.getExpiringItems(3);
        setExpiringCount(expiring ? expiring.length : 0);
      } catch {
        // Ignorar si preload no está listo aún
      }
    };
    checkExpiring();
  }, [pantryItems]);

  return (
    <>
      <aside className="w-60 bg-surface-900 text-surface-200 border-r border-surface-800 flex flex-col shrink-0 select-none shadow-xl z-20">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-surface-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary-900/40 ring-1 ring-white/20">
            🥘
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              StockChef <span className="text-[10px] bg-primary-500/20 text-primary-300 font-semibold px-1.5 py-0.5 rounded-full border border-primary-500/30">AI</span>
            </h1>
            <p className="text-[11px] text-surface-400 font-medium">Gestión Culinaria</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-semibold'
                    : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {/* Badges */}
                {item.view === 'pantry' && (expiringCount > 0 || lowStockCount > 0) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {expiringCount > 0 ? `⚠️ ${expiringCount}` : `📉 ${lowStockCount}`}
                  </span>
                )}

                {item.view === 'shopping' && pendingShopping > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-400/20 text-primary-300 border border-primary-400/30">
                    {pendingShopping}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-surface-800 space-y-2">
          <button
            onClick={() => setShowBackupModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <span>💾</span>
            <span>Copias de Seguridad</span>
          </button>
          <div className="px-3 pt-1 flex items-center justify-between text-[11px] text-surface-500">
            <span>StockChef v1.1</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse"></span>
          </div>
        </div>
      </aside>

      <BackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
    </>
  );
};

export default Sidebar;


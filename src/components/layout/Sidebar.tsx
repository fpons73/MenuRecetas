import React from 'react';
import { ViewType } from '../../App';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'recipes', label: 'Biblioteca de Recetas', icon: '📖' },
  { view: 'calendar', label: 'Calendario Semanal', icon: '📅' },
  { view: 'pantry', label: 'Despensa', icon: '🥫' },
  { view: 'shopping', label: 'Lista de la Compra', icon: '🛒' },
  { view: 'stats', label: 'Estadísticas', icon: '📊' },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="w-56 bg-white border-r border-surface-200 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-surface-100">
        <h1 className="text-xl font-bold text-primary-700 tracking-tight">StockChef</h1>
        <p className="text-xs text-surface-400 mt-1">Planifica tu semana</p>
      </div>
      <nav className="flex-1 px-3 py-4">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-1 ${
              currentView === item.view
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-5 py-3 border-t border-surface-100">
        <p className="text-xs text-surface-400">StockChef v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;

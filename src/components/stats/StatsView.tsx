import React, { useEffect, useState } from 'react';

interface StatsData {
  weeklySpending: { week_start: string; total: number }[];
  topIngredients: { name: string; count: number }[];
  topRecipes: { title: string; count: number }[];
  waste: { name: string; quantity: number; unit: string; expiry_date: string }[];
  totalRecipes: number;
  mealStatsThisWeek: { total: number; prepared_count: number };
}

const StatsView: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await window.midweek.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-surface-400 text-sm">Cargando estadísticas...</div>;
  if (!stats) return <div className="flex items-center justify-center h-full text-surface-400 text-sm">Error al cargar</div>;

  const maxSpending = Math.max(1, ...stats.weeklySpending.map((s: any) => s.total));
  const maxCount = Math.max(1, ...stats.topRecipes.map((r: any) => r.count), ...stats.topIngredients.map((i: any) => i.count));

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-surface-200 px-6 py-4 shrink-0">
        <h2 className="text-lg font-bold text-surface-900">Estadísticas</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-primary-700">{stats.totalRecipes}</p>
            <p className="text-xs text-surface-500 mt-1">Recetas en biblioteca</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-primary-700">{stats.mealStatsThisWeek.total}</p>
            <p className="text-xs text-surface-500 mt-1">Comidas planificadas esta semana</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-primary-700">{stats.mealStatsThisWeek.prepared_count}</p>
            <p className="text-xs text-surface-500 mt-1">Preparadas esta semana</p>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-surface-800 mb-3">Gasto semanal (€)</h3>
          {stats.weeklySpending.length === 0 ? (
            <p className="text-xs text-surface-400">Sin datos de gasto</p>
          ) : (
            <div className="space-y-1.5">
              {[...stats.weeklySpending].reverse().map((w: any) => (
                <div key={w.week_start} className="flex items-center gap-2">
                  <span className="text-xs text-surface-500 w-24">{w.week_start}</span>
                  <div className="flex-1 h-5 bg-surface-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded transition-all"
                      style={{ width: `${Math.round((w.total / maxSpending) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-surface-700 w-16 text-right">{Number(w.total).toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-surface-800 mb-3">Recetas más cocinadas</h3>
            {stats.topRecipes.length === 0 ? (
              <p className="text-xs text-surface-400">Prepara alguna comida para ver estadísticas</p>
            ) : (
              <div className="space-y-1.5">
                {stats.topRecipes.map((r: any) => (
                  <div key={r.title} className="flex items-center gap-2">
                    <span className="text-xs text-surface-700 truncate flex-1">{r.title}</span>
                    <div className="w-24 h-4 bg-surface-100 rounded overflow-hidden">
                      <div className="h-full bg-blue-400 rounded" style={{ width: `${Math.round((r.count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-surface-500 w-6 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-surface-800 mb-3">Ingredientes más usados</h3>
            {stats.topIngredients.length === 0 ? (
              <p className="text-xs text-surface-400">Sin datos aún</p>
            ) : (
              <div className="space-y-1.5">
                {stats.topIngredients.map((i: any) => (
                  <div key={i.name} className="flex items-center gap-2">
                    <span className="text-xs text-surface-700 truncate flex-1">{i.name}</span>
                    <div className="w-24 h-4 bg-surface-100 rounded overflow-hidden">
                      <div className="h-full bg-amber-400 rounded" style={{ width: `${Math.round((i.count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-surface-500 w-6 text-right">{i.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {stats.waste.length > 0 && (
          <div className="card p-4 border-red-200 bg-red-50">
            <h3 className="text-sm font-semibold text-red-800 mb-3">Desperdicio (caducados sin usar)</h3>
            <div className="space-y-1">
              {stats.waste.map((w: any) => (
                <div key={w.name} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">{w.name}</span>
                  <span className="text-xs text-red-500">
                    {w.quantity} {w.unit} · caducó {w.expiry_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;

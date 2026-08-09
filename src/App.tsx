import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import RecipeLibrary from './components/recipes/RecipeLibrary';
import RecipeForm from './components/recipes/RecipeForm';
import WeeklyCalendar from './components/calendar/WeeklyCalendar';
import PantryView from './components/pantry/PantryView';
import ShoppingList from './components/shopping/ShoppingList';
import StatsView from './components/stats/StatsView';
import { useRecipeStore } from './stores/recipeStore';
import { usePantryStore } from './stores/pantryStore';
import { useCalendarStore } from './stores/calendarStore';
import { Recipe } from './types';

export type ViewType = 'recipes' | 'calendar' | 'pantry' | 'shopping' | 'stats';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('recipes');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const loadRecipes = useRecipeStore(s => s.loadRecipes);
  const loadViability = useRecipeStore(s => s.loadViability);
  const loadPantry = usePantryStore(s => s.loadPantry);
  const loadCategories = usePantryStore(s => s.loadCategories);
  const loadCalendarEntries = useCalendarStore(s => s.loadEntries);
  const calendarWeekStart = useCalendarStore(s => s.weekStart);

  useEffect(() => {
    loadRecipes();
    loadViability();
    loadPantry();
    loadCategories();
    loadCalendarEntries(calendarWeekStart);
  }, []);

  const handleNavigate = (v: ViewType) => {
    setCurrentView(v);
    setShowRecipeForm(false);
    setEditRecipe(null);
  };

  const handleBackFromForm = () => {
    setShowRecipeForm(false);
    setEditRecipe(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'recipes' && (
          showRecipeForm
            ? <RecipeForm onBack={handleBackFromForm} editRecipe={editRecipe || undefined} />
            : <RecipeLibrary onNewRecipe={() => setShowRecipeForm(true)} onEditRecipe={(r) => { setEditRecipe(r); setShowRecipeForm(true); }} />
        )}
        {currentView === 'calendar' && <WeeklyCalendar />}
        {currentView === 'pantry' && <PantryView />}
        {currentView === 'shopping' && <ShoppingList />}
        {currentView === 'stats' && <StatsView />}
      </main>
    </div>
  );
};

export default App;

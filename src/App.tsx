import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import RecipeLibrary from './components/recipes/RecipeLibrary';
import RecipeForm from './components/recipes/RecipeForm';
import WeeklyCalendar from './components/calendar/WeeklyCalendar';
import PantryView from './components/pantry/PantryView';
import ShoppingList from './components/shopping/ShoppingList';
import { useRecipeStore } from './stores/recipeStore';
import { usePantryStore } from './stores/pantryStore';
import { useCalendarStore } from './stores/calendarStore';

export type ViewType = 'recipes' | 'calendar' | 'pantry' | 'shopping';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('recipes');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar currentView={currentView} onNavigate={(v) => { setCurrentView(v); setShowRecipeForm(false); }} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'recipes' && (
          showRecipeForm
            ? <RecipeForm onBack={() => setShowRecipeForm(false)} />
            : <RecipeLibrary onNewRecipe={() => setShowRecipeForm(true)} />
        )}
        {currentView === 'calendar' && <WeeklyCalendar />}
        {currentView === 'pantry' && <PantryView />}
        {currentView === 'shopping' && <ShoppingList />}
      </main>
    </div>
  );
};

export default App;

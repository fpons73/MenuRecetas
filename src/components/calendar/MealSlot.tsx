import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MealType, MealPlanEntry } from '../../types';
import MealCard from './MealCard';

interface MealSlotProps {
  date: string;
  mealType: MealType;
  entry?: MealPlanEntry;
  onMarkPrepared: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (entry: MealPlanEntry) => void;
  onChangeServings: (entry: MealPlanEntry, newServings: number) => void;
}

const MealSlot: React.FC<MealSlotProps> = ({
  date, mealType, entry, onMarkPrepared, onDelete, onDuplicate, onChangeServings,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}-${mealType}`,
    data: { date, mealType },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-lg transition-colors ${
        isOver ? 'bg-primary-50 border-2 border-dashed border-primary-300' : ''
      }`}
    >
      {entry ? (
        <MealCard
          title={entry.recipe_title || 'Receta'}
          prepared={entry.prepared}
          servings={entry.servings}
          onMarkPrepared={() => onMarkPrepared(entry.id)}
          onDelete={() => onDelete(entry.id)}
          onDuplicate={() => onDuplicate(entry)}
          onChangeServings={(newSrv) => onChangeServings(entry, newSrv)}
          entryId={entry.id}
          date={date}
          mealType={mealType}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <span className="text-xs text-surface-300 italic pointer-events-none">
            {isOver ? 'Soltar aquí' : 'Arrastra una receta'}
          </span>
        </div>
      )}
    </div>
  );
};

export default MealSlot;

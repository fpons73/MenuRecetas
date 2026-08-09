import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MealType } from '../../types';

interface MealCardProps {
  title: string;
  prepared: boolean;
  servings?: number;
  onMarkPrepared?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onChangeServings?: (newServings: number) => void;
  entryId?: string;
  date?: string;
  mealType?: MealType;
  isDragOverlay?: boolean;
}

const MealCard: React.FC<MealCardProps> = ({
  title, prepared, servings, onMarkPrepared, onDelete,
  onDuplicate, onChangeServings,
  entryId, date, mealType, isDragOverlay,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entryId || `overlay-${Math.random()}`,
    data: entryId
      ? { type: 'meal', entryId, sourceDate: date, sourceMealType: mealType }
      : { type: 'recipe' },
  });

  const overlayStyle = isDragOverlay ? { boxShadow: '0 0 0 2px #4ade80, 0 10px 15px -3px rgba(0,0,0,0.1)' } : {};
  const transformStyle = !isDragOverlay && transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : {};

  const handleServingsChange = (delta: number) => {
    if (onChangeServings && servings) {
      const newServings = Math.max(1, servings + delta);
      onChangeServings(newServings);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...(isDragOverlay ? {} : listeners)}
      {...(isDragOverlay ? {} : attributes)}
      style={{ ...transformStyle, ...overlayStyle }}
      className={`card p-2 cursor-grab active:cursor-grabbing group relative ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOverlay ? 'shadow-lg ring-2 ring-primary-400' : ''} ${
        prepared && !isDragOverlay ? 'opacity-60 bg-surface-100' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setConfirmDelete(false); }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <p className={`text-xs font-medium truncate flex-1 ${prepared ? 'line-through text-surface-400' : 'text-surface-800'}`}>
          {title}
        </p>
        {showActions && !isDragOverlay && (
          <div className="flex gap-0.5">
            {!prepared && onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="text-xs px-1.5 py-0.5 rounded hover:bg-blue-100 text-blue-500"
                title="Duplicar"
              >
                ⧉
              </button>
            )}
            {onDelete && !confirmDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="text-xs px-1.5 py-0.5 rounded hover:bg-red-100 text-red-400"
                title="Quitar"
              >
                ✕
              </button>
            )}
            {confirmDelete && onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white font-bold"
                title="Confirmar"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
      {!isDragOverlay && !prepared && onMarkPrepared && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkPrepared(); }}
          className="w-full text-[10px] py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium border border-amber-200 transition-colors"
          title="Descontar ingredientes de la despensa"
        >
          Descontar despensa
        </button>
      )}
      {servings !== undefined && (
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-[10px] text-surface-400">
            {servings} {servings === 1 ? 'comensal' : 'comensales'}
            {prepared && ' · Preparado ✓'}
          </p>
          {showActions && !prepared && onChangeServings && (
            <div className="flex gap-0.5 ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); handleServingsChange(-1); }}
                className="text-[10px] w-4 h-4 rounded-full bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-600"
                disabled={servings <= 1}
              >−</button>
              <button
                onClick={(e) => { e.stopPropagation(); handleServingsChange(1); }}
                className="text-[10px] w-4 h-4 rounded-full bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-600"
              >+</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MealCard;

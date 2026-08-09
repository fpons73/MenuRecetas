let counter = 0;
export function generateId(): string {
  counter++;
  return `id_${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function scaleQuantity(
  quantity: number,
  baseServings: number,
  targetServings: number
): number {
  if (baseServings <= 0) return quantity;
  return Math.round((quantity * targetServings / baseServings) * 100) / 100;
}

export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
